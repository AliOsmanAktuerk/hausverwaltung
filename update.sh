#!/bin/bash
set -e

# ── Farben ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }
step() { echo -e "\n${YELLOW}▶ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo "  Hausverwaltung – Update"
echo "============================================"

# ── Speicherplatz prüfen ──────────────────────────────────────────────────────
DISK_FREE_PCT=$(df "$SCRIPT_DIR" | awk 'NR==2 {gsub(/%/,""); print 100 - $5}')
if [ "$DISK_FREE_PCT" -le 10 ]; then
  warn "Nur noch ${DISK_FREE_PCT}% freier Speicher! Update könnte fehlschlagen."
  read -p "Trotzdem fortfahren? (j/N): " CONFIRM
  [[ "$CONFIRM" =~ ^[jJ]$ ]] || { echo "Abgebrochen."; exit 0; }
fi

# ── Git-Status prüfen ─────────────────────────────────────────────────────────
if [ ! -d ".git" ]; then
  fail "Kein Git-Repository gefunden. Update per Git nicht möglich."
fi

step "Aktuelle Version prüfen..."
CURRENT=$(git rev-parse --short HEAD 2>/dev/null || echo "unbekannt")
ok "Aktuelle Version: $CURRENT"

step "Änderungen vom Remote laden..."
git fetch origin 2>&1 || fail "git fetch fehlgeschlagen – Netzwerkverbindung prüfen."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_HASH=$(git rev-parse "origin/$BRANCH" 2>/dev/null || true)
LOCAL_HASH=$(git rev-parse HEAD)

if [ "$REMOTE_HASH" = "$LOCAL_HASH" ]; then
  ok "Bereits auf dem neuesten Stand. Kein Update nötig."
  exit 0
fi

COMMITS=$(git log HEAD..origin/$BRANCH --oneline 2>/dev/null | wc -l)
echo "  $COMMITS neue Commit(s) verfügbar:"
git log HEAD..origin/$BRANCH --oneline 2>/dev/null | sed 's/^/    /'
echo ""

read -p "Update jetzt installieren? (J/n): " CONFIRM
[[ -z "$CONFIRM" || "$CONFIRM" =~ ^[jJ]$ ]] || { echo "Abgebrochen."; exit 0; }

# ── Backup der Daten ──────────────────────────────────────────────────────────
step "Datensicherung erstellen..."
BACKUP_FILE="$HOME/backup-hausverwaltung-$(date +%F-%H%M).tar.gz"
tar -czf "$BACKUP_FILE" backend/data/ 2>/dev/null && ok "Backup: $BACKUP_FILE" || warn "Backup konnte nicht erstellt werden (wird ignoriert)"

# ── Git Pull ──────────────────────────────────────────────────────────────────
step "Code aktualisieren..."
git pull origin "$BRANCH" || fail "git pull fehlgeschlagen."
NEW=$(git rev-parse --short HEAD)
ok "Aktualisiert auf: $NEW"

# ── Dependencies aktualisieren ────────────────────────────────────────────────
step "Frontend-Dependencies aktualisieren..."
npm install --prefix hausverwaltung-app --prefer-offline 2>&1 | tail -1
ok "Frontend-Dependencies aktuell"

step "Backend-Dependencies aktualisieren..."
npm install --prefix backend --prefer-offline 2>&1 | tail -1
ok "Backend-Dependencies aktuell"

# ── Frontend bauen ────────────────────────────────────────────────────────────
step "Frontend bauen..."
npm run build --prefix hausverwaltung-app 2>&1 | grep -E "✓|✘|error" || true
ok "Frontend Build fertig"

# ── Service neu starten ───────────────────────────────────────────────────────
step "Service neu starten..."
if systemctl is-active --quiet hausverwaltung 2>/dev/null; then
  sudo systemctl restart hausverwaltung
  sleep 2
  if systemctl is-active --quiet hausverwaltung; then
    ok "Service erfolgreich neu gestartet"
  else
    fail "Service-Neustart fehlgeschlagen.\n  Logs: sudo journalctl -u hausverwaltung -n 20"
  fi
else
  warn "systemd-Service nicht aktiv. Bitte manuell starten: bash start.sh"
fi

# ── Fertig ────────────────────────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "============================================"
echo -e "${GREEN}  Update abgeschlossen!${NC}"
echo "  $CURRENT → $NEW"
echo "  http://$IP:${PORT:-8090}"
echo "============================================"
echo ""
