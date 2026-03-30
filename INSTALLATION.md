# Hausverwaltung – Installations- und Betriebsanleitung

## Raspberry Pi 3 / 4 (Empfehlung: Raspberry Pi OS Lite 64-bit)

---

## 1. Raspberry Pi OS vorbereiten

Raspberry Pi OS Lite (ohne Desktop) herunterladen und auf eine SD-Karte flashen:

- Download: https://www.raspberrypi.com/software/
- Tool: Raspberry Pi Imager (unter Windows/Mac/Linux)
- Im Imager unter **Einstellungen (Zahnrad)** vor dem Flashen konfigurieren:
  - Hostname: `hausverwaltung` (oder beliebig)
  - SSH aktivieren
  - WLAN-Zugangsdaten eintragen (falls kein LAN-Kabel)
  - Benutzer und Passwort festlegen

Nach dem Flashen: SD-Karte in den Pi, einschalten, ca. 60 Sekunden warten.

---

## 2. Verbindung herstellen

```bash
# Von einem anderen Rechner im Netzwerk
ssh pi@hausverwaltung.local
# oder mit der IP-Adresse (z.B. aus dem Router-Menü)
ssh pi@192.168.1.100
```

---

## 3. System aktualisieren

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 4. Node.js installieren (Version 20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Prüfen ob die Installation erfolgreich war
node -v   # sollte v20.x.x zeigen
npm -v    # sollte 10.x.x zeigen
```

---

## 5. Projekt auf den Raspberry Pi übertragen

### Option A – Per Git (empfohlen)

```bash
# Git installieren (falls noch nicht vorhanden)
sudo apt install -y git

# Projekt klonen
git clone https://github.com/DEIN-USER/DEIN-REPO.git /home/pi/hausverwaltung
```

### Option B – Per SCP (Dateiübertragung vom Windows-PC)

```bash
# Im Terminal auf dem Windows-PC ausführen:
scp -r E:\entwicklung\hausverwaltung pi@hausverwaltung.local:/home/pi/
```

> **Hinweis:** Die Ordner `node_modules` und `hausverwaltung-app/dist` müssen **nicht** übertragen werden – sie werden automatisch neu erzeugt.

---

## 6. App starten

```bash
# Ins Projektverzeichnis wechseln
cd /home/pi/hausverwaltung

# Startskript ausführbar machen (nur einmalig nötig)
chmod +x start.sh

# App starten
bash start.sh
```

`start.sh` erledigt automatisch:
1. Node.js-Version prüfen
2. Alle Abhängigkeiten installieren (`npm install`)
3. Frontend bauen (`npm run build`)
4. Server starten auf Port **8090**

Die App ist danach erreichbar unter:

```
http://hausverwaltung.local:8090
http://192.168.1.100:8090   ← IP-Adresse des Pi
```

---

## 7. App automatisch beim Systemstart starten (systemd)

Das beigelegte Skript `setup-autostart.sh` richtet den Autostart vollautomatisch ein:

```bash
cd /home/pi/hausverwaltung
sudo bash setup-autostart.sh
```

Das Skript erledigt automatisch:
- Node.js-Version prüfen
- Frontend bauen
- systemd-Service-Datei erstellen
- Autostart aktivieren (`systemctl enable`)
- Service sofort starten
- Erreichbarkeit anzeigen

Nach dem Ausführen läuft die App bei jedem Systemstart automatisch – ohne weiteres Zutun.

---

## 8. Nützliche Befehle im Betrieb

```bash
# Logs in Echtzeit anzeigen
sudo journalctl -u hausverwaltung -f

# Service neu starten (z.B. nach einem Update)
sudo systemctl restart hausverwaltung

# Service stoppen
sudo systemctl stop hausverwaltung

# App manuell aktualisieren (nach git pull)
cd /home/pi/hausverwaltung
git pull
bash start.sh
```

---

## 9. Datensicherung

Die Daten liegen als JSON-Dateien in:

```
/home/pi/hausverwaltung/backend/data/
  ├── persons.json
  ├── products.json
  ├── expenses.json
  └── uploads/        ← hochgeladene Dateien (Belege, Fotos)
```

Backup erstellen:

```bash
# Gesamten Datenordner sichern
tar -czf ~/backup-hausverwaltung-$(date +%F).tar.gz /home/pi/hausverwaltung/backend/data

# Auf den eigenen PC kopieren (vom PC aus ausführen)
scp pi@hausverwaltung.local:~/backup-hausverwaltung-*.tar.gz .
```

---

## 10. Port ändern (optional)

Standard-Port ist **8090**. Änderung in der systemd-Service-Datei:

```bash
sudo nano /etc/systemd/system/hausverwaltung.service
# Zeile anpassen: Environment=PORT=8080
sudo systemctl daemon-reload
sudo systemctl restart hausverwaltung
```

Oder beim manuellen Start:

```bash
PORT=8080 bash start.sh
```

---

## Systemvoraussetzungen

| Komponente | Minimum |
|---|---|
| Raspberry Pi | Pi 3B / 3B+ / 4 / 5 |
| RAM | 512 MB (1 GB empfohlen) |
| SD-Karte | 8 GB (16 GB empfohlen) |
| Node.js | 18 oder höher (20 LTS empfohlen) |
| Betriebssystem | Raspberry Pi OS Lite (32- oder 64-bit) |
| Netzwerk | WLAN oder LAN |
