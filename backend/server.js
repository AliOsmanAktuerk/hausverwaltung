import express from 'express';
import fs from 'fs';
import path from 'path';
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

  // Neu anlegen — ID vergibt das Backend
  router.post('/', (req, res) => {
    const items = readData(entity);
    const item = { ...req.body, id: Date.now() };
    items.push(item);
    writeData(entity, items);
    res.status(201).json(item);
  });

  // Aktualisieren
  router.put('/:id', (req, res) => {
    const items = readData(entity);
    const id = Number(req.params.id);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' });
    items[idx] = { ...req.body, id };
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
