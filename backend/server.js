import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ENTITIES = ['persons', 'products', 'expenses', 'hours'];

// Sicherstellen, dass data-Verzeichnis und JSON-Dateien existieren
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
for (const entity of ENTITIES) {
  const file = path.join(DATA_DIR, `${entity}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8');
}

// ── JWT Secret (persistent) ───────────────────────────────────────────────────
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');
let JWT_SECRET;
if (fs.existsSync(SECRET_FILE)) {
  JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, JWT_SECRET, 'utf-8');
}

// ── Benutzerverwaltung ────────────────────────────────────────────────────────
const USERS_FILE = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(USERS_FILE)) {
  const defaultHash = bcrypt.hashSync('admin', 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify([
    { id: 1, username: 'admin', password: defaultHash, createdAt: new Date().toISOString() },
  ], null, 2), 'utf-8');
  console.log('Standard-Benutzer erstellt: admin / admin');
}

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
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

// ── Auth-Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht authentifiziert' });
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

// Alle /api/*-Routen schützen außer /api/auth/* und GET /api/uploads/*
// (Bilder können im Browser keinen Authorization-Header mitsenden)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  if (req.method === 'GET' && req.path.startsWith('/uploads/')) return next();
  requireAuth(req, res, next);
});

// ── Auth-Routen ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// Passwort ändern (nur für eingeloggten Benutzer)
app.put('/api/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen haben' });
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1 || !bcrypt.compareSync(currentPassword, users[idx].password)) {
    return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
  }
  users[idx].password = bcrypt.hashSync(newPassword, 10);
  writeUsers(users);
  res.json({ message: 'Passwort geändert' });
});

// Alle Benutzer auflisten (ohne Passwort-Hash)
app.get('/api/auth/users', requireAuth, (req, res) => {
  const users = readUsers().map(({ password: _pw, ...u }) => u);
  res.json(users);
});

// Neuen Benutzer anlegen
app.post('/api/auth/users', requireAuth, (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
  if (password.length < 4) return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen haben' });
  const users = readUsers();
  if (users.some(u => u.username === username)) return res.status(409).json({ error: 'Benutzername bereits vergeben' });
  const newUser = { id: Date.now(), username, password: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString() };
  users.push(newUser);
  writeUsers(users);
  const { password: _pw, ...safe } = newUser;
  res.status(201).json(safe);
});

// Benutzer löschen (nicht sich selbst)
app.delete('/api/auth/users/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Eigenen Account kann man nicht löschen' });
  const users = readUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (filtered.length === 0) return res.status(400).json({ error: 'Letzten Benutzer kann man nicht löschen' });
  writeUsers(filtered);
  res.status(204).end();
});

// ── Kryptografische Integrität ────────────────────────────────────────────────

// Genesis-Hash: Startpunkt der Kette für jede Entität
function genesisHash(entity) {
  return crypto.createHash('sha256').update(`genesis:buchungssystem:${entity}`).digest('hex');
}

// Hash eines Eintrags berechnen (ohne hash- und updatedAt-Feld, da diese keine
// unveränderlichen Erstellungsdaten sind)
function computeEntryHash(entity, entry, previousHash) {
  const { hash: _h, updatedAt: _u, ...content } = entry;
  const payload = JSON.stringify({ entity, previousHash, ...content });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── Daten-Helfer ──────────────────────────────────────────────────────────────
function readData(entity) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${entity}.json`), 'utf-8'));
}

function writeData(entity, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${entity}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

// Migration: bestehende Einträge ohne Hash nachträglich verketten
function migrateHashes() {
  for (const entity of ENTITIES) {
    const items = readData(entity);
    if (items.length === 0 || items.every(i => i.hash)) continue;
    let prevHash = genesisHash(entity);
    for (const item of items) {
      if (!item.hash) item.hash = computeEntryHash(entity, item, prevHash);
      prevHash = item.hash;
    }
    writeData(entity, items);
    console.log(`Hash-Migration: ${entity} (${items.length} Einträge)`);
  }
}
migrateHashes();

// Generischer CRUD-Router für alle Entitäten
for (const entity of ENTITIES) {
  const router = express.Router();

  // Alle laden
  router.get('/', (_req, res) => {
    res.json(readData(entity));
  });

  // Neu anlegen — ID, Erfassungsdatum und kryptografischer Hash vom Backend
  router.post('/', (req, res) => {
    const items = readData(entity);
    const now = new Date().toISOString();
    const prevHash = items.length > 0 ? items[items.length - 1].hash : genesisHash(entity);
    const item = { ...req.body, id: Date.now(), createdAt: now, updatedAt: now };
    item.hash = computeEntryHash(entity, item, prevHash);
    items.push(item);
    writeData(entity, items);
    res.status(201).json(item);
  });

  // Aktualisieren — Erfassungsdatum und Hash bleiben erhalten
  router.put('/:id', (req, res) => {
    const items = readData(entity);
    const id = Number(req.params.id);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' });
    items[idx] = {
      ...req.body,
      id,
      createdAt: items[idx].createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: items[idx].hash, // Erstellungs-Hash ist unveränderlich
    };
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
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

// Letzten Snapshot laden (für API-Info)
function readLatestSnapshot() {
  const files = fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, files.at(-1)), 'utf-8'));
  } catch {
    return null;
  }
}

