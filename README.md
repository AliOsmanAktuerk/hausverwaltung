# Hausverwaltung App

Eine moderne Webanwendung zur Verwaltung von Personen, Kostenstellen und Ausgaben – optimiert für den Einsatz auf einem Raspberry Pi im Heimnetzwerk.

---

## Features

- **Dashboard** – KPI-Karten, interaktive Charts (Monatsverlauf, Personen, Kostenstellen, Ranking)
- **Personen** – Verwaltung mit Farbzuweisung
- **Kostenstellen** – Produkte/Kategorien mit Kostenstellen-Zuordnung
- **Kosten** – Buchungen mit Betrag, Datum, Zahlungsart, Notiz und Dateianhängen
- **Datei-Upload** – Drag & Drop, Foto-Vorschau mit Lightbox-Galerie
- **Filter & Pagination** – in allen Tabellen
- **Mobile First** – responsive Navigation mit Hamburger-Menü
- **JSON-Persistenz** – alle Daten werden serverseitig in JSON-Dateien gespeichert

---

## Projektstruktur

```
hausverwaltung/
├── backend/                  # Express REST-API (Node.js)
│   ├── server.js             # API + statischer Dateiserver
│   ├── package.json
│   └── data/                 # Datenspeicherung (wird automatisch erstellt)
│       ├── persons.json
│       ├── products.json
│       ├── expenses.json
│       └── uploads/          # Hochgeladene Dateien
├── hausverwaltung-app/       # React Frontend (Vite + MUI + Tailwind)
│   ├── src/
│   │   ├── pages/            # Dashboard, Persons, Products, Expenses
│   │   ├── components/       # ExpenseChart
│   │   └── api.js            # API-Client
│   └── dist/                 # Produktions-Build (nach npm run build)
├── start.sh                  # Einzel-Befehl zum Starten (Raspberry Pi)
├── setup-autostart.sh        # Autostart via systemd einrichten
├── INSTALLATION.md           # Detaillierte Raspberry Pi Anleitung
└── README.md
```

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19, Vite, Material UI 7, Tailwind CSS 4 |
| Charts | Recharts |
| Backend | Node.js, Express 4 |
| Datei-Upload | Multer |
| Datenspeicherung | JSON-Dateien (kein Datenbankserver nötig) |
| Deployment | Raspberry Pi OS, systemd |

---

## Schnellstart (Entwicklung)

### Voraussetzungen

- Node.js 18 oder höher

### Installation

```bash
# Dependencies für Frontend und Backend installieren
npm run install:all
```

### Entwicklungsserver starten

```bash
# Terminal 1 – Backend (Port 8090)
npm run dev:backend

# Terminal 2 – Frontend (Port 5173, Proxy → 8090)
npm run dev:frontend
```

Frontend erreichbar unter: `http://localhost:5173`

---

## Produktion (Build)

```bash
# Frontend bauen
npm run build

# Server starten (liefert API + Frontend auf Port 8090)
npm start
```

App erreichbar unter: `http://localhost:8090`

---

## Raspberry Pi

Für die vollständige Einrichtung auf einem Raspberry Pi siehe **[INSTALLATION.md](INSTALLATION.md)**.

### Kurzversion

```bash
# Einmalig: Autostart einrichten
sudo bash setup-autostart.sh

# Oder manuell starten
bash start.sh
```

Die App ist danach im gesamten Heimnetzwerk erreichbar:

```
http://<raspberry-pi-ip>:8090
http://raspberrypi.local:8090
```

---

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/persons` | Alle Personen |
| POST | `/api/persons` | Person anlegen |
| PUT | `/api/persons/:id` | Person aktualisieren |
| DELETE | `/api/persons/:id` | Person löschen |
| GET | `/api/products` | Alle Kostenstellen/Produkte |
| POST | `/api/products` | Produkt anlegen |
| PUT | `/api/products/:id` | Produkt aktualisieren |
| DELETE | `/api/products/:id` | Produkt löschen |
| GET | `/api/expenses` | Alle Kostenpositionen |
| POST | `/api/expenses` | Kostenposition anlegen |
| PUT | `/api/expenses/:id` | Kostenposition aktualisieren |
| DELETE | `/api/expenses/:id` | Kostenposition löschen |
| POST | `/api/uploads` | Datei hochladen (max. 20 MB) |
| GET | `/api/uploads/:filename` | Datei abrufen |
| DELETE | `/api/uploads/:filename` | Datei löschen |

---

## Datensicherung

Die Daten liegen in `backend/data/`. Backup erstellen:

```bash
tar -czf backup-$(date +%F).tar.gz backend/data/
```

---

## Port ändern

Standard: **8090**

```bash
PORT=8080 npm start
# oder
PORT=8080 bash start.sh
```
