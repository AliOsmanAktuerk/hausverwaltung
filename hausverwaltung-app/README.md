# Buchungssystem – Frontend

React-Anwendung für das Buchungssystem. Gebaut mit Vite, Material UI und Tailwind CSS.

---

## Technologie-Stack

| Paket | Version | Zweck |
|---|---|---|
| React | 19 | UI-Framework |
| Vite | 8 | Build-Tool & Dev-Server |
| Material UI | 7 | Komponenten-Bibliothek |
| Tailwind CSS | 4 | Utility-Klassen |
| React Router | 7 | Client-seitiges Routing |
| Recharts | 3 | Diagramme & Charts |
| jsPDF + autotable | 4 / 5 | PDF-Generierung |

---

## Seiten

| Route | Seite | Beschreibung |
|---|---|---|
| `/` | Dashboard | KPI-Karten, Charts, Backup-Widget |
| `/persons` | Personen | Verwaltung mit Farbzuweisung |
| `/products` | Kostenstellen | Kategorien & Beschreibungen |
| `/expenses` | Kosten | Buchungen, Anhänge, PDF-Export |
| `/analytics` | Analytics | Jahresvergleich, Trends, Top-10 |
| `/hours` | Stunden | Stundenaufwandsliste, KPIs, Personenübersicht |
| `/settings` | Einstellungen | Passwort, Benutzer, Integrität |
| `/login` | Login | JWT-Anmeldung |

---

## Struktur

```
src/
├── pages/
│   ├── Dashboard.jsx       # Übersicht & Charts
│   ├── Analytics.jsx       # Detaillierte Auswertungen
│   ├── Expenses.jsx        # Kostenverwaltung + PDF
│   ├── Hours.jsx           # Stundenaufwandsliste
│   ├── Persons.jsx
│   ├── Products.jsx
│   ├── Login.jsx
│   └── Settings.jsx
├── context/
│   └── AuthContext.jsx     # JWT-Auth-State (login, logout, verify)
├── components/
│   └── ExpenseChart.jsx
├── utils/
│   ├── exportPdf.js        # PDF-Generierung (Liste + Einzelbeleg)
│   └── format.js           # fmtEuro, fmtDate
└── api.js                  # Fetch-Wrapper mit Auth-Header
```

---

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
```

Der Dev-Server leitet `/api/*` automatisch an `http://localhost:8090` weiter (Vite-Proxy).

## Build

```bash
npm run build      # Produktions-Build → dist/
```

Das `dist/`-Verzeichnis wird vom Backend-Server statisch ausgeliefert.

---

## Umgebung

Keine `.env`-Datei nötig. Der API-Proxy ist in `vite.config.js` konfiguriert:

```js
server: {
  proxy: { '/api': 'http://localhost:8090' }
}
```
