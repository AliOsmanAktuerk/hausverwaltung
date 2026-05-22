#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy-watcher.sh
#  Überwacht den master-Branch auf neue Commits und deployt automatisch.
#  Läuft auf dem Server als systemd-Timer (alle 5 Min).
#
#  Aufruf:
#    bash deploy-watcher.sh            → einmaliger Check & Deploy
#    bash deploy-watcher.sh --install  → systemd-Timer einrichten
#    bash deploy-watcher.sh --status   → letzten Deploy-Status anzeigen
#    bash deploy-watcher.sh --logs     → Live-Log verfolgen
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Konfiguration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="master"
SERVICE_NAME="buchungssystem"
PORT="${PORT:-8090}"

LOG_FILE="/var/log/buchungssystem-deploy.log"
LOCK_FILE="/tmp/buchungssystem-deploy.lock"
STATUS_FILE="$SCRIPT_DIR/.deploy-status"

BACKUP_DIR="$HOME/backups-buchungssystem"
BACKUP_KEEP=10          # Anzahl Backups die behalten werden
DISK_MIN_PCT=15         # Mindest-Speicher in % bevor Deploy abgebrochen wird

TIMER_INTERVAL="5min"   # Intervall des systemd-Timers

# ── Farben (nur im Terminal) ──────────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
  BLUE='\033[0;34m';  GRAY='\033[0;90m';  BOLD='\033[1m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; BLUE=''; GRAY=''; BOLD=''; NC=''
fi

# ── Logging ───────────────────────────────────────────────────────────────────
log() {
  local level="$1"; shift
  local msg="$*"
  local ts; ts="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$ts] [$level] $msg" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$ts] [$level] $msg"
}

ok()   { echo -e "${GREEN}  ✔ $*${NC}"; log "OK"   "$*"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; log "WARN" "$*"; }
fail() { echo -e "${RED}  ✘ $*${NC}";   log "ERR"  "$*"; exit 1; }
info() { echo -e "${BLUE}  ▶ $*${NC}";  log "INFO" "$*"; }
step() { echo -e "\n${BOLD}${YELLOW}── $* ──${NC}"; log "STEP" "$*"; }

# ── Log-Rotation (max. 5 MB) ──────────────────────────────────────────────────
rotate_log() {
  if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt $((5 * 1024 * 1024)) ]; then
    mv "$LOG_FILE" "${LOG_FILE}.1"
    log "INFO" "Log rotiert → ${LOG_FILE}.1"
  fi
}

# ── Status speichern ──────────────────────────────────────────────────────────
save_status() {
  cat > "$STATUS_FILE" <<EOF
LAST_CHECK=$(date '+%Y-%m-%d %H:%M:%S')
RESULT=$1
FROM_HASH=$2
TO_HASH=$3
MESSAGE=$4
EOF
}

# ── Argumente ─────────────────────────────────────────────────────────────────
case "${1:-}" in
  --install)
    # ── systemd-Timer einrichten ───────────────────────────────────────────────
    if [ "$EUID" -ne 0 ]; then
      fail "--install benötigt Root:\n  sudo bash deploy-watcher.sh --install"
    fi

    RUN_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "")}"
    [ -z "$RUN_USER" ] || [ "$RUN_USER" = "root" ] && fail "Bitte mit sudo als normaler Benutzer ausführen."
    NODE_BIN=$(which node 2>/dev/null || fail "Node.js nicht gefunden.")

    echo ""
    echo -e "${BOLD}Deploy-Watcher einrichten${NC}"
    echo "  Projektpfad : $SCRIPT_DIR"
    echo "  Benutzer    : $RUN_USER"
    echo "  Intervall   : alle $TIMER_INTERVAL"
    echo ""

    # Log-Datei vorbereiten
    touch "$LOG_FILE"
    chown "$RUN_USER" "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    # systemd Service (einmaliger Lauf)
    cat > /etc/systemd/system/buchungssystem-watcher.service <<EOF
[Unit]
Description=Buchungssystem – Auto-Deploy Watcher (einmaliger Lauf)
After=network-online.target

[Service]
Type=oneshot
User=$RUN_USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=/bin/bash $SCRIPT_DIR/deploy-watcher.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=buchungssystem-watcher
Environment=PORT=$PORT
Environment=HOME=/home/$RUN_USER
EOF

    # systemd Timer (periodisch)
    cat > /etc/systemd/system/buchungssystem-watcher.timer <<EOF
