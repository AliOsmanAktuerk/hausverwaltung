# Changelog

Alle relevanten Änderungen am Buchungssystem werden hier dokumentiert.  
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).

---

## [1.5.0] – 2026-05-22

### Neu

- **Storno-Funktion** — Jede Buchung kann per Klick auf den Storno-Button (↩) storniert
  werden. Ein Bestätigungsdialog zeigt die Originalbuchung und die entstehende Gegenbuchung
  (Ausgabe → Einnahme / Einnahme → Ausgabe) mit heutigem Datum. Die Storno-Buchung erhält
  automatisch einen roten „Storno"-Chip mit Tooltip, die Originalbuchung einen grauen
  „Storniert"-Chip. Der Storno-Button wird nach erfolgtem Storno deaktiviert, um
  Doppel-Stornos zu verhindern.

### Verbessert

- **Upload-Fehlermeldung sichtbar** — Schlägt ein Datei-Upload fehl (z. B. Server nicht
  erreichbar, Datei zu groß), erscheint die Fehlermeldung jetzt direkt unter der Upload-Zone
  im Formular statt nur in der Browser-Konsole zu verschwinden.

### Behoben

- **Workbox-Regelreihenfolge für Upload-Caching** — Die `CacheFirst`-Regel für
  `/api/uploads/` wurde von der allgemeinen `NetworkOnly`-Regel für `/api/` überschattet,
  sodass Bilder nie gecacht wurden. Die spezifischere Regel steht jetzt korrekt davor.

---

## [1.4.0] – 2026-05-22

### Neu

- **Vorgänger-Buchung (Korrektur-Verknüpfung)** — Beim Anlegen oder Bearbeiten einer
  Buchung kann optional eine Vorgänger-Buchung ausgewählt werden (z. B. Materialrückgabe
  verknüpft mit der ursprünglichen Ausgabe). Die Vorgängerliste ist nach Datum sortiert
  und zeigt Datum, Person, Kostenstelle und Betrag zur Identifikation.

- **Korrektur-Chips in der Kostentabelle** — Buchungen mit Vorgänger erhalten einen
  orangefarbenen „Korrektur"-Chip mit Tooltip (Vorgänger-Details). Buchungen, die als
  Vorgänger referenziert werden, erhalten einen blauen „Korrigiert"-Chip. Beide Chips
  erscheinen auch im Dashboard (Letzte Buchungen) und in der Analytics-Top-10-Tabelle.

- **Personen-Vergleich in Analytics** — Neue Sektion zum direkten Gegenüberstellen von
  1 bis n Personen. Personen per Chip-Toggle auswählen; Vergleichstabelle zeigt je Person:
  Ausgaben (brutto), Korrekturen (Einnahmen mit Vorgänger), Ausgaben (netto), Einnahmen,
  Saldo, Buchungsanzahl. Umschaltbar zwischen Balken- und Monatsverlaufsdiagramm.

- **`fmtAmount`-Hilfsfunktion** — Neue Formatierungsfunktion in `utils/format.js`, die
  Ausgaben automatisch als negativen Betrag darstellt (z. B. `−100,00 €`) und Einnahmen
  als positiven Betrag belässt. Wird in Kostentabelle, Dashboard, Analytics und PDF genutzt.

### Verbessert

- **Typ-Kennzeichnung in Dashboard & Analytics** — Ausgaben werden rot, Einnahmen grün
  dargestellt (Betrag + Chip). In der Analytics-Top-10-Tabelle wurde eine eigene
  „Typ"-Spalte ergänzt.

- **Korrekturen im PDF-Export** — Einzelbeleg-PDF zeigt eine hervorgehobene
  „Vorgänger-Buchung"-Zeile (orange), wenn eine Verknüpfung besteht. Listenexport
  kennzeichnet Korrektur-Zeilen gelblich und schreibt den Vorgänger-Bezug in die
  Notiz-Spalte.

- **Berechnungen in Analytics & Dashboard auf Ausgaben beschränkt** — Alle KPIs
  (Gesamtausgaben, Ø/Monat, Größte Buchung), Charts (Jahresvergleich, Personen-Verlauf,
  Kostenstellen, Zahlungsarten, Wochentag) und Dashboard-Memos (Gesamtkosten,
  Monatsverlauf, Personen-Ranking) berücksichtigen jetzt ausschließlich Ausgabe-Einträge.
  Einnahmen werden nicht mehr in Ausgaben-Summen mitgezählt.

---

## [1.3.0] – 2026-05-17

### Behoben

- **Anhänge nach Login nicht ladbar** — Bilder und PDFs wurden in der Kostenliste
  mit „Nicht authentifiziert" abgewiesen, weil `<img>`-Tags keinen Authorization-Header
  mitsenden können. `GET /api/uploads/*` ist jetzt öffentlich; Upload und Löschen
  bleiben weiterhin geschützt.

### Verbessert

- **Changelog im Frontend direkt aus `CHANGELOG.md`** — Der Changelog-Tab liest
  die Datei jetzt zur Build-Zeit ein (Vite `?raw`-Import) und parst sie automatisch.
  Releases müssen nicht mehr doppelt gepflegt werden.

- **App-Version aus `package.json`** — Die Versionsnummer wird beim Build automatisch
  aus `hausverwaltung-app/package.json` gelesen und im Header angezeigt.

---

## [1.2.0] – 2026-05-17

### Neu