function listSnapshots() {
  return fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      try {
        const snap = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf-8'));
        return { filename: f, timestamp: snap.timestamp, counts: snap.counts };
      } catch {
        return { filename: f, timestamp: null, counts: {} };
      }
    });
}

function createSnapshot() {
  const now = new Date().toISOString();
  const timestamp = now.replace(/[:.]/g, '-');
  const snapshot = { version: 2, timestamp: now, counts: {}, data: {} };
  for (const entity of ENTITIES) {
    snapshot.data[entity] = readData(entity);
    snapshot.counts[entity] = snapshot.data[entity].length;
  }
  const file = path.join(SNAPSHOTS_DIR, `snapshot-${timestamp}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');

  // Nur die letzten 30 Snapshots behalten
  const all = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')).sort();
  if (all.length > 30) {
    for (const old of all.slice(0, all.length - 30)) {
      fs.unlinkSync(path.join(SNAPSHOTS_DIR, old));
    }
  }
  return { file: path.basename(file), timestamp: now, counts: snapshot.counts };
}

// Snapshot erstellen
app.post('/api/backup', (_req, res) => {
  try {
    const result = createSnapshot();
    const snapshots = listSnapshots();
    res.status(201).json({
      message: 'Sicherung erstellt',
      timestamp: result.timestamp,
      counts: result.counts,
      totalBackups: snapshots.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backup-Info abrufen
app.get('/api/backup', (_req, res) => {
  const snapshots = listSnapshots();
  if (snapshots.length === 0) return res.json({ exists: false });
  const latest = snapshots.at(-1);
  res.json({
    exists: true,
    created: snapshots[0].timestamp,
    lastUpdated: latest.timestamp,
    totalBackups: snapshots.length,
    log: snapshots.map(s => ({ timestamp: s.timestamp, counts: s.counts })),
    counts: latest.counts,
  });
});

// Backup als Datei herunterladen (neuester Snapshot)
app.get('/api/backup/download', (_req, res) => {
  const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) return res.status(404).json({ error: 'Keine Sicherung vorhanden' });
  const latest = path.join(SNAPSHOTS_DIR, files.at(-1));
  res.download(latest, `buchungssystem-backup-${new Date().toISOString().slice(0, 10)}.json`);
});

// Automatischer Snapshot beim Start
createSnapshot();
console.log('Startsicherung erstellt.');

// ── System-Status ─────────────────────────────────────────────────────────────
app.get('/api/system/status', (_req, res) => {
  try {
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

// ── Integritätsprüfung ────────────────────────────────────────────────────────
app.get('/api/integrity/verify', requireAuth, (_req, res) => {
  const results = {};
  for (const entity of ENTITIES) {
    const items = readData(entity);
    let prevHash = genesisHash(entity);
    const violations = [];
    for (const item of items) {
      const expected = computeEntryHash(entity, item, prevHash);
      if (item.hash !== expected) {
        violations.push({ id: item.id, createdAt: item.createdAt, expected, actual: item.hash ?? null });
      }
      prevHash = item.hash ?? prevHash;
    }
    results[entity] = { valid: violations.length === 0, count: items.length, violations };
  }
  const allValid = Object.values(results).every(r => r.valid);
  res.json({ valid: allValid, checkedAt: new Date().toISOString(), results });
});

// Statische Frontend-Dateien ausliefern (nach dem Build)
const DIST_DIR = path.join(__dirname, '..', 'hausverwaltung-app', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
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
