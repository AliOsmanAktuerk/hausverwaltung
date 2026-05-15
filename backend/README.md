# Buchungssystem – Backend

Express REST-API für das Buchungssystem. Speichert alle Daten als JSON-Dateien – kein Datenbankserver nötig.

---

## Technologie-Stack

| Paket | Zweck |
|---|---|
| Express 4 | HTTP-Server & Routing |
| jsonwebtoken | JWT-Authentifizierung |
| bcryptjs | Passwort-Hashing |
| Multer | Datei-Upload |
| Node.js crypto | SHA-256 Hash-Kette |

---

## Starten

```bash
npm install
npm run dev      # Entwicklung (node --watch, Port 8090)
npm start        # Produktion
```

```bash
PORT=8080 npm start   # anderen Port verwenden
```

---

## Datenspeicherung

Alle Daten liegen in `data/` (wird beim ersten Start automatisch erstellt):

```
data/
├── persons.json       # Personen
├── products.json      # Kostenstellen
├── expenses.json      # Buchungen
├── backup.json        # Datensicherung
├── users.json         # Benutzer (Passwort-Hashes) ← nicht im Repo
├── .jwt_secret        # JWT-Schlüssel (zufällig generiert) ← nicht im Repo
└── uploads/           # Hochgeladene Dateien
```

> `users.json` und `.jwt_secret` werden beim ersten Start automatisch erstellt und sind in `.gitignore` ausgeschlossen.

---

## API-Endpunkte

Alle Endpunkte außer `POST /api/auth/login` erfordern:  
`Authorization: Bearer <token>`

### Authentifizierung

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Anmelden, JWT erhalten |
| GET | `/api/auth/verify` | Token prüfen |
| PUT | `/api/auth/password` | Eigenes Passwort ändern |
| GET | `/api/auth/users` | Alle Benutzer (ohne Passwort) |
| POST | `/api/auth/users` | Neuen Benutzer anlegen |
| DELETE | `/api/auth/users/:id` | Benutzer löschen |

### Daten (CRUD)

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| GET | `/api/persons` | Alle Personen |
| POST | `/api/persons` | Person anlegen |
| PUT | `/api/persons/:id` | Person aktualisieren |
| DELETE | `/api/persons/:id` | Person löschen |
| GET | `/api/products` | Alle Kostenstellen |
| POST | `/api/products` | Kostenstelle anlegen |
| PUT | `/api/products/:id` | Kostenstelle aktualisieren |
| DELETE | `/api/products/:id` | Kostenstelle löschen |
| GET | `/api/expenses` | Alle Kostenpositionen |
| POST | `/api/expenses` | Kostenposition anlegen |
| PUT | `/api/expenses/:id` | Kostenposition aktualisieren |
| DELETE | `/api/expenses/:id` | Kostenposition löschen |

### Uploads

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| POST | `/api/uploads` | Datei hochladen (max. 20 MB) |
| GET | `/api/uploads/:filename` | Datei abrufen |
| DELETE | `/api/uploads/:filename` | Datei löschen |

### System

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| POST | `/api/backup` | Sicherung erstellen / aktualisieren |
| GET | `/api/backup` | Sicherungs-Info abrufen |
| GET | `/api/backup/download` | Backup-Datei herunterladen |
| GET | `/api/system/status` | Disk, RAM, Uptime, Node-Version |
| GET | `/api/integrity/verify` | Hash-Kette aller Entitäten prüfen |

---

## Kryptografische Integrität

Jeder neue Eintrag bekommt automatisch einen SHA-256-Hash:

```
hash = SHA-256({ entity, id, createdAt, ...felder, previousHash })
```

Die Hashes bilden eine Kette — eine Manipulation an einem Eintrag macht alle nachfolgenden Hashes ungültig.  
Prüfbar über `GET /api/integrity/verify`.

---

## Standard-Zugangsdaten

Beim ersten Start wird automatisch ein Admin-Benutzer angelegt:

| Feld | Wert |
|---|---|
| Benutzername | `admin` |
| Passwort | `admin` |

> Bitte nach dem ersten Login unter **Einstellungen → Passwort ändern** ein sicheres Passwort setzen.
