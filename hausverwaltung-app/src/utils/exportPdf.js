import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtEuro, fmtAmount, fmtDate } from './format';

const BRAND_COLOR  = [99, 102, 241];   // Indigo #6366f1
const HEADER_BG    = [245, 245, 250];
const FOOTER_BG    = [235, 235, 245];
const ROW_ALT      = [249, 249, 253];
const TEXT_MUTED   = [120, 120, 140];
const PAGE_W       = 210;
const MARGIN       = 14;
const CONTENT_W    = PAGE_W - MARGIN * 2;

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = src;
  });
}

function jsPdfFormat(mimetype) {
  if (mimetype?.includes('jpeg') || mimetype?.includes('jpg')) return 'JPEG';
  if (mimetype?.includes('webp')) return 'WEBP';
  if (mimetype?.includes('gif'))  return 'GIF';
  return 'PNG';
}

async function fetchImageBase64(filename) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`/api/uploads/${filename}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return blobToBase64(await res.blob());
}

// ── Kopfzeile jeder Seite ─────────────────────────────────────────────────────
function drawPageHeader(doc, totalPages) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Schmaler Balken oben
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, PAGE_W, 8, 'F');

    // Seitennummer unten
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      `Seite ${i} von ${totalPages ?? pageCount}`,
      PAGE_W - MARGIN,
      doc.internal.pageSize.height - 6,
      { align: 'right' }
    );
    doc.text(
      `Buchungssystem · Kosten Dokumentation`,
      MARGIN,
      doc.internal.pageSize.height - 6,
    );
  }
}

// ── Titelblock erste Seite ────────────────────────────────────────────────────
function drawTitleBlock(doc, { totalCount, totalAmount, filters, generatedAt }) {
  let y = 18;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text('Kosten Dokumentation', MARGIN, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Erstellt am ${generatedAt}`, MARGIN, y);

  // Trennlinie
  y += 4;
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  // Info-Zeile
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(`Einträge: `, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalCount}`, MARGIN + 18, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Gesamtbetrag: ', MARGIN + 45, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fmtEuro(totalAmount), MARGIN + 75, y);

  if (filters) {
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Filter: ${filters}`, MARGIN, y);
  }

  return y + 6; // startY für Tabelle
}

