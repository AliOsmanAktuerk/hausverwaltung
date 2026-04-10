#!/usr/bin/env node
// Generiert apple-touch-icon.png (180x180) für iOS Safari.
// Chrome/Edge nutzen die SVG-Icons direkt aus dem Manifest.
// Pure Node.js — keine externen Dependencies.
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  let c = -1;
  for (const b of buf) {
    let v = (c ^ b) & 0xff;
    for (let i = 0; i < 8; i++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    c = (c >>> 8) ^ v;
  }
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, t, data, crc]);
}

function blend(buf, size, x, y, fg) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  const a = fg[3] / 255;
  buf[i]   = Math.round(fg[0] * a + buf[i]   * (1 - a));
  buf[i+1] = Math.round(fg[1] * a + buf[i+1] * (1 - a));
  buf[i+2] = Math.round(fg[2] * a + buf[i+2] * (1 - a));
  buf[i+3] = Math.min(255, buf[i+3] + fg[3]);
}

function drawLine(buf, size, x0, y0, x1, y1, color, lw) {
  const half  = lw / 2;
  const dx    = x1 - x0, dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy)) * 2;
  for (let s = 0; s <= steps; s++) {
    const t  = s / steps;
    const cx = x0 + dx * t, cy = y0 + dy * t;
    for (let oy = -Math.ceil(half); oy <= Math.ceil(half); oy++)
      for (let ox = -Math.ceil(half); ox <= Math.ceil(half); ox++)
        if (Math.hypot(ox, oy) <= half)
          blend(buf, size, Math.round(cx + ox), Math.round(cy + oy), color);
  }
}

function drawRoundRect(buf, size, x, y, w, h, r, color, sw) {
  const filled = sw === 0;
  for (let py = Math.floor(y); py <= Math.ceil(y + h); py++) {
    for (let px = Math.floor(x); px <= Math.ceil(x + w); px++) {
      const nx   = Math.max(x + r, Math.min(x + w - r, px));
      const ny   = Math.max(y + r, Math.min(y + h - r, py));
      const dist = Math.hypot(px - nx, py - ny);
      if (filled) {
        if (dist <= r) blend(buf, size, px, py, color);
      } else {
        const inner = dist - (r - sw);
        if (dist <= r && inner >= 0) blend(buf, size, px, py, color);
      }
    }
  }
}

function drawCircle(buf, size, cx, cy, r, color) {
  for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++)
    for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++)
      if (Math.hypot(px - cx, py - cy) <= r)
        blend(buf, size, px, py, color);
}

function makeAppleTouchIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Skalierungsfaktor relativ zur 192x192-SVG-Vorlage
  const s = size / 192;

  const PURPLE = [0x63, 0x66, 0xf1, 0xff];
  const WHITE  = [0xff, 0xff, 0xff, 0xff];
  const GREEN  = [0x10, 0xb9, 0x81, 0xff];

  // Hintergrund (rx=40 aus SVG)
  drawRoundRect(buf, size, 0, 0, size, size, 40 * s, PURPLE, 0);

  // Dokument-Rahmen: x=36,y=52,w=120,h=88,rx=8, stroke-width=8
  drawRoundRect(buf, size, 36*s, 52*s, 120*s, 88*s, 8*s, WHITE, 8*s);

  // Trennlinie: x1=36,y1=76,x2=156,y2=76, stroke-width=8
  drawLine(buf, size, 36*s, 76*s, 156*s, 76*s, WHITE, 8*s);

  // Textzeilen (gefüllte Rechtecke)
  drawRoundRect(buf, size, 52*s, 92*s,  28*s, 8*s, 4*s, WHITE, 0);
  drawRoundRect(buf, size, 52*s, 108*s, 44*s, 8*s, 4*s, WHITE, 0);
  drawRoundRect(buf, size, 52*s, 124*s, 36*s, 8*s, 4*s, WHITE, 0);

  // Grüner Kreis mit Plus
  drawCircle(buf, size, 136*s, 130*s, 24*s, GREEN);
  drawLine(buf, size, 126*s, 130*s, 146*s, 130*s, WHITE, 5*s);
  drawLine(buf, size, 136*s, 120*s, 136*s, 140*s, WHITE, 5*s);

  // PNG-Encoding
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]));
    rows.push(buf.slice(y * size * 4, (y + 1) * size * 4));
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), makeAppleTouchIcon(180));
console.log('✓ apple-touch-icon.png (180x180) — iOS Safari');
