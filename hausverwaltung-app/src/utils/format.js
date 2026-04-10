const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/**
 * Formatiert einen Zahlenwert als Euro-Betrag nach deutschem Standard.
 * Beispiel: 1234.5 → "1.234,50 €"
 */
export const fmtEuro = (value) => euroFormatter.format(Number(value) || 0);

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) als dd.mm.yyyy.
 * Beispiel: "2026-04-10" → "10.04.2026"
 * Kein Date-Objekt → keine Timezone-Verschiebung.
 */
export const fmtDate = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};