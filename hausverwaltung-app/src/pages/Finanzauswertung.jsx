import { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableRow,
  ToggleButtonGroup, ToggleButton, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { productsApi, expensesApi } from '../api';
import { fmtEuro } from '../utils/format';

const MONTH_NAMES = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTH_NUMS  = ['01','02','03','04','05','06','07','08','09','10','11','12'];

const amt  = e  => parseFloat(e.amount || 0);
const sumA = arr => arr.reduce((s, e) => s + amt(e), 0);
const expType = e => e.type || 'Ausgabe';

function getPeriodLabel(period, year) {
  if (period === 'year') return `Gesamtjahr ${year}`;
  if (period === 'q1')   return `Q1 (Jan–Mär) ${year}`;
  if (period === 'q2')   return `Q2 (Apr–Jun) ${year}`;
  if (period === 'q3')   return `Q3 (Jul–Sep) ${year}`;
  if (period === 'q4')   return `Q4 (Okt–Dez) ${year}`;
  const mIdx = MONTH_NUMS.indexOf(period);
  return mIdx >= 0 ? `${MONTH_NAMES[mIdx]} ${year}` : String(year);
}

function filterByPeriod(expenses, year, period) {
  return expenses.filter(e => {
    if (!e.date?.startsWith(String(year))) return false;
    if (period === 'year') return true;
    const mo = e.date.slice(5, 7);
    const m0 = parseInt(mo, 10) - 1;
    if (period === 'q1') return m0 <= 2;
    if (period === 'q2') return m0 >= 3 && m0 <= 5;
    if (period === 'q3') return m0 >= 6 && m0 <= 8;
    if (period === 'q4') return m0 >= 9;
    return mo === period;
  });
}

// ── Custom Chart-Tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 1.5 }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption" sx={{ color: '#e2e8f0' }}>{p.name}: </Typography>
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>{fmtEuro(p.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {label}
          </Typography>
          <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}22` }}>
            <Icon sx={{ fontSize: 18, color }} />
          </Box>
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5, color }}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

// ── GuV-Tabelle ────────────────────────────────────────────────────────────────
function GuVTable({ expenses, products, label }) {
  const einnahmen = expenses.filter(e => expType(e) === 'Einnahme');
  const ausgaben  = expenses.filter(e => expType(e) === 'Ausgabe');

  const byProduct = (list) => {
    const map = {};
    list.forEach(e => {
      const name = products.find(p => String(p.id) === String(e.productId))?.name || 'Sonstige';
      map[name] = (map[name] || 0) + amt(e);
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  };

  const einnahmenRows = byProduct(einnahmen);
  const ausgabenRows  = byProduct(ausgaben);
  const totalE   = sumA(einnahmen);
  const totalA   = sumA(ausgaben);
  const ergebnis = totalE - totalA;

  const SectionHeader = ({ children }) => (
    <TableRow sx={{ bgcolor: '#f8fafc' }}>
      <TableCell colSpan={2} sx={{
        fontWeight: 700, fontSize: '0.78rem', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: 0.8, py: 1,
        borderTop: '1px solid', borderTopColor: 'divider',
      }}>
        {children}
      </TableCell>
    </TableRow>
  );

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        avatar={<ReceiptLongIcon sx={{ color: '#6366f1' }} />}
        title="Gewinn- und Verlustrechnung (GuV)"
        subheader={label}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableBody>

            {/* I. Erträge */}
            <SectionHeader>I. Erträge (Einnahmen)</SectionHeader>
            {einnahmenRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ pl: 4, color: 'text.disabled', fontSize: '0.8rem', fontStyle: 'italic', py: 1 }}>
                  Keine Einnahmen im Zeitraum
                </TableCell>
              </TableRow>
            ) : einnahmenRows.map(([name, val]) => (
              <TableRow key={name} hover>
                <TableCell sx={{ pl: 4, fontSize: '0.82rem' }}>{name}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{fmtEuro(val)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#f0fdf4' }}>
              <TableCell sx={{ pl: 2, fontWeight: 700, fontSize: '0.875rem', color: '#15803d',
                borderTop: '2px solid', borderTopColor: 'divider' }}>
                Summe Erträge
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.925rem', color: '#15803d',
                borderTop: '2px solid', borderTopColor: 'divider' }}>
                {fmtEuro(totalE)}
              </TableCell>
            </TableRow>

            {/* II. Aufwendungen */}
            <SectionHeader>II. Aufwendungen (Ausgaben)</SectionHeader>
            {ausgabenRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} sx={{ pl: 4, color: 'text.disabled', fontSize: '0.8rem', fontStyle: 'italic', py: 1 }}>
                  Keine Ausgaben im Zeitraum
                </TableCell>
              </TableRow>
            ) : ausgabenRows.map(([name, val]) => (
              <TableRow key={name} hover>
                <TableCell sx={{ pl: 4, fontSize: '0.82rem' }}>{name}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{fmtEuro(val)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#fff5f5' }}>
              <TableCell sx={{ pl: 2, fontWeight: 700, fontSize: '0.875rem', color: '#dc2626',
                borderTop: '2px solid', borderTopColor: 'divider' }}>
                Summe Aufwendungen
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.925rem', color: '#dc2626',
                borderTop: '2px solid', borderTopColor: 'divider' }}>
                {fmtEuro(totalA)}
              </TableCell>
            </TableRow>

            {/* III. Ergebnis */}
            <TableRow sx={{ bgcolor: ergebnis >= 0 ? '#f0fdf4' : '#fff5f5' }}>
              <TableCell sx={{
                pl: 2, fontWeight: 800, fontSize: '0.95rem',
                color: ergebnis >= 0 ? '#15803d' : '#dc2626',
                borderTop: '3px double', borderTopColor: 'grey.400', py: 1.5,
              }}>
                {ergebnis >= 0 ? 'III. Jahresüberschuss' : 'III. Jahresfehlbetrag'}
              </TableCell>
              <TableCell align="right" sx={{
                fontWeight: 800, fontSize: '1.05rem',
                color: ergebnis >= 0 ? '#15803d' : '#dc2626',
                borderTop: '3px double', borderTopColor: 'grey.400', py: 1.5,
              }}>
                {fmtEuro(Math.abs(ergebnis))}
              </TableCell>
            </TableRow>

          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ── Bilanz ─────────────────────────────────────────────────────────────────────
function BilanzTable({ expenses, label }) {
  const totalE       = sumA(expenses.filter(e => expType(e) === 'Einnahme'));
  const totalA       = sumA(expenses.filter(e => expType(e) === 'Ausgabe'));
  const eigenkapital = totalE - totalA;
  const balanced     = Math.abs(totalE - (totalA + eigenkapital)) < 0.005;

  const cs = { fontSize: '0.82rem', py: 0.8 };

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        avatar={<AccountBalanceIcon sx={{ color: '#6366f1' }} />}
        title="Bilanz (vereinfacht)"
        subheader={label}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* AKTIVA */}
        <Box sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
          <Box px={2} py={1} sx={{ bgcolor: '#f0fdf4', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
            <Typography variant="caption" fontWeight={700} color="success.dark"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Aktiva
            </Typography>
          </Box>
          <Table size="small">
            <TableBody>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: 0.7, py: 0.75 }}>
                  Umlaufvermögen
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ pl: 3, ...cs }}>Zuflüsse (Einnahmen)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main', ...cs }}>
                  {fmtEuro(totalE)}
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#f0fdf4' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem',
                  borderTop: '2px solid', borderTopColor: 'divider', py: 1.25 }}>
                  Summe Aktiva
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'success.dark',
                  borderTop: '2px solid', borderTopColor: 'divider', py: 1.25 }}>
                  {fmtEuro(totalE)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {/* PASSIVA */}
        <Box>
          <Box px={2} py={1} sx={{ bgcolor: '#fff5f5', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
            <Typography variant="caption" fontWeight={700} color="error.dark"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Passiva
            </Typography>
          </Box>
          <Table size="small">
            <TableBody>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: 0.7, py: 0.75 }}>
                  Verbindlichkeiten
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ pl: 3, ...cs }}>Abflüsse (Ausgaben)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main', ...cs }}>
                  {fmtEuro(totalA)}
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: 0.7, py: 0.75,
                  borderTop: '1px solid', borderTopColor: 'divider' }}>
                  Eigenkapital
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ pl: 3, ...cs }}>
                  {eigenkapital >= 0 ? 'Jahresüberschuss' : 'Jahresfehlbetrag'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, ...cs,
                  color: eigenkapital >= 0 ? 'success.main' : 'error.main' }}>
                  {fmtEuro(eigenkapital)}
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff5f5' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem',
                  borderTop: '2px solid', borderTopColor: 'divider', py: 1.25 }}>
                  Summe Passiva
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'error.dark',
                  borderTop: '2px solid', borderTopColor: 'divider', py: 1.25 }}>
                  {fmtEuro(totalA + eigenkapital)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Bilanz-Check */}
      <Box px={2} py={1.5} display="flex" alignItems="center" gap={1}
        sx={{ bgcolor: '#f8fafc', borderTop: '2px solid', borderTopColor: 'divider' }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: balanced ? 'success.main' : 'warning.main' }} />
        <Typography variant="caption" fontWeight={700} color={balanced ? 'success.dark' : 'warning.dark'}>
          {balanced ? 'Bilanz ausgeglichen — Aktiva = Passiva' : 'Geringfügige Rundungsdifferenz'}
        </Typography>
        <Box flex={1} />
        <Typography variant="caption" color="text.secondary">
          {fmtEuro(totalE)} = {fmtEuro(totalA + eigenkapital)}
        </Typography>
      </Box>
    </Card>
  );
}

// ── Monatliche Entwicklung ─────────────────────────────────────────────────────
function MonatsChart({ expenses, year }) {
  const data = useMemo(() => {
    let kumuliert = 0;
    return MONTH_NAMES.map((name, i) => {
      const mo  = String(i + 1).padStart(2, '0');
      const moExp = expenses.filter(e => e.date?.startsWith(`${year}-${mo}`));
      const einnahmen = sumA(moExp.filter(e => expType(e) === 'Einnahme'));
      const ausgaben  = sumA(moExp.filter(e => expType(e) === 'Ausgabe'));
      kumuliert += einnahmen - ausgaben;
      return {
        name,
        Einnahmen:    parseFloat(einnahmen.toFixed(2)),
        Ausgaben:     parseFloat(ausgaben.toFixed(2)),
        'Kum. Saldo': parseFloat(kumuliert.toFixed(2)),
      };
    });
  }, [expenses, year]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mt: 3 }}>
      <CardHeader
        title="Monatliche Entwicklung"
        subheader={`Einnahmen, Ausgaben und kumulierter Saldo — ${year}`}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bar" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
            <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 11 }} axisLine={false}
              tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <ReferenceLine yAxisId="line" y={0} stroke="#94a3b8" strokeDasharray="4 2" />
            <Bar yAxisId="bar" dataKey="Einnahmen" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar yAxisId="bar" dataKey="Ausgaben"  fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line yAxisId="line" type="monotone" dataKey="Kum. Saldo" stroke="#6366f1"
              strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Hauptseite ─────────────────────────────────────────────────────────────────
export default function Finanzauswertung() {
  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const currentYear = new Date().getFullYear();
  const [year,   setYear]   = useState(currentYear);
  const [period, setPeriod] = useState('year');

  useEffect(() => {
    Promise.all([productsApi.getAll(), expensesApi.getAll()])
      .then(([pr, e]) => { setProducts(pr); setExpenses(e); })
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => e.date?.slice(0, 4)).filter(Boolean).map(Number));
    years.add(currentYear);
    years.add(currentYear - 1);
    return [...years].sort((a, b) => b - a);
  }, [expenses, currentYear]);

  // Aktive Buchungen: ohne Stornos und ohne stornierte Originale
  const activeExpenses = useMemo(() => {
    const stornoIds = new Set(
      expenses.filter(e => e.storno && e.predecessorId).map(e => String(e.predecessorId))
    );
    return expenses.filter(e => !e.storno && !stornoIds.has(String(e.id)));
  }, [expenses]);

  const periodExpenses = useMemo(
    () => filterByPeriod(activeExpenses, year, period),
    [activeExpenses, year, period],
  );

  const totalE   = useMemo(() => sumA(periodExpenses.filter(e => expType(e) === 'Einnahme')), [periodExpenses]);
  const totalA   = useMemo(() => sumA(periodExpenses.filter(e => expType(e) === 'Ausgabe')),  [periodExpenses]);
  const ergebnis = totalE - totalA;
  const label    = getPeriodLabel(period, year);

  const nEinnahmen = periodExpenses.filter(e => expType(e) === 'Einnahme').length;
  const nAusgaben  = periodExpenses.filter(e => expType(e) === 'Ausgabe').length;

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      {/* Header + Steuerung */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Bilanz & GuV</Typography>
          <Typography variant="body2" color="text.secondary">
            Automatische Finanzauswertung auf Basis des Buchungsstands
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <ToggleButtonGroup value={year} exclusive onChange={(_, v) => v && setYear(v)} size="small"
              sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: 13, fontWeight: 600 } }}>
              {availableYears.map(y => <ToggleButton key={y} value={y}>{y}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Zeitraum</InputLabel>
            <Select value={period} onChange={e => setPeriod(e.target.value)} label="Zeitraum">
              <MenuItem value="year">Gesamtjahr</MenuItem>
              <MenuItem value="q1">Q1 (Jan–Mär)</MenuItem>
              <MenuItem value="q2">Q2 (Apr–Jun)</MenuItem>
              <MenuItem value="q3">Q3 (Jul–Sep)</MenuItem>
              <MenuItem value="q4">Q4 (Okt–Dez)</MenuItem>
              <Divider />
              {MONTH_NAMES.map((m, i) => (
                <MenuItem key={m} value={MONTH_NUMS[i]}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        <KpiCard
          label="Einnahmen"
          value={fmtEuro(totalE)}
          icon={TrendingUpIcon}
          color="#16a34a"
          sub={`${nEinnahmen} Buchung${nEinnahmen !== 1 ? 'en' : ''}`}
        />
        <KpiCard
          label="Ausgaben"
          value={fmtEuro(totalA)}
          icon={TrendingDownIcon}
          color="#dc2626"
          sub={`${nAusgaben} Buchung${nAusgaben !== 1 ? 'en' : ''}`}
        />
        <KpiCard
          label={ergebnis >= 0 ? 'Jahresüberschuss' : 'Jahresfehlbetrag'}
          value={fmtEuro(Math.abs(ergebnis))}
          icon={ergebnis >= 0 ? TrendingUpIcon : TrendingDownIcon}
          color={ergebnis >= 0 ? '#6366f1' : '#dc2626'}
          sub={label}
        />
      </Box>

      {/* GuV + Bilanz nebeneinander (auf großen Screens) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 3 }}>
        <GuVTable expenses={periodExpenses} products={products} label={label} />
        <BilanzTable expenses={periodExpenses} label={label} />
      </Box>

      {/* Monatschart — immer für das ganze Jahr */}
      <MonatsChart expenses={activeExpenses} year={year} />
    </Box>
  );
}
