#!/bin/bash
set -euo pipefail

# ── Farben ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "${BLUE}▶ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo ""
echo "============================================"
echo "  Buchungssystem – Autostart Einrichtung"
echo "  AlmaLinux 9"
echo "============================================"
echo ""

# ── Root-Rechte prüfen ────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  fail "Bitte als root ausführen:\n  sudo bash setup-autostart.sh"
fi

# ── Betriebssystem prüfen ────────────────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  if [[ "$ID" != "almalinux" && "$ID_LIKE" != *"rhel"* ]]; then
    warn "Dieses Skript ist für AlmaLinux 9 optimiert (erkannt: ${PRETTY_NAME:-unbekannt})"
    read -p "Trotzdem fortfahren? [j/N] " CONTINUE
    [[ "$CONTINUE" =~ ^[jJyY]$ ]] || exit 1
  fi
fi

# ── Benutzer ermitteln ───────────────────────────────────────────────────────
RUN_USER="${SUDO_USER:-$(logname 2>/dev/null || true)}"
if [ -z "$RUN_USER" ] || [ "$RUN_USER" = "root" ]; then
  fail "Bitte mit sudo als normaler Benutzer ausführen:\n  sudo bash setup-autostart.sh"
fi
RUN_USER_HOME=$(eval echo "~$RUN_USER")

# ── Projektverzeichnis ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "Projektverzeichnis : $PROJECT_DIR"
echo "Benutzer           : $RUN_USER"
echo ""

# ── Node.js prüfen / installieren ────────────────────────────────────────────
info "Prüfe Node.js..."
NODE_BIN=$(which node 2>/dev/null || true)

if [ -z "$NODE_BIN" ]; then
  info "Node.js nicht gefunden — installiere via NodeSource (Node 20)..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
  NODE_BIN=$(which node)
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18 oder höher benötigt (gefunden: $(node -v)).\nAktualisieren: https://rpm.nodesource.com/setup_20.x"
fi
ok "Node.js $(node -v) ($NODE_BIN)"

# ── Port konfigurieren ───────────────────────────────────────────────────────
echo ""
PORT="${PORT:-8090}"
read -p "Port [Standard: $PORT]: " INPUT_PORT
PORT="${INPUT_PORT:-$PORT}"
ok "Port: $PORT"

# ── Dependencies installieren ────────────────────────────────────────────────
echo ""
info "Installiere Backend-Dependencies..."
sudo -u "$RUN_USER" npm install --prefix "$PROJECT_DIR/backend" --silent
ok "Backend bereit"

info "Installiere Frontend-Dependencies..."
sudo -u "$RUN_USER" npm install --prefix "$PROJECT_DIR/hausverwaltung-app" --silent
ok "Frontend-Dependencies installiert"

# ── Frontend bauen ───────────────────────────────────────────────────────────
info "Baue Frontend..."
sudo -u "$RUN_USER" npm run build --prefix "$PROJECT_DIR/hausverwaltung-app"

if [ ! -f "$PROJECT_DIR/hausverwaltung-app/dist/index.html" ]; then
  fail "Frontend-Build fehlgeschlagen.\nManuell prüfen:\n  cd hausverwaltung-app && npm run build"
fi
ok "Frontend gebaut (dist/)"

# ── Firewall (firewalld) ─────────────────────────────────────────────────────
echo ""
info "Konfiguriere Firewall..."
if systemctl is-active --quiet firewalld 2>/dev/null; then
  firewall-cmd --permanent --add-port="${PORT}/tcp" > /dev/null
  firewall-cmd --reload > /dev/null
  ok "firewalld: Port $PORT freigegeben"
else
  warn "firewalld nicht aktiv — Port-Regel übersprungen"
  warn "Manuell freigeben: sudo firewall-cmd --permanent --add-port=${PORT}/tcp && sudo firewall-cmd --reload"
fi

# ── SELinux ───────────────────────────────────────────────────────────────────
echo ""
info "Prüfe SELinux..."
SELINUX_STATUS=$(getenforce 2>/dev/null || echo "Disabled")

if [ "$SELINUX_STATUS" != "Disabled" ]; then
  if command -v semanage &>/dev/null; then
    if ! semanage port -l 2>/dev/null | grep -qw "$PORT"; then
      semanage port -a -t http_port_t -p tcp "$PORT" 2>/dev/null \
        || semanage port -m -t http_port_t -p tcp "$PORT" 2>/dev/null \
        || warn "SELinux-Port-Label fehlgeschlagen. Manuell:\n  sudo semanage port -a -t http_port_t -p tcp $PORT"
    fi
    ok "SELinux: Port $PORT als http_port_t markiert"
  else
    warn "semanage nicht gefunden. Installieren:\n  sudo dnf install -y policycoreutils-python-utils"
    warn "Dann manuell: semanage port -a -t http_port_t -p tcp $PORT"
  fi
else
  ok "SELinux deaktiviert — keine Port-Anpassung nötig"
fi

# ── systemd Service ───────────────────────────────────────────────────────────
SERVICE_FILE="/etc/systemd/system/buchungssystem.service"

echo ""
info "Erstelle systemd Service ($SERVICE_FILE)..."

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Buchungssystem – Hausverwaltung Web-App
Documentation=file://$PROJECT_DIR/README.md
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$NODE_BIN $PROJECT_DIR/backend/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=buchungssystem
Environment=PORT=$PORT
Environment=NODE_ENV=production

# Absturz-Schutz
StartLimitIntervalSec=60
StartLimitBurst=3

# Minimale Härtung
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

ok "Service-Datei erstellt"

# ── systemd aktivieren & starten ─────────────────────────────────────────────
echo ""
info "Aktiviere und starte Service..."

systemctl daemon-reload
ok "systemd neu geladen"

systemctl enable buchungssystem
ok "Autostart aktiviert (startet bei jedem Boot)"

systemctl restart buchungssystem
sleep 2

if systemctl is-active --quiet buchungssystem; then
  ok "Service läuft"
else
  echo ""
  warn "Service konnte nicht gestartet werden. Letzte Logzeilen:"
  journalctl -u buchungssystem -n 20 --no-pager 2>/dev/null || true
  echo ""
  echo "  Debugging:"
  echo "  sudo journalctl -u buchungssystem -n 50 --no-pager"
  echo "  sudo systemctl status buchungssystem"
  exit 1
fi

# ── Abschluss ────────────────────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "============================================"
echo -e "${GREEN}  Einrichtung erfolgreich abgeschlossen!${NC}"
echo "============================================"
echo ""
echo "  App erreichbar unter:"
echo -e "  ${GREEN}http://$IP:$PORT${NC}"
echo ""
echo "  Nützliche Befehle:"
echo "  sudo systemctl status buchungssystem      → Status anzeigen"
echo "  sudo systemctl restart buchungssystem     → Neustart"
echo "  sudo systemctl stop buchungssystem        → Stoppen"
echo "  sudo systemctl disable buchungssystem     → Autostart deaktivieren"
echo "  sudo journalctl -u buchungssystem -f      → Logs live verfolgen"
echo "  sudo journalctl -u buchungssystem -n 50   → Letzte 50 Logzeilen"
echo ""
