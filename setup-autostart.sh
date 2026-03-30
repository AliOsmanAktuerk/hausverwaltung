#!/bin/bash
set -e

# ── Farben ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo ""
echo "============================================"
echo "  Hausverwaltung – Autostart Einrichtung"
echo "============================================"
echo ""

# ── Root-Rechte prüfen ────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  fail "Dieses Skript muss als root ausgeführt werden.\nBitte mit: sudo bash setup-autostart.sh"
fi

# ── Projektverzeichnis ermitteln ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Benutzer ermitteln (derjenige der sudo aufgerufen hat)
RUN_USER="${SUDO_USER:-pi}"
RUN_USER_HOME=$(eval echo "~$RUN_USER")

echo "Projektverzeichnis : $PROJECT_DIR"
echo "Benutzer           : $RUN_USER"
echo ""

# ── Node.js prüfen ───────────────────────────────────────────────────────────
NODE_BIN=$(which node 2>/dev/null || true)
if [ -z "$NODE_BIN" ]; then
  fail "Node.js nicht gefunden. Bitte zuerst Node.js installieren:\n  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\n  sudo apt install -y nodejs"
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18 oder höher wird benötigt (gefunden: $(node -v))."
fi
ok "Node.js $(node -v) gefunden ($NODE_BIN)"

# ── Port konfigurieren ───────────────────────────────────────────────────────
PORT="${PORT:-8090}"
echo ""
read -p "Port [Standard: $PORT]: " INPUT_PORT
PORT="${INPUT_PORT:-$PORT}"
ok "Port: $PORT"

# ── Frontend bauen ───────────────────────────────────────────────────────────
echo ""
echo "▶ Installiere Dependencies und baue Frontend..."
sudo -u "$RUN_USER" bash "$PROJECT_DIR/start.sh" &
START_PID=$!
# Warten bis der Build fertig ist, dann stoppen
sleep 30
kill $START_PID 2>/dev/null || true
wait $START_PID 2>/dev/null || true

# Prüfen ob dist gebaut wurde
if [ ! -f "$PROJECT_DIR/hausverwaltung-app/dist/index.html" ]; then
  warn "Frontend-Build nicht gefunden. Versuche manuell zu bauen..."
  sudo -u "$RUN_USER" npm install --prefix "$PROJECT_DIR/hausverwaltung-app"
  sudo -u "$RUN_USER" npm install --prefix "$PROJECT_DIR/backend"
  sudo -u "$RUN_USER" npm run build --prefix "$PROJECT_DIR/hausverwaltung-app"
fi
ok "Frontend gebaut"

# ── systemd Service erstellen ────────────────────────────────────────────────
SERVICE_FILE="/etc/systemd/system/hausverwaltung.service"

echo ""
echo "▶ Erstelle systemd Service..."

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Hausverwaltung App
Documentation=file://$PROJECT_DIR/INSTALLATION.md
After=network.target
Wants=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$NODE_BIN $PROJECT_DIR/backend/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hausverwaltung
Environment=PORT=$PORT
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

ok "Service-Datei erstellt: $SERVICE_FILE"

# ── systemd neu laden und Service aktivieren ─────────────────────────────────
echo ""
echo "▶ Aktiviere und starte Service..."

systemctl daemon-reload
ok "systemd neu geladen"

systemctl enable hausverwaltung
ok "Autostart aktiviert (startet bei jedem Systemstart)"

systemctl restart hausverwaltung
sleep 2

# ── Status prüfen ────────────────────────────────────────────────────────────
if systemctl is-active --quiet hausverwaltung; then
  ok "Service läuft"
else
  warn "Service konnte nicht gestartet werden. Logs prüfen:"
  echo "  sudo journalctl -u hausverwaltung -n 30"
  exit 1
fi

# ── IP-Adressen ermitteln ────────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')
HOSTNAME=$(hostname)

echo ""
echo "============================================"
echo -e "${GREEN}  Einrichtung erfolgreich abgeschlossen!${NC}"
echo "============================================"
echo ""
echo "  App erreichbar unter:"
echo -e "  ${GREEN}http://$IP:$PORT${NC}"
echo -e "  ${GREEN}http://$HOSTNAME.local:$PORT${NC}"
echo ""
echo "  Nützliche Befehle:"
echo "  sudo systemctl status hausverwaltung    → Status"
echo "  sudo systemctl restart hausverwaltung   → Neustart"
echo "  sudo journalctl -u hausverwaltung -f    → Logs live"
echo ""