// ── Einzel-Eintrag PDF ────────────────────────────────────────────────────────
export async function exportSingleExpensePdf({ expense, persons, products, expenses }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const getName = (arr, id) => arr.find(x => String(x.id) === String(id))?.name ?? '—';

  const person  = getName(persons,  expense.personId);
  const product = getName(products, expense.productId);
  const dateStr = new Date().toLocaleString('de-DE');

  // ── Kopfbalken ────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PAGE_W, 18, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Buchungssystem  ·  Kostenbeleg', MARGIN, 11.5);

  // ── Titel-Block ───────────────────────────────────────────────────────────
  let y = 28;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_COLOR);
  doc.text(`${person}  ·  ${fmtDate(expense.date)}`, MARGIN, y);

  y += 5;
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Detail-Tabelle ────────────────────────────────────────────────────────
  const predecessorRow = (() => {
    if (!expense.predecessorId) return null;
    const pred = (expenses || []).find(e => String(e.id) === String(expense.predecessorId));
    const label = pred
      ? `${fmtDate(pred.date)}  ·  ${getName(persons, pred.personId)}  ·  ${getName(products, pred.productId)}  ·  ${fmtEuro(pred.amount)}${pred.note ? `  ·  ${pred.note}` : ''}`
      : `ID ${expense.predecessorId} (nicht gefunden)`;
    return ['Vorgänger-Buchung', label];
  })();

  const details = [
    ['Person',       person],
    ['Datum',        fmtDate(expense.date)],
    ['Kostenstelle', product],
    ['Betrag',       fmtAmount(expense.amount, expense.type)],
    ['Typ',          expense.type || 'Ausgabe'],
    ['Zahlungsart',  expense.paymentMethod || '—'],
    ['Notiz',        expense.note || '—'],
    ...(predecessorRow ? [predecessorRow] : []),
    ['Erfasst am',   expense.createdAt ? new Date(expense.createdAt).toLocaleString('de-DE') : '—'],
    ['Zuletzt geändert', expense.updatedAt ? new Date(expense.updatedAt).toLocaleString('de-DE') : '—'],
    ['Integritäts-Hash', expense.hash ? expense.hash.slice(0, 32) + '…' : '—'],
  ];

  autoTable(doc, {
    body: details,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [80, 80, 110], cellWidth: 45, fillColor: HEADER_BG },
      1: { textColor: [30, 30, 30] },
    },
    didParseCell: (data) => {
      // Betrag-Zeile hervorheben
      if (data.row.index === 3 && data.column.index === 1) {
        data.cell.styles.textColor = BRAND_COLOR;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize  = 11;
      }
      // Vorgänger-Buchung hervorheben
      if (data.cell.raw === 'Vorgänger-Buchung' || (predecessorRow && data.row.index === 7)) {
        data.cell.styles.fillColor = [255, 243, 224];
        data.cell.styles.textColor = [180, 90, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Anhänge / Bilder ──────────────────────────────────────────────────────
  const images = (expense.attachments || []).filter(a => a.mimetype?.startsWith('image/'));
  const others  = (expense.attachments || []).filter(a => !a.mimetype?.startsWith('image/'));

  if (images.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text(`Bildanhänge (${images.length})`, MARGIN, y);
    y += 6;

    for (let i = 0; i < images.length; i++) {
      const att = images[i];
      try {
        const base64 = await fetchImageBase64(att.filename);
        const { w: natW, h: natH } = await loadImageSize(base64);

        const maxW = CONTENT_W;
        const maxH = 130;
        const ratio = Math.min(maxW / natW, maxH / natH, 1);
        const drawW = natW * ratio;
        const drawH = natH * ratio;

        if (y + drawH + 12 > doc.internal.pageSize.height - 16) {
          doc.addPage();
          doc.setFillColor(...BRAND_COLOR);
          doc.rect(0, 0, PAGE_W, 8, 'F');
          y = 18;
        }

        // Bild-Rahmen
        doc.setDrawColor(210, 210, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(MARGIN - 1, y - 1, drawW + 2, drawH + 2, 1.5, 1.5, 'S');

        doc.addImage(base64, jsPdfFormat(att.mimetype), MARGIN, y, drawW, drawH);

        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`${i + 1}/${images.length}  ·  ${att.originalName}`, MARGIN, y + drawH + 5);
        y += drawH + 12;
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(180, 60, 60);
        doc.text(`[Bild nicht ladbar: ${att.originalName}]`, MARGIN, y);
        y += 8;
      }
    }
  }

  if (others.length > 0) {
    if (y + 20 > doc.internal.pageSize.height - 16) {
      doc.addPage();
      doc.setFillColor(...BRAND_COLOR);
      doc.rect(0, 0, PAGE_W, 8, 'F');
      y = 18;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text(`Weitere Anhänge (${others.length})`, MARGIN, y);
    y += 6;
    others.forEach(att => {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 80);
      doc.text(`·  ${att.originalName}`, MARGIN + 2, y);
      y += 5.5;
    });
  }

  // ── Fußzeile ──────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Erstellt am ${dateStr}`, MARGIN, doc.internal.pageSize.height - 6);
    doc.text(`Seite ${p} von ${totalPages}`, PAGE_W - MARGIN, doc.internal.pageSize.height - 6, { align: 'right' });
  }

  const safeName = person.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
  doc.save(`beleg_${safeName}_${expense.date ?? 'unbekannt'}.pdf`);
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────
export async function exportExpensesPdf({
  expenses,
  persons,
  products,
  filterDescription,
  onProgress,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const getName  = (arr, id) => arr.find(x => String(x.id) === String(id))?.name ?? '—';
  const totalAmt        = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalEinnahmen  = expenses.reduce((s, e) => (e.type || 'Ausgabe') === 'Einnahme' ? s + parseFloat(e.amount || 0) : s, 0);
  const totalAusgaben   = expenses.reduce((s, e) => (e.type || 'Ausgabe') === 'Ausgabe'  ? s + parseFloat(e.amount || 0) : s, 0);
  const saldo           = totalEinnahmen - totalAusgaben;
  const now      = new Date().toLocaleString('de-DE');

  // ── Titelblock ────────────────────────────────────────────────────────────
  const tableStartY = drawTitleBlock(doc, {
    totalCount:  expenses.length,
    totalAmount: totalAmt,
    filters:     filterDescription || null,
    generatedAt: now,
  });

  // ── Tabelle ───────────────────────────────────────────────────────────────
  const expenseById = new Map(expenses.map(e => [String(e.id), e]));
  const predecessorSet = new Set(expenses.filter(e => e.predecessorId).map(e => String(e.predecessorId)));

  const rows = expenses.map(e => {
    const noteParts = [];
    if (e.predecessorId) {
      const pred = expenseById.get(String(e.predecessorId));
      noteParts.push(pred
        ? `Korrektur von: ${fmtDate(pred.date)} / ${getName(persons, pred.personId)} / ${getName(products, pred.productId)} / ${fmtEuro(pred.amount)}`
        : `Korrektur (Vorgänger-ID: ${e.predecessorId})`
      );
    }
    if (predecessorSet.has(String(e.id))) noteParts.push('(hat Nachfolge-Korrektur)');
    if (e.note) noteParts.push(e.note);
    return [
      fmtDate(e.date),
      getName(persons, e.personId),
      getName(products, e.productId),
      fmtAmount(e.amount, e.type),
      e.type || 'Ausgabe',
      e.paymentMethod || '—',
      noteParts.join('\n'),
      (e.attachments || []).length > 0
        ? `${(e.attachments || []).filter(a => a.mimetype?.startsWith('image/')).length} Bild(er) / ${(e.attachments || []).length} gesamt`
        : '—',
    ];
  });

  autoTable(doc, {
    head: [['Datum', 'Person', 'Kostenstelle', 'Betrag', 'Typ', 'Zahlung', 'Notiz', 'Anhänge']],
    body: rows,
    foot: [
      ['', '', 'Einnahmen', fmtEuro(totalEinnahmen), '', '', '', ''],
      ['', '', 'Ausgaben',  fmtEuro(totalAusgaben),  '', '', '', ''],
      ['', '', 'Saldo',     fmtEuro(saldo),           '', '', '', ''],
    ],
    startY: tableStartY,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize:    8.5,
      cellPadding: 3,
      textColor:   [30, 30, 30],
      lineColor:   [220, 220, 230],
      lineWidth:   0.2,
    },
    headStyles: {
      fillColor:  BRAND_COLOR,
      textColor:  255,
      fontStyle:  'bold',
      fontSize:   8.5,
    },
    footStyles: {
      fillColor: FOOTER_BG,
      textColor: [50, 50, 80],
      fontStyle: 'bold',
      fontSize:  9,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 20 },   // Datum
      1: { cellWidth: 26 },   // Person
      2: { cellWidth: 30 },   // Kostenstelle
      3: { cellWidth: 22, halign: 'right' }, // Betrag
      4: { cellWidth: 20 },   // Typ
      5: { cellWidth: 20 },   // Zahlung
      6: { cellWidth: 'auto' }, // Notiz
      7: { cellWidth: 24 },   // Anhänge
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const exp = expenses[data.row.index];
      if (exp?.predecessorId) {
        data.cell.styles.fillColor = [255, 248, 225];
        if (data.column.index === 6) {
          data.cell.styles.textColor = [140, 90, 0];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    },
    didDrawPage: () => {
      // Schmaler Balken oben auf jeder neuen Seite
      doc.setFillColor(...BRAND_COLOR);
      doc.rect(0, 0, PAGE_W, 8, 'F');
    },
  });

  // ── Bild-Detailseiten ─────────────────────────────────────────────────────
  const withImages = expenses.filter(e =>
    (e.attachments || []).some(a => a.mimetype?.startsWith('image/'))
  );

  let processed = 0;
  for (const expense of withImages) {
    const images = (expense.attachments || []).filter(a => a.mimetype?.startsWith('image/'));
    doc.addPage();

    // Seitenbalken
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, PAGE_W, 8, 'F');

    let y = 18;

    // Expense-Info-Header
    doc.setFillColor(...HEADER_BG);
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, 24, 2, 2, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLOR);
    doc.text(
      `${getName(persons, expense.personId)}  ·  ${fmtDate(expense.date)}`,
      MARGIN + 4, y + 3
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 80);
    doc.text(
      `Kostenstelle: ${getName(products, expense.productId)}   |   Betrag: ${fmtEuro(expense.amount)}   |   Zahlung: ${expense.paymentMethod || '—'}`,
      MARGIN + 4, y + 9
    );
    if (expense.note) {
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Notiz: ${expense.note}`, MARGIN + 4, y + 15);
    }

    y += 30;

    // Bilder
    for (let idx = 0; idx < images.length; idx++) {
      const att = images[idx];
      try {
        onProgress?.(`Lade Bild ${++processed}/${withImages.reduce((s, e) => s + (e.attachments || []).filter(a => a.mimetype?.startsWith('image/')).length, 0)}…`);

        const base64 = await fetchImageBase64(att.filename);
        const { w: natW, h: natH } = await loadImageSize(base64);

        // Skalieren auf max. Contentbreite / max. 120mm Höhe
        const maxW = CONTENT_W;
        const maxH = 120;
        const ratio = Math.min(maxW / natW, maxH / natH, 1);
        const drawW = natW * ratio;
        const drawH = natH * ratio;

        // Neue Seite wenn nicht mehr genug Platz
        if (y + drawH + 14 > doc.internal.pageSize.height - 14) {
          doc.addPage();
          doc.setFillColor(...BRAND_COLOR);
          doc.rect(0, 0, PAGE_W, 8, 'F');
          y = 18;
        }

        // Bild zeichnen
        doc.addImage(base64, jsPdfFormat(att.mimetype), MARGIN, y, drawW, drawH);

        // Bildunterschrift
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(
          `${idx + 1}/${images.length}  ·  ${att.originalName}`,
          MARGIN, y + drawH + 4
        );

        y += drawH + 12;
      } catch (err) {
        console.warn('Bild übersprungen:', att.filename, err.message);
        doc.setFontSize(8);
        doc.setTextColor(180, 60, 60);
        doc.text(`[Bild konnte nicht geladen werden: ${att.originalName}]`, MARGIN, y);
        y += 8;
      }
    }

    processed++;
  }

  // Seitennummern + Fußzeile auf allen Seiten
  drawPageHeader(doc);

  // Datei speichern
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`kosten-dokumentation-${dateStr}.pdf`);
}
