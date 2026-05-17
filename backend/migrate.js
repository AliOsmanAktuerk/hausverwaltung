#!/usr/bin/env node
/**
 * Migrationsskript für Hausverwaltung JSON-Daten.
 *
 * Verwendung:
 *   node migrate.js          — alle ausstehenden Migrationen ausführen
 *   node migrate.js --list   — angewandte Migrationen anzeigen
 *   node migrate.js --dry    — zeigen was geändert würde, ohne zu schreiben
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const MIGRATIONS_FILE = path.join(DATA_DIR, 'migrations.json');
const BACKUP_DIR = path.join(DATA_DIR, 'migration-backups');
const ENTITIES = ['persons', 'products', 'expenses', 'hours'];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const LIST_ONLY = args.includes('--list');

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function readData(entity) {
  const file = path.join(DATA_DIR, `${entity}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeData(entity, data) {
  if (DRY_RUN) return;
  fs.writeFileSync(path.join(DATA_DIR, `${entity}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

function readMigrations() {
  if (!fs.existsSync(MIGRATIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(MIGRATIONS_FILE, 'utf-8'));
}

function saveMigrations(log) {
  if (DRY_RUN) return;
  fs.writeFileSync(MIGRATIONS_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

function genesisHash(entity) {
  return crypto.createHash('sha256').update(`genesis:buchungssystem:${entity}`).digest('hex');
}

function computeEntryHash(entity, entry, previousHash) {
  const { hash: _h, updatedAt: _u, ...content } = entry;
  const payload = JSON.stringify({ entity, previousHash, ...content });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function recomputeAllHashes(entity, items) {
  let prevHash = genesisHash(entity);
  for (const item of items) {
    item.hash = computeEntryHash(entity, item, prevHash);
    prevHash = item.hash;
  }
}

function createBackup(reason) {
  if (DRY_RUN) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshot = {};
  for (const entity of ENTITIES) {
    snapshot[entity] = readData(entity);
  }
  const file = path.join(BACKUP_DIR, `backup-${timestamp}-${reason}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`  Backup erstellt: ${path.basename(file)}`);
  return file;
}

// ── Migrationen ───────────────────────────────────────────────────────────────

const MIGRATIONS = [
  {
    id: '001_add_timestamps',
    description: 'createdAt und updatedAt zu allen Einträgen hinzufügen (abgeleitet aus ID-Timestamp)',
    run() {
      let changed = 0;
      for (const entity of ENTITIES) {
        const items = readData(entity);
        let entityChanged = false;
        for (const item of items) {
          if (!item.createdAt) {
            // ID ist ein Date.now()-Timestamp
            item.createdAt = new Date(typeof item.id === 'number' ? item.id : Date.now()).toISOString();
            entityChanged = true;
          }
          if (!item.updatedAt) {
            item.updatedAt = item.createdAt;
            entityChanged = true;
          }
        }
        if (entityChanged) {
          // Hashes neu berechnen, da createdAt im Hash-Inhalt enthalten ist
          recomputeAllHashes(entity, items);
          writeData(entity, items);
          console.log(`  ${entity}: ${items.length} Einträge aktualisiert`);
          changed += items.length;
        } else {
          console.log(`  ${entity}: keine Änderungen nötig`);
        }
      }
      return changed;
    },
  },

  {
    id: '002_normalize_expense_type',
    description: 'Ausgaben: fehlendes Feld "type" mit Standardwert "Ausgabe" befüllen',
    run() {
      const items = readData('expenses');
      let changed = 0;
      for (const item of items) {
        if (!item.type) {
          item.type = 'Ausgabe';
          changed++;
        }
      }
      if (changed > 0) {
        recomputeAllHashes('expenses', items);
        writeData('expenses', items);
        console.log(`  expenses: ${changed} Einträge mit type="Ausgabe" versehen`);
      } else {
        console.log(`  expenses: keine Änderungen nötig`);
      }
      return changed;
    },
  },

  {
    id: '003_normalize_product_category',
    description: 'Produkte: leere category durch "Sonstiges" ersetzen',
    run() {
      const items = readData('products');
      let changed = 0;
      for (const item of items) {
        if (item.category === '' || item.category == null) {
          item.category = 'Sonstiges';
          changed++;
        }
      }
      if (changed > 0) {
        recomputeAllHashes('products', items);
        writeData('products', items);
        console.log(`  products: ${changed} Einträge mit category="Sonstiges" versehen`);
      } else {
        console.log(`  products: keine Änderungen nötig`);
      }
      return changed;
    },
  },
];

// ── Hauptprogramm ─────────────────────────────────────────────────────────────

function main() {
  console.log('Hausverwaltung — Migrationsskript');
  console.log('==================================');
  if (DRY_RUN) console.log('MODUS: Trocken (keine Dateien werden geschrieben)\n');

  const applied = readMigrations();
  const appliedIds = new Set(applied.map(m => m.id));

  if (LIST_ONLY) {
    console.log('Angewandte Migrationen:');
    if (applied.length === 0) {
      console.log('  (keine)');
    } else {
      for (const m of applied) {
        console.log(`  [${m.appliedAt.slice(0, 10)}] ${m.id} — ${m.description}`);
      }
    }
    const pending = MIGRATIONS.filter(m => !appliedIds.has(m.id));
    if (pending.length > 0) {
      console.log('\nAusstehende Migrationen:');
      for (const m of pending) {
        console.log(`  [ ausstehend ] ${m.id} — ${m.description}`);
      }
    }
    return;
  }

  const pending = MIGRATIONS.filter(m => !appliedIds.has(m.id));

  if (pending.length === 0) {
    console.log('Alle Migrationen sind bereits angewandt. Nichts zu tun.');
    return;
  }

  console.log(`${pending.length} ausstehende Migration(en) gefunden.\n`);

  if (!DRY_RUN) {
    createBackup('pre-migration');
    console.log();
  }

  let totalChanged = 0;
  for (const migration of pending) {
    console.log(`Führe aus: ${migration.id}`);
    console.log(`  ${migration.description}`);
    const changed = migration.run();
    totalChanged += changed ?? 0;

    if (!DRY_RUN) {
      applied.push({
        id: migration.id,
        description: migration.description,
        appliedAt: new Date().toISOString(),
        entriesChanged: changed ?? 0,
      });
      saveMigrations(applied);
    }
    console.log(`  Abgeschlossen.\n`);
  }

  console.log(`==================================`);
  if (DRY_RUN) {
    console.log(`Trockenlauf beendet. ${totalChanged} Einträge wären betroffen.`);
  } else {
    console.log(`Fertig. ${pending.length} Migration(en) angewandt, ${totalChanged} Einträge geändert.`);
  }
}

main();