[Unit]
Description=Buchungssystem – Auto-Deploy alle $TIMER_INTERVAL
Requires=buchungssystem-watcher.service

[Timer]
OnBootSec=2min
OnUnitActiveSec=$TIMER_INTERVAL
AccuracySec=30s
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable --now buchungssystem-watcher.timer

    echo ""
    echo -e "${GREEN}  ✔ Deploy-Watcher aktiv — prüft alle $TIMER_INTERVAL auf neue Commits${NC}"
    echo ""
    echo "  Nützliche Befehle:"
    echo "  sudo systemctl status buchungssystem-watcher.timer   → Timer-Status"
    echo "  sudo systemctl list-timers buchungssystem-watcher     → Nächster Lauf"
    echo "  bash deploy-watcher.sh --logs                         → Live-Log"
    echo "  bash deploy-watcher.sh --status                       → Letzter Deploy"
    echo "  sudo systemctl disable buchungssystem-watcher.timer   → Deaktivieren"
    echo ""
    exit 0
    ;;

  --status)
    echo ""
    echo -e "${BOLD}Letzter Deploy-Status${NC}"
    echo "──────────────────────────────"
    if [ -f "$STATUS_FILE" ]; then
      while IFS='=' read -r key val; do
        printf "  %-15s %s\n" "$key:" "$val"
      done < "$STATUS_FILE"
    else
      echo "  Noch kein Deploy durchgeführt."
    fi
    echo ""
    echo -e "${BOLD}Timer-Status${NC}"
    echo "──────────────────────────────"
    systemctl list-timers buchungssystem-watcher.timer --no-pager 2>/dev/null || echo "  Timer nicht installiert."
    echo ""
    exit 0
    ;;

  --logs)
    echo "  Zeige Live-Log ($LOG_FILE) — Strg+C zum Beenden"
    echo ""
    tail -f "$LOG_FILE" 2>/dev/null || fail "Log-Datei nicht gefunden: $LOG_FILE"
    exit 0
    ;;
esac

# ── Hauptlauf ─────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
rotate_log

echo ""
echo "============================================"
echo "  Buchungssystem – Deploy-Watcher"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
log "INFO" "Deploy-Watcher gestartet"

# ── Lockfile (kein paralleler Lauf) ──────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
    warn "Anderer Deploy läuft noch (PID $LOCK_PID) — abgebrochen"
    exit 0
  else
    rm -f "$LOCK_FILE"
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ── Voraussetzungen prüfen ────────────────────────────────────────────────────
[ -d ".git" ] || fail "Kein Git-Repository in $SCRIPT_DIR"
command -v git  &>/dev/null || fail "git nicht installiert"
command -v node &>/dev/null || fail "Node.js nicht installiert"
command -v npm  &>/dev/null || fail "npm nicht installiert"

# ── Speicherplatz prüfen ──────────────────────────────────────────────────────
DISK_FREE_PCT=$(df "$SCRIPT_DIR" | awk 'NR==2 {gsub(/%/,""); print 100 - $5}')
if [ "$DISK_FREE_PCT" -le "$DISK_MIN_PCT" ]; then
  warn "Nur noch ${DISK_FREE_PCT}% freier Speicher (Minimum: ${DISK_MIN_PCT}%) — Deploy abgebrochen"
  save_status "ABORTED" "-" "-" "Zu wenig Speicher (${DISK_FREE_PCT}%)"
  exit 0
fi
info "Speicherplatz: ${DISK_FREE_PCT}% frei"

# ── Remote-Stand holen ────────────────────────────────────────────────────────
step "Auf neue Commits prüfen"
if ! git fetch origin "$BRANCH" --quiet 2>/dev/null; then
  warn "git fetch fehlgeschlagen — Netzwerkverbindung prüfen"
  save_status "FETCH_FAILED" "-" "-" "git fetch fehlgeschlagen"
  exit 0
fi

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")

if [ -z "$REMOTE_HASH" ]; then
  warn "Branch origin/$BRANCH nicht erreichbar"
  exit 0
fi

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  ok "Bereits auf dem neuesten Stand (${LOCAL_HASH:0:7})"
  save_status "UP_TO_DATE" "${LOCAL_HASH:0:7}" "${LOCAL_HASH:0:7}" "Kein Update nötig"
  exit 0
fi

