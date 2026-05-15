# Buchungssystem

Eine moderne Webanwendung zur Verwaltung von Personen, Kostenstellen und Ausgaben – optimiert für den Einsatz auf einem Raspberry Pi im Heimnetzwerk.

---

## Features

### Kernfunktionen
- **Dashboard** – KPI-Karten, interaktive Charts (Monatsverlauf, Personen, Kostenstellen, Ranking)
- **Personen** – Verwaltung mit individueller Farbzuweisung
- **Kostenstellen** – Kategorien mit Beschreibung und Zuordnung
- **Kosten** – Buchungen mit Betrag, Datum, Zahlungsart, Notiz und Dateianhängen
- **Datei-Upload** – Drag & Drop, Foto-Vorschau mit Lightbox-Galerie

### Sicherheit & Authentifizierung
- **Login-System** – JWT-basierte Authentifizierung, alle API-Routen geschützt
- **Benutzerverwaltung** – mehrere Benutzer anlegen, Passwörter ändern
- **Kryptografische Integrität** – SHA-256-Hash-Kette pro Eintrag (ähnlich Blockchain); Manipulation wird zuverlässig erkannt

### Auswertung & Export
- **Analytics** – Jahresvergleich, Personen-Verlauf, Kostenstellen-Entwicklung, Zahlungsart-Analyse, Wochentag-Verteilung, Top-10-Tabelle mit Jahresfilter
- **PDF-Export** – Gesamtliste (gefiltert) als PDF mit eingebetteten Bildbelegen
- **Einzel-Beleg PDF** – pro Buchung ein vollständiger Beleg mit allen Bildanhängen, Detail-Tabelle und Integritäts-Hash

### Technik
- **Filter & Pagination** – in allen Tabellen, mit Spaltenfiltern und Sortierung
- **Mobile First** – responsive Navigation mit Hamburger-Menü
- **PWA** – installierbar auf Mobilgeräten und Desktops
- **JSON-Persistenz** – keine Datenbankserver nötig
- **Automatische Datensicherung** – Backup erstellen & herunterladen direkt aus der App

---

## Projektstruktur

```
buchungssystem/
├── backend/                    # Express REST-API (Node.js)
│   ├── server.js               # API + Auth + Integritätsprüfung + statischer Server
│   ├── package.json
│   └── data/                   # Datenspeicherung (automatisch erstellt, nicht im Repo)
│       ├── persons.json
│       ├── products.json
│       ├── expenses.json
│       ├── backup.json
│       └── uploads/            # Hochgeladene Dateien
├── hausverwaltung-app/         # React Frontend (Vite + MUI + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # KPIs & Charts
│   │   │   ├── Analytics.jsx   # Detaillierte Auswertungen
│   │   │   ├── Expenses.jsx    # Kostenverwaltung + PDF-Export
│   │   │   ├── Persons.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Settings.jsx    # Passwort, Benutzer, Integrität, App-Info
│   │   ├── context/
│   │   │   └── AuthContext.jsx # JWT Auth State
│   │   ├── components/
│   │   │   └── ExpenseChart.jsx
│   │   ├── utils/
│   │   │   ├── exportPdf.js    # PDF-Generierung (Liste + Einzelbeleg)
│   │   │   └── format.js
│   │   └── api.js              # API-Client mit Auth-Header
│   └── dist/                   # Produktions-Build (nach npm run build)
├── start.sh                    # Einzel-Befehl zum Starten (Raspberry Pi)
├── setup-autostart.sh          # Autostart via systemd einrichten
├── update.sh                   # Update-Skript (git pull + rebuild)
├── INSTALLATION.md             # Detaillierte Raspberry Pi Anleitung
└── README.md
```

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 19, Vite, Material UI 7, Tailwind CSS 4 |
| Charts | Recharts |
| PDF-Export | jsPDF, jspdf-autotable |
| Backend | Node.js, Express 4 |
| Authentifizierung | JSON Web Tokens (jsonwebtoken), bcryptjs |
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
npm install --prefix backend
npm install --prefix hausverwaltung-app
```

### Entwicklungsserver starten

```bash
# Terminal 1 – Backend (Port 8090)
cd backend && npm run dev

# Terminal 2 – Frontend (Port 5173, Proxy → 8090)
cd hausverwaltung-app && npm run dev
```

Frontend erreichbar unter: `http://localhost:5173`

> **Standard-Login:** Benutzername `admin` · Passwort `admin`  
> Bitte nach dem ersten Start unter **Einstellungen → Passwort ändern** ein sicheres Passwort setzen.

---

## Produktion (Build)

```bash
# Frontend bauen
npm run build --prefix hausverwaltung-app

# Server starten (liefert API + Frontend auf Port 8090)
node backend/server.js
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

Alle Endpunkte außer `/api/auth/login` erfordern einen gültigen JWT-Token im Header:  
`Authorization: Bearer <token>`

### Authentifizierung
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Anmelden, Token erhalten |
| GET | `/api/auth/verify` | Token prüfen |
| PUT | `/api/auth/password` | Passwort ändern |
| GET | `/api/auth/users` | Alle Benutzer auflisten |
| POST | `/api/auth/users` | Neuen Benutzer anlegen |
| DELETE | `/api/auth/users/:id` | Benutzer löschen |

### Daten
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| GET / POST | `/api/persons` | Personen abrufen / anlegen |
| PUT / DELETE | `/api/persons/:id` | Person aktualisieren / löschen |
| GET / POST | `/api/products` | Kostenstellen abrufen / anlegen |
| PUT / DELETE | `/api/products/:id` | Kostenstelle aktualisieren / löschen |
| GET / POST | `/api/expenses` | Kosten abrufen / anlegen |
| PUT / DELETE | `/api/expenses/:id` | Kosten aktualisieren / löschen |
| POST | `/api/uploads` | Datei hochladen (max. 20 MB) |
| GET | `/api/uploads/:filename` | Datei abrufen |
| DELETE | `/api/uploads/:filename` | Datei löschen |

### System
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| POST / GET | `/api/backup` | Datensicherung erstellen / Info abrufen |
| GET | `/api/backup/download` | Backup-Datei herunterladen |
| GET | `/api/system/status` | Disk, RAM, Uptime |
| GET | `/api/integrity/verify` | Hash-Kette aller Einträge prüfen |

---

## Kryptografische Integrität

Jeder neue Datensatz erhält automatisch einen SHA-256-Hash, der aus dem Inhalt des Eintrags und dem Hash des vorherigen Eintrags berechnet wird (Kettenstruktur):

```
Genesis-Hash ("genesis:buchungssystem:expenses")
       ↓
Eintrag 1: hash = SHA-256({ entity, id, createdAt, ...daten, previousHash })
       ↓
Eintrag 2: hash = SHA-256({ ..., previousHash: hash_von_1 })
```

Eine nachträgliche Änderung in der JSON-Datei bricht die Kette — erkennbar über  
**Einstellungen → Datenintegrität prüfen** oder `GET /api/integrity/verify`.

---

## Datensicherung

Die Daten liegen in `backend/data/`. Manuelles Backup:

```bash
tar -czf backup-buchungssystem-$(date +%F).tar.gz backend/data/
```

Alternativ direkt in der App: **Dashboard → Datensicherung → Sicherung erstellen**.

---

## Port ändern

Standard: **8090**

```bash
PORT=8080 node backend/server.js
# oder
PORT=8080 bash start.sh
```
