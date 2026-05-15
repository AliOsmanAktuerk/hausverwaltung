#!/bin/bash
set -e

echo "============================================"
echo "  Buchungssystem – Setup & Start"
echo "============================================"

# Node.js Version prüfen
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo "FEHLER: Node.js 18 oder höher wird benötigt."
  echo "Installation: https://nodejs.org"
  exit 1
fi
echo "Node.js $(node -v) gefunden."

# Ins Projektverzeichnis wechseln (Skript kann von überall aufgerufen werden)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Dependencies installieren (nur wenn node_modules fehlt oder package.json neuer ist)
if [ ! -d "hausverwaltung-app/node_modules" ] || [ "hausverwaltung-app/package.json" -nt "hausverwaltung-app/node_modules/.package-lock.json" ]; then
  echo "Frontend-Dependencies werden installiert..."
  npm install --prefix hausverwaltung-app
fi

if [ ! -d "backend/node_modules" ] || [ "backend/package.json" -nt "backend/node_modules/.package-lock.json" ]; then
  echo "Backend-Dependencies werden installiert..."
  npm install --prefix backend
fi

# Frontend bauen
echo "Frontend wird gebaut..."
npm run build --prefix hausverwaltung-app

# Port konfigurieren (Standard: 3001)
export PORT="${PORT:-8090}"

echo ""
echo "============================================"
echo "  App erreichbar unter:"
echo "  http://$(hostname -I | awk '{print $1}'):${PORT}"
echo "  http://localhost:${PORT}"
echo "============================================"
echo ""

# Backup vor dem Start erstellen
echo "Sicherung wird erstellt..."
node -e "
const fs = require('fs');
const path = require('path');
const dataDir = path.join('${SCRIPT_DIR}', 'backend', 'data');
const backupFile = path.join(dataDir, 'backup.json');
const entities = ['persons', 'products', 'expenses'];
const now = new Date().toISOString();
const currentData = {};
const counts = {};
for (const entity of entities) {
  const file = path.join(dataDir, entity + '.json');
  currentData[entity] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : [];
  counts[entity] = currentData[entity].length;
}
const logEntry = { timestamp: now, counts };
let backup;
if (fs.existsSync(backupFile)) {
  const existing = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  backup = { ...existing, lastUpdated: now, log: [...(existing.log || []), logEntry], data: { ...(existing.data || {}), ...currentData } };
  console.log('Sicherung erweitert (Eintrag ' + backup.log.length + ')');
} else {
  backup = { version: 1, created: now, lastUpdated: now, log: [logEntry], data: currentData };
  console.log('Neue Sicherung angelegt');
}
fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
" || echo "Warnung: Sicherung fehlgeschlagen – Server wird trotzdem gestartet."

# Server starten
node backend/server.js
