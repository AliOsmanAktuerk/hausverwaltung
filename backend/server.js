import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ENTITIES = ['persons', 'products', 'expenses'];

// Sicherstellen, dass data-Verzeichnis und JSON-Dateien existieren
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
for (const entity of ENTITIES) {
  const file = path.join(DATA_DIR, `${entity}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
}

// Multer: Dateien auf Disk speichern mit eindeutigem Namen
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB

const app = express();
app.use(express.json());

function readData(entity) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${entity}.json`), 'utf-8'));
}

function writeData(entity, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${entity}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

// Generischer CRUD-Router für alle Entitäten
for (const entity of ENTITIES) {
  const router = express.Router();

  // Alle laden
  router.get('/', (_req, res) => {
    res.json(readData(entity));
  });

  // Neu anlegen — ID und Erfassungsdatum vergibt das Backend
  router.post('/', (req, res) => {
    const items = readData(entity);
    const now = new Date().toISOString();
    const item = { ...req.body, id: Date.now(), createdAt: now, updatedAt: now };
    items.push(item);
    writeData(entity, items);
    res.status(201).json(item);
  });

  // Aktualisieren — Erfassungsdatum bleibt erhalten
  router.put('/:id', (req, res) => {
    const items = readData(entity);
    const id = Number(req.params.id);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' });
    items[idx] = { ...req.body, id, createdAt: items[idx].createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
    writeData(entity, items);
    res.json(items[idx]);
  });

  // Löschen
  router.delete('/:id', (req, res) => {
    const items = readData(entity);
    const id = Number(req.params.id);
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length === items.length) return res.status(404).json({ error: 'Nicht gefunden' });
    writeData(entity, filtered);
    res.status(204).end();
  });

  app.use(`/api/${entity}`, router);
}

// ── Upload-Routen ──────────────────────────────────────────────────────────────

// Datei hochladen
app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen' });
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// Datei abrufen
app.get('/api/uploads/:filename', (req, res) => {
  const filepath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filepath)) return res.status(404).end();
  res.sendFile(filepath);
});

// Datei löschen
app.delete('/api/uploads/:filename', (req, res) => {
  const filepath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  res.status(204).end();
});

// ── Sicherung (Backup) ────────────────────────────────────────────────────────
const BACKUP_FILE = path.join(DATA_DIR, 'backup.json');

function readBackup() {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// Backup erstellen oder vorhandene Datei erweitern
app.post('/api/backup', (_req, res) => {
  try {
    const now = new Date().toISOString();
    const currentData = {};
    const counts = {};
    for (const entity of ENTITIES) {
      currentData[entity] = readData(entity);
      counts[entity] = currentData[entity].length;
    }

    const logEntry = { timestamp: now, counts };

    const existing = readBackup();

    let backup;
    if (existing) {
      // Vorhandene Datei erweitern: Log anhängen, Daten aktualisieren, neue Felder ergänzen
      backup = {
        ...existing,                          // alle bestehenden Felder erhalten
        lastUpdated: now,
        log: [...(existing.log ?? []), logEntry],
        data: {
          ...(existing.data ?? {}),           // ggf. neue Entitäten-Schlüssel ergänzen
          ...currentData,
        },
      };
    } else {
      // Neue Sicherungsdatei anlegen
      backup = {
        version: 1,
        created: now,
        lastUpdated: now,
        log: [logEntry],
        data: currentData,
      };
    }

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), 'utf-8');

    res.status(existing ? 200 : 201).json({
      message: existing ? 'Sicherung erweitert' : 'Sicherung erstellt',
      timestamp: now,
      counts,
      totalBackups: backup.log.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup-Info abrufen
app.get('/api/backup', (_req, res) => {
  const backup = readBackup();
  if (!backup) return res.json({ exists: false });
  res.json({
    exists: true,
    created: backup.created,
    lastUpdated: backup.lastUpdated,
    totalBackups: backup.log?.length ?? 0,
    log: backup.log ?? [],
    counts: backup.log?.at(-1)?.counts ?? {},
  });
});

// Backup als Datei herunterladen
app.get('/api/backup/download', (_req, res) => {
  if (!fs.existsSync(BACKUP_FILE)) return res.status(404).json({ error: 'Keine Sicherung vorhanden' });
  res.download(BACKUP_FILE, `hausverwaltung-backup-${new Date().toISOString().slice(0, 10)}.json`);
});

// ── System-Status ─────────────────────────────────────────────────────────────
app.get('/api/system/status', (_req, res) => {
  try {
    // Speicherplatz über df (Linux/macOS) oder Windows
    let diskTotal = null, diskFree = null, diskUsedPct = null;
    try {
      const dfOut = execSync(`df -k "${DATA_DIR}"`, { timeout: 3000 }).toString();
      const parts = dfOut.trim().split('\n')[1].trim().split(/\s+/);
      diskTotal = parseInt(parts[1]) * 1024;
      diskFree  = parseInt(parts[3]) * 1024;
      diskUsedPct = Math.round((1 - diskFree / diskTotal) * 100);
    } catch {
      // Windows oder df nicht verfügbar — Fallback
    }

    res.json({
      disk: {
        total: diskTotal,
        free: diskFree,
        usedPercent: diskUsedPct,
        warning: diskUsedPct !== null ? diskUsedPct >= 90 : false,
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usedPercent: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      },
      uptime: Math.floor(os.uptime()),
      platform: os.platform(),
      nodeVersion: process.version,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Statische Frontend-Dateien ausliefern (nach dem Build)
const DIST_DIR = path.join(__dirname, '..', 'hausverwaltung-app', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA-Fallback: alle nicht-API-Routen → index.html
  app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

const PORT = process.env.PORT || 8090;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf http://0.0.0.0:${PORT}`);
  if (fs.existsSync(DIST_DIR)) {
    console.log(`Frontend: http://0.0.0.0:${PORT}`);
  } else {
    console.log('Kein Frontend-Build gefunden — nur API aktiv.');
    console.log('Führe zuerst "npm run build" im hausverwaltung-app Ordner aus.');
  }
});