- **Versioniertes Migrationsskript** (`backend/migrate.js`) — Schema-Änderungen an den
  JSON-Datendateien können jetzt kontrolliert und nachvollziehbar angewendet werden.
  Jede Migration läuft nur einmal (Protokoll in `data/migrations.json`). Enthaltene
  Migrationen: Timestamps ergänzen, Typ-Felder normalisieren, leere Kategorien befüllen.
  Aufruf: `npm run migrate` / `npm run migrate:list` / `npm run migrate:dry`

- **Snapshot-basierte Datensicherung** — Anstelle einer einzelnen `backup.json`, die bei
  jeder Sicherung überschrieben wurde, wird jetzt ein zeitgestempelter Snapshot unter
  `data/snapshots/` angelegt. Maximal 30 Snapshots werden behalten (automatische Rotation).

- **Automatischer Snapshot beim Serverstart** — Beim Start von `server.js` wird
  automatisch ein Snapshot aller Entitäten erstellt, ohne manuellen Aufruf.

### Verbessert

- **Datensicherung vollständig** — `hours`-Daten wurden bisher nicht gesichert;
  alle vier Entitäten (`persons`, `products`, `expenses`, `hours`) sind jetzt enthalten.

- **start.sh bereinigt** — Fehleranfälliger `node -e "require(...)"` Backup-Block
  entfernt (funktionierte nicht im ESM-Projekt); Sicherung übernimmt jetzt `server.js`.

- **`.gitignore` erweitert** — `hours.json`, `snapshots/`, `migration-backups/` und
  `migrations.json` korrekt ausgeschlossen.

---

## [1.1.0] – 2026-05-17

### Neu

- **Typ-Feld „Einnahme / Ausgabe"** — Jede Buchung wird jetzt als Einnahme oder Ausgabe
  klassifiziert. Das Feld ist Pflichtfeld beim Anlegen/Bearbeiten (Standard: Ausgabe).
  Bestehende Einträge ohne Typ werden automatisch als Ausgabe behandelt.

- **Seite „Bilanz & GuV"** (`/finanzauswertung`) — Neue Seite mit vollautomatischer
  Finanzauswertung auf Basis des Buchungsstands:
  - **Gewinn- und Verlustrechnung (GuV)** — Erträge und Aufwendungen nach Kostenstelle
    gegliedert mit Jahresüberschuss / -fehlbetrag (dt. Buchführungsstil, römische Nummerierung)
  - **Bilanz (vereinfacht)** — Aktiva (Zuflüsse) gegenüber Passiva (Verbindlichkeiten +
    Eigenkapital) mit automatischem Bilanz-Ausgleichsprüfer
  - **KPI-Karten** — Einnahmen, Ausgaben, Jahresergebnis auf einen Blick
  - **Monatschart** — Einnahmen (Balken, grün), Ausgaben (Balken, rot) und kumulierter
    Saldo (Linie, lila) für das gesamte Jahr

- **Periodenfilter für Bilanz & GuV** — Auswertung filterbar nach Gesamtjahr, Quartal
  (Q1–Q4) oder einzelnem Monat (Jan–Dez); Jahresauswahl per Toggle-Button.

### Verbessert

- **Kostentabelle – Fußzeile** — Statt einer einfachen Gesamtsumme zeigt die Tabelle
  jetzt drei Zeilen: Einnahmen (grün), Ausgaben (rot) und Saldo (farbig je nach Vorzeichen).

- **Kostentabelle – Typ-Spalte** — Farbige Chips in der Tabelle (grün = Einnahme,
  rot = Ausgabe); sortierbar und per Spaltenfilter filterbar.

- **Filterleiste Kosten** — Neuer Typ-Filter (Alle / Einnahme / Ausgabe) in der
  zweiten Filterzeile.

- **PDF-Export (Gesamtliste)** — Neue Spalte „Typ" in der Tabelle; Fußzeile zeigt
  Einnahmen, Ausgaben und Saldo statt nur der Gesamtsumme.

- **PDF-Export (Einzelbeleg)** — Typ-Zeile in der Detailtabelle ergänzt.

---

## [1.0.0] – 2025

### Enthalten (Initialversion)

- **Dashboard** — KPI-Karten, interaktive Charts (Monatsverlauf, Personen, Kostenstellen,
  Ranking), Backup-Widget
- **Personen** — Verwaltung mit individueller Farbzuweisung
- **Kostenstellen** — Kategorien mit Beschreibung und Zuordnung
- **Kosten** — Buchungen mit Betrag, Datum, Zahlungsart, Notiz, Anhängen (Drag & Drop);
  Spaltenfilter, Sortierung, Pagination; PDF-Export (Liste & Einzelbeleg mit Bildanhängen)
- **Stundenaufwandsliste** — Stundenerfassung mit KPIs und Personenübersicht
- **Analytics** — Jahresvergleich, Personen-Verlauf, Kostenstellen-Entwicklung,
  Zahlungsart-Analyse, Wochentag-Verteilung, Top-10-Tabelle mit Jahresfilter
- **Login-System** — JWT-basierte Authentifizierung; alle API-Routen geschützt
- **Benutzerverwaltung** — mehrere Benutzer anlegen, Passwörter ändern
- **Kryptografische Integrität** — SHA-256-Hash-Kette pro Eintrag (ähnlich Blockchain);
  Manipulation wird zuverlässig erkannt
- **Datensicherung** — Backup erstellen & herunterladen direkt aus der App
- **PWA** — installierbar auf Mobilgeräten und Desktops (Service Worker, Manifest)
- **Raspberry Pi Deployment** — systemd-Autostart, Update-Skript