# Neue Commits anzeigen
COMMITS=$(git log HEAD..origin/$BRANCH --oneline 2>/dev/null | wc -l | tr -d ' ')
info "$COMMITS neue Commit(s) gefunden:"
git log HEAD..origin/$BRANCH --oneline 2>/dev/null | sed 's/^/    /' | tee -a "$LOG_FILE"

# ── Backup erstellen ──────────────────────────────────────────────────────────
step "Datensicherung"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%F-%H%M%S).tar.gz"

if tar -czf "$BACKUP_FILE" backend/data/ 2>/dev/null; then
  BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  ok "Backup erstellt: $BACKUP_FILE ($BACKUP_SIZE)"
else
  fail "Backup fehlgeschlagen — Deploy abgebrochen (Daten sichern!)"
fi

# Alte Backups rotieren (max. BACKUP_KEEP Stück)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$BACKUP_KEEP" ]; then
  DELETE_COUNT=$(( BACKUP_COUNT - BACKUP_KEEP ))
  ls -1t "$BACKUP_DIR"/backup-*.tar.gz | tail -"$DELETE_COUNT" | xargs rm -f
  info "Backup-Rotation: $DELETE_COUNT alte Backup(s) gelöscht, $BACKUP_KEEP behalten"
fi

# ── Code aktualisieren ────────────────────────────────────────────────────────
step "Code aktualisieren (git pull)"
if ! git pull origin "$BRANCH" --ff-only 2>&1 | tee -a "$LOG_FILE"; then
  fail "git pull fehlgeschlagen — Backup liegt unter $BACKUP_FILE"
fi
NEW_HASH=$(git rev-parse --short HEAD)
ok "Code aktualisiert: ${LOCAL_HASH:0:7} → $NEW_HASH"

# ── Dependencies aktualisieren (nur wenn package.json geändert) ──────────────
step "Dependencies prüfen"
CHANGED_FILES=$(git diff "${LOCAL_HASH:0:7}".."$NEW_HASH" --name-only 2>/dev/null || true)

if echo "$CHANGED_FILES" | grep -q "hausverwaltung-app/package"; then
  info "Frontend package.json geändert — npm install..."
  npm install --prefix hausverwaltung-app --prefer-offline --silent
  ok "Frontend-Dependencies aktualisiert"
else
  info "Frontend package.json unverändert — übersprungen"
fi

if echo "$CHANGED_FILES" | grep -q "backend/package"; then
  info "Backend package.json geändert — npm install..."
  npm install --prefix backend --prefer-offline --silent
  ok "Backend-Dependencies aktualisiert"
else
  info "Backend package.json unverändert — übersprungen"
fi

# ── Frontend bauen ────────────────────────────────────────────────────────────
step "Frontend bauen"
if ! npm run build --prefix hausverwaltung-app 2>&1 | tee -a "$LOG_FILE"; then
  fail "Frontend-Build fehlgeschlagen — Service wird nicht neu gestartet!"
fi
ok "Frontend Build erfolgreich"

# ── Service neu starten ───────────────────────────────────────────────────────
step "Service neu starten"
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  sudo systemctl restart "$SERVICE_NAME"
  sleep 3

  if systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "Service '$SERVICE_NAME' läuft"
  else
    LOGS=$(journalctl -u "$SERVICE_NAME" -n 20 --no-pager 2>/dev/null || true)
    log "ERR" "Service-Start fehlgeschlagen:\n$LOGS"
    fail "Service-Neustart fehlgeschlagen!\n  Backup: $BACKUP_FILE\n  Logs: sudo journalctl -u $SERVICE_NAME -n 30"
  fi
else
  warn "systemd-Service '$SERVICE_NAME' nicht aktiv — manuell starten: bash start.sh"
fi

# ── Fertig ────────────────────────────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "============================================"
echo -e "${GREEN}  Deploy erfolgreich!${NC}"
echo "  ${LOCAL_HASH:0:7} → $NEW_HASH  ($COMMITS Commit(s))"
echo "  Backup: $BACKUP_FILE"
echo "  http://$IP:$PORT"
echo "============================================"
echo ""

save_status "SUCCESS" "${LOCAL_HASH:0:7}" "$NEW_HASH" "$COMMITS Commit(s) deployt"
log "INFO" "Deploy abgeschlossen: ${LOCAL_HASH:0:7} → $NEW_HASH"
