# Changelog

Alle relevanten Änderungen am Buchungssystem werden hier dokumentiert.  
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).

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
