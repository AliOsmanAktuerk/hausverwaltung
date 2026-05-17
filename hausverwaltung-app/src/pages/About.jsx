import {
  Box, Typography, Paper, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import StorageIcon from '@mui/icons-material/Storage';
import WebIcon from '@mui/icons-material/Web';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { useState } from 'react';
import { version as APP_VERSION } from '../../package.json';
import changelogRaw from '../../../CHANGELOG.md?raw';

function SectionTitle({ children }) {
  return (
    <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: 600, color: 'primary.main' }}>
      {children}
    </Typography>
  );
}

function DataTable({ head, rows }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            {head.map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} hover>
              {row.map((cell, j) => (
                <TableCell key={j}>
                  {j === 0 ? <code style={{ fontSize: '0.8rem' }}>{cell}</code> : cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CodeBlock({ children }) {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'grey.100',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        fontSize: '0.8rem',
        overflowX: 'auto',
        fontFamily: 'monospace',
        my: 1,
      }}
    >
      {children}
    </Box>
  );
}

// ---------- Tab 1: Übersicht ----------
function OverviewTab() {
  const features = [
    { category: 'Kernfunktionen', items: [
      'Dashboard – KPI-Karten, interaktive Charts (Monatsverlauf, Personen, Kostenstellen, Ranking)',
      'Personen – Verwaltung mit individueller Farbzuweisung',
      'Kostenstellen – Kategorien mit Beschreibung und Zuordnung',
      'Kosten – Buchungen mit Betrag, Datum, Typ (Einnahme/Ausgabe), Zahlungsart, Notiz und Dateianhängen',
      'Stunden – Stundenaufwandsliste mit KPIs und Personenübersicht',
      'Datei-Upload – Drag & Drop, Foto-Vorschau mit Lightbox-Galerie',
    ]},
    { category: 'Sicherheit & Authentifizierung', items: [
      'Login-System – JWT-basierte Authentifizierung, alle API-Routen geschützt',
      'Benutzerverwaltung – mehrere Benutzer anlegen, Passwörter ändern',
      'Kryptografische Integrität – SHA-256-Hash-Kette pro Eintrag (ähnlich Blockchain)',
    ]},
    { category: 'Auswertung & Export', items: [
      'Bilanz & GuV – automatische GuV-Rechnung und vereinfachte Bilanz; filterbar nach Jahr, Quartal, Monat',
      'Analytics – Jahresvergleich, Personen-Verlauf, Kostenstellen-Entwicklung, Top-10-Tabelle',
      'PDF-Export – Gesamtliste (gefiltert) mit Typ-Spalte und Einnahmen/Ausgaben/Saldo-Fußzeile',
      'Einzel-Beleg PDF – pro Buchung ein vollständiger Beleg mit Integritäts-Hash',
    ]},
    { category: 'Technik', items: [
      'Filter & Pagination – in allen Tabellen, mit Spaltenfiltern und Sortierung',
      'Mobile First – responsive Navigation mit Hamburger-Menü',
      'PWA – installierbar auf Mobilgeräten und Desktops',
      'JSON-Persistenz – keine Datenbankserver nötig',
      'Automatische Datensicherung – Backup erstellen & herunterladen direkt aus der App',
    ]},
  ];

  const pages = [
    ['/', 'Dashboard', 'KPI-Karten, Charts, Backup-Widget'],
    ['/persons', 'Personen', 'Verwaltung mit Farbzuweisung'],
    ['/products', 'Kostenstellen', 'Kategorien & Beschreibungen'],
    ['/expenses', 'Kosten', 'Buchungen (Einnahme/Ausgabe), Anhänge, PDF-Export'],
    ['/analytics', 'Analytics', 'Jahresvergleich, Trends, Top-10'],
    ['/finanzauswertung', 'Bilanz & GuV', 'GuV-Rechnung & Bilanz auf Basis der Buchungen'],
    ['/hours', 'Stunden', 'Stundenaufwandsliste, KPIs, Personenübersicht'],
    ['/settings', 'Einstellungen', 'Passwort, Benutzer, Integrität'],
    ['/about', 'Über die App', 'Dokumentation, Changelog & API-Referenz'],
  ];

  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
        Eine moderne Webanwendung zur Verwaltung von Personen, Kostenstellen, Ausgaben und
        Stundenaufwand – optimiert für den Einsatz auf einem Raspberry Pi im Heimnetzwerk.
      </Typography>

      {features.map(({ category, items }) => (
        <Box key={category}>
          <SectionTitle>{category}</SectionTitle>
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem key={item} disablePadding sx={{ pl: 1 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CheckCircleOutlineIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>
      ))}

      <SectionTitle>Seiten</SectionTitle>
      <DataTable head={['Route', 'Seite', 'Beschreibung']} rows={pages} />
    </Box>
  );
}

// ---------- Tab 2: Frontend ----------
function FrontendTab() {
  const stack = [
    ['React', '19', 'UI-Framework'],
    ['Vite', '8', 'Build-Tool & Dev-Server'],
    ['Material UI', '7', 'Komponenten-Bibliothek'],
    ['Tailwind CSS', '4', 'Utility-Klassen'],
    ['React Router', '7', 'Client-seitiges Routing'],
    ['Recharts', '3', 'Diagramme & Charts'],
    ['jsPDF + autotable', '4 / 5', 'PDF-Generierung'],
  ];

  return (
    <Box>
      <SectionTitle>Technologie-Stack</SectionTitle>
      <DataTable head={['Paket', 'Version', 'Zweck']} rows={stack} />

      <SectionTitle>Struktur</SectionTitle>
      <CodeBlock>{`src/
├── pages/
│   ├── Dashboard.jsx            # Übersicht & Charts
│   ├── Analytics.jsx            # Detaillierte Auswertungen
│   ├── Expenses.jsx             # Kostenverwaltung + PDF (Einnahme/Ausgabe)
│   ├── Finanzauswertung.jsx     # Bilanz & GuV  ← neu v1.1.0
│   ├── Hours.jsx                # Stundenaufwandsliste
│   ├── Persons.jsx
│   ├── Products.jsx
│   ├── Login.jsx
│   ├── Settings.jsx
│   └── About.jsx                # Diese Seite
├── context/
│   └── AuthContext.jsx          # JWT-Auth-State (login, logout, verify)
├── components/
│   └── ExpenseChart.jsx
├── utils/
│   ├── exportPdf.js             # PDF-Generierung (Liste + Einzelbeleg)
│   └── format.js                # fmtEuro, fmtDate
└── api.js                       # Fetch-Wrapper mit Auth-Header`}</CodeBlock>

      <SectionTitle>Entwicklung</SectionTitle>
      <CodeBlock>{`npm install
npm run dev        # Dev-Server auf http://localhost:5173`}</CodeBlock>
      <Typography variant="body2" color="text.secondary">
        Der Dev-Server leitet <code>/api/*</code> automatisch an <code>http://localhost:8090</code> weiter (Vite-Proxy).
      </Typography>

      <SectionTitle>Build</SectionTitle>
      <CodeBlock>{`npm run build      # Produktions-Build → dist/`}</CodeBlock>
      <Typography variant="body2" color="text.secondary">
        Das <code>dist/</code>-Verzeichnis wird vom Backend-Server statisch ausgeliefert.
      </Typography>
    </Box>
  );
}

// ---------- Tab 3: Backend ----------
function BackendTab() {
  const stack = [
    ['Express 4', 'HTTP-Server & Routing'],
    ['jsonwebtoken', 'JWT-Authentifizierung'],
    ['bcryptjs', 'Passwort-Hashing'],
    ['Multer', 'Datei-Upload'],
    ['Node.js crypto', 'SHA-256 Hash-Kette'],
  ];

  const authEndpoints = [
    ['POST', '/api/auth/login', 'Anmelden, JWT erhalten'],
    ['GET', '/api/auth/verify', 'Token prüfen'],
    ['PUT', '/api/auth/password', 'Eigenes Passwort ändern'],
    ['GET', '/api/auth/users', 'Alle Benutzer (ohne Passwort)'],
    ['POST', '/api/auth/users', 'Neuen Benutzer anlegen'],
    ['DELETE', '/api/auth/users/:id', 'Benutzer löschen'],
  ];

  const dataEndpoints = [
    ['GET / POST', '/api/persons', 'Personen abrufen / anlegen'],
    ['PUT / DELETE', '/api/persons/:id', 'Person aktualisieren / löschen'],
    ['GET / POST', '/api/products', 'Kostenstellen abrufen / anlegen'],
    ['PUT / DELETE', '/api/products/:id', 'Kostenstelle aktualisieren / löschen'],
    ['GET / POST', '/api/expenses', 'Kosten abrufen / anlegen'],
    ['PUT / DELETE', '/api/expenses/:id', 'Kosten aktualisieren / löschen'],
    ['GET / POST', '/api/hours', 'Stundeneinträge abrufen / anlegen'],
    ['PUT / DELETE', '/api/hours/:id', 'Stundeneintrag aktualisieren / löschen'],
    ['POST', '/api/uploads', 'Datei hochladen (max. 20 MB)'],
    ['GET', '/api/uploads/:filename', 'Datei abrufen'],
    ['DELETE', '/api/uploads/:filename', 'Datei löschen'],
  ];

  const systemEndpoints = [
    ['POST / GET', '/api/backup', 'Datensicherung erstellen / Info abrufen'],
    ['GET', '/api/backup/download', 'Backup-Datei herunterladen'],
    ['GET', '/api/system/status', 'Disk, RAM, Uptime, Node-Version'],
    ['GET', '/api/integrity/verify', 'Hash-Kette aller Einträge prüfen'],
  ];

  return (
    <Box>
      <SectionTitle>Technologie-Stack</SectionTitle>
      <DataTable head={['Paket', 'Zweck']} rows={stack} />

      <SectionTitle>Datenspeicherung</SectionTitle>
      <CodeBlock>{`data/
├── persons.json       # Personen
├── products.json      # Kostenstellen
├── expenses.json      # Buchungen
├── hours.json         # Stundeneinträge
├── backup.json        # Datensicherung
├── users.json         # Benutzer (Passwort-Hashes) ← nicht im Repo
├── .jwt_secret        # JWT-Schlüssel (zufällig generiert) ← nicht im Repo
└── uploads/           # Hochgeladene Dateien`}</CodeBlock>

      <SectionTitle>Starten</SectionTitle>
      <CodeBlock>{`npm install
npm run dev      # Entwicklung (node --watch, Port 8090)
npm start        # Produktion
PORT=8080 npm start   # anderen Port verwenden`}</CodeBlock>

      <SectionTitle>Standard-Zugangsdaten</SectionTitle>
      <DataTable head={['Feld', 'Wert']} rows={[['Benutzername', 'admin'], ['Passwort', 'admin']]} />
      <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
        Bitte nach dem ersten Login unter Einstellungen → Passwort ändern ein sicheres Passwort setzen.
      </Typography>

      <Divider sx={{ my: 2 }} />
      <SectionTitle>API – Authentifizierung</SectionTitle>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Alle Endpunkte außer <code>POST /api/auth/login</code> erfordern:{' '}
        <code>Authorization: Bearer &lt;token&gt;</code>
      </Typography>
      <DataTable head={['Methode', 'Endpunkt', 'Beschreibung']} rows={authEndpoints} />

      <SectionTitle>API – Daten (CRUD)</SectionTitle>
      <DataTable head={['Methode', 'Endpunkt', 'Beschreibung']} rows={dataEndpoints} />

      <SectionTitle>API – System</SectionTitle>
      <DataTable head={['Methode', 'Endpunkt', 'Beschreibung']} rows={systemEndpoints} />
    </Box>
  );
}

// ---------- Tab 4: Integrität & Sicherheit ----------
function SecurityTab() {
  return (
    <Box>
      <SectionTitle>Kryptografische Integrität</SectionTitle>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Jeder neue Datensatz erhält automatisch einen SHA-256-Hash, der aus dem Inhalt des
        Eintrags und dem Hash des vorherigen Eintrags berechnet wird (Kettenstruktur):
      </Typography>
      <CodeBlock>{`Genesis-Hash ("genesis:buchungssystem:expenses")
       ↓
Eintrag 1: hash = SHA-256({ entity, id, createdAt, ...daten, previousHash })
       ↓
Eintrag 2: hash = SHA-256({ ..., previousHash: hash_von_1 })`}</CodeBlock>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Eine nachträgliche Änderung in der JSON-Datei bricht die Kette — erkennbar über{' '}
        <strong>Einstellungen → Datenintegrität prüfen</strong> oder{' '}
        <code>GET /api/integrity/verify</code>.
      </Typography>

      <SectionTitle>JWT-Authentifizierung</SectionTitle>
      <List dense disablePadding>
        {[
          'JWT-Secret wird beim ersten Start zufällig generiert und in backend/data/.jwt_secret gespeichert.',
          'Token wird im localStorage des Browsers als auth_token abgelegt.',
          'Alle API-Routen außer /api/auth/login erfordern einen gültigen Bearer-Token.',
          'Bei abgelaufenem oder ungültigem Token: automatischer Logout und Weiterleitung zum Login.',
        ].map((item) => (
          <ListItem key={item} disablePadding sx={{ pl: 1 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CheckCircleOutlineIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary={item} />
          </ListItem>
        ))}
      </List>

      <SectionTitle>Datensicherung</SectionTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Die Daten liegen in <code>backend/data/</code>. Manuelles Backup:
      </Typography>
      <CodeBlock>{`tar -czf backup-buchungssystem-$(date +%F).tar.gz backend/data/`}</CodeBlock>
      <Typography variant="body2" color="text.secondary">
        Alternativ direkt in der App: <strong>Dashboard → Datensicherung → Sicherung erstellen</strong>.
      </Typography>

      <SectionTitle>Raspberry Pi Deployment</SectionTitle>
      <CodeBlock>{`# Einmalig: Autostart via systemd einrichten
sudo bash setup-autostart.sh

# Oder manuell starten
bash start.sh

# App erreichbar unter:
http://<raspberry-pi-ip>:8090
http://raspberrypi.local:8090`}</CodeBlock>
    </Box>
  );
}

// ---------- CHANGELOG.md Parser ----------
function parseChangelog(raw) {
  const releases = [];
  const sections = raw.split(/^## /m).filter(s => s.trim().startsWith('['));
  for (const section of sections) {
    const lines = section.split('\n');
    const match = lines[0].match(/\[([^\]]+)\]\s*[–-]\s*(.+)/);
    if (!match) continue;
    const added = [], improved = [], fixed = [];
    let current = null;
    for (const line of lines.slice(1)) {
      if (/^### Neu/.test(line))        { current = added;    continue; }
      if (/^### Verbessert/.test(line)) { current = improved; continue; }
      if (/^### Behoben/.test(line))    { current = fixed;    continue; }
      if (/^### /.test(line))           { current = null;     continue; }
      if (line.startsWith('- ') && current) current.push(line.slice(2).trim());
    }
    releases.push({ version: match[1], date: match[2].trim(), added, improved, fixed });
  }
  if (releases.length > 0) releases[0].isLatest = true;
  return releases;
}

// ---------- Tab 5: Changelog ----------
function ChangelogTab() {
  const releases = parseChangelog(changelogRaw);

  const sections = [
    { key: 'added',    label: 'Neu',        color: 'success' },
    { key: 'improved', label: 'Verbessert', color: 'primary' },
    { key: 'fixed',    label: 'Behoben',    color: 'warning' },
  ];

  return (
    <Box>
      {releases.map((r, i) => (
        <Box key={r.version} sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              v{r.version}
            </Typography>
            {r.isLatest && <Chip label="Aktuell" color="success" size="small" />}
            <Typography variant="caption" color="text.secondary">{r.date}</Typography>
          </Box>

          {sections.map(({ key, label, color }) =>
            r[key]?.length > 0 && (
              <Box key={key} sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} color={`${color}.dark`} sx={{ mb: 0.5 }}>
                  {label}
                </Typography>
                <List dense disablePadding>
                  {r[key].map((item) => (
                    <ListItem key={item} disablePadding sx={{ pl: 1 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <CheckCircleOutlineIcon fontSize="small" color={color} />
                      </ListItemIcon>
                      <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )
          )}

          {i < releases.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}
    </Box>
  );
}

// ---------- Haupt-Komponente ----------
export default function About() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: 'Übersicht', icon: <InfoOutlinedIcon fontSize="small" /> },
    { label: 'Frontend', icon: <WebIcon fontSize="small" /> },
    { label: 'Backend', icon: <StorageIcon fontSize="small" /> },
    { label: 'Sicherheit', icon: <CheckCircleOutlineIcon fontSize="small" /> },
    { label: 'Changelog', icon: <NewReleasesIcon fontSize="small" /> },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="h5" fontWeight={700}>Über das Buchungssystem</Typography>
          <Chip label={`v${APP_VERSION}`} color="primary" size="small" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {['React 19', 'Vite 8', 'Material UI 7', 'Express 4', 'JWT', 'SHA-256', 'PWA'].map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" color="primary" />
          ))}
        </Box>
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 0 && <OverviewTab />}
          {tab === 1 && <FrontendTab />}
          {tab === 2 && <BackendTab />}
          {tab === 3 && <SecurityTab />}
          {tab === 4 && <ChangelogTab />}
        </Box>
      </Paper>
    </Box>
  );
}
