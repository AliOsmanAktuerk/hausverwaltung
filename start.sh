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

# Backup vor dem Start erstellen (server.js übernimmt das automatisch beim Start)

# Server starten
node backend/server.js
