import { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, ToggleButtonGroup, ToggleButton, CircularProgress, Paper,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EuroIcon from '@mui/icons-material/Euro';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie,
} from 'recharts';
import { personsApi, productsApi, expensesApi } from '../api';
import { fmtEuro, fmtDate } from '../utils/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
const sum = (arr) => arr.reduce((s, v) => s + parseFloat(v || 0), 0);
const amt = (e) => parseFloat(e.amount || 0);

function toMonthKey(date) {
  return date?.slice(0, 7); // YYYY-MM
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption" sx={{ color: '#e2e8f0' }}>{p.name}: </Typography>
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>
            {formatter ? formatter(p.value) : fmtEuro(p.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── KPI Karte ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend, trendLabel }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {label}
          </Typography>
          <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}18` }}>
            <Icon sx={{ fontSize: 18, color }} />
          </Box>
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5, color }}>
          {value}
        </Typography>
        {(sub || trendLabel) && (
          <Box display="flex" alignItems="center" gap={0.5}>
            {trend !== undefined && (
              trend >= 0
                ? <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} />
                : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />
            )}
            <Typography variant="caption" color="text.secondary">{trendLabel || sub}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Jahresvergleich ───────────────────────────────────────────────────────────
function JahresvergleichChart({ expenses, year }) {
  const data = useMemo(() => {
    const prevYear = year - 1;
    return MONTH_NAMES.map((name, i) => {
      const mo = String(i + 1).padStart(2, '0');
      const curr = sum(expenses.filter(e => e.date?.startsWith(`${year}-${mo}`)).map(amt));
      const prev = sum(expenses.filter(e => e.date?.startsWith(`${prevYear}-${mo}`)).map(amt));
      return { name, [year]: parseFloat(curr.toFixed(2)), [prevYear]: parseFloat(prev.toFixed(2)) };
    });
  }, [expenses, year]);

  const prevYear = year - 1;
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Jahresvergleich"
        subheader={`${year} vs. ${prevYear} — Ausgaben pro Monat`}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
            <Tooltip content={<DarkTooltip />} />
            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey={String(year)} name={String(year)} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey={String(prevYear)} name={String(prevYear)} fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Personen pro Monat (gestapelt) ────────────────────────────────────────────
function PersonenMonatsChart({ expenses, persons, year }) {
  const data = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const mo = String(i + 1).padStart(2, '0');
      const row = { name };
      persons.forEach(p => {
        row[p.name] = parseFloat(
          sum(expenses.filter(e => e.date?.startsWith(`${year}-${mo}`) && String(e.personId) === String(p.id)).map(amt)).toFixed(2)
        );
      });
      return row;
    });
  }, [expenses, persons, year]);

  const active = useMemo(() =>
    persons.filter(p => expenses.some(e => e.date?.startsWith(String(year)) && String(e.personId) === String(p.id))),
    [persons, expenses, year]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Ausgaben je Person (monatlich)"
        subheader="Gestapelte Darstellung – wer hat wie viel beigetragen"
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        {active.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={240}>
            <Typography variant="caption" color="text.disabled">Keine Daten für dieses Jahr</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
              <Tooltip content={<DarkTooltip />} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {active.map((p, i) => (
                <Bar key={p.id} dataKey={p.name} stackId="a" fill={p.color || COLORS[i % COLORS.length]} maxBarSize={36} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Kostenstellen-Verlauf ─────────────────────────────────────────────────────
function KostenstellenVerlaufChart({ expenses, products, year }) {
  const topCategories = useMemo(() => {
    const map = {};
    expenses.filter(e => e.date?.startsWith(String(year))).forEach(e => {
      const cat = products.find(p => String(p.id) === String(e.productId))?.name || 'Sonstige';
      map[cat] = (map[cat] || 0) + amt(e);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  }, [expenses, products, year]);

  const data = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const mo = String(i + 1).padStart(2, '0');
      const row = { name };
      topCategories.forEach(cat => {
        row[cat] = parseFloat(
          sum(expenses.filter(e => {
            const prod = products.find(p => String(p.id) === String(e.productId));
            return e.date?.startsWith(`${year}-${mo}`) && (prod?.name || 'Sonstige') === cat;
          }).map(amt)).toFixed(2)
        );
      });
      return row;
    });
  }, [expenses, products, year, topCategories]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Kostenstellen-Entwicklung"
        subheader={`Top 5 Kostenstellen im Verlauf – ${year}`}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        {topCategories.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={240}>
            <Typography variant="caption" color="text.disabled">Keine Daten für dieses Jahr</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtEuro(v)} width={72} />
              <Tooltip content={<DarkTooltip />} />
              <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {topCategories.map((cat, i) => (
                <Line
                  key={cat} dataKey={cat} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
                  activeDot={{ r: 5 }} type="monotone" connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Zahlungsart nach Betrag ───────────────────────────────────────────────────
function ZahlungsartChart({ expenses, year }) {
  const data = useMemo(() => {
    const map = {};
    expenses.filter(e => e.date?.startsWith(String(year))).forEach(e => {
      const m = e.paymentMethod || 'Unbekannt';
      if (!map[m]) map[m] = { betrag: 0, anzahl: 0 };
      map[m].betrag += amt(e);
      map[m].anzahl += 1;
    });
    return Object.entries(map).map(([name, v]) => ({
      name, betrag: parseFloat(v.betrag.toFixed(2)), anzahl: v.anzahl,
    })).sort((a, b) => b.betrag - a.betrag);
  }, [expenses, year]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Zahlungsarten – Betrag & Häufigkeit"
        subheader="Gesamtbetrag und Anzahl pro Zahlungsart"
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        {data.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height={200}>
            <Typography variant="caption" color="text.disabled">Keine Daten</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="betrag" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtEuro(v)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={1.5}>
              {data.map((d, i) => (
                <Box key={d.name}>
                  <Box display="flex" justifyContent="space-between" mb={0.4}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                      <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{d.anzahl}×</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 2.25 }}>{fmtEuro(d.betrag)}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Wochentag-Analyse ─────────────────────────────────────────────────────────
function WochentagChart({ expenses, year }) {
  const data = useMemo(() => {
    const map = Array(7).fill(null).map((_, i) => ({ name: WEEKDAY_NAMES[i], betrag: 0, anzahl: 0 }));
    expenses.filter(e => e.date?.startsWith(String(year))).forEach(e => {
      if (!e.date) return;
      const [y, m, d] = e.date.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      map[dow].betrag += amt(e);
      map[dow].anzahl += 1;
    });
    // Start with Montag
    const reordered = [...map.slice(1), map[0]];
    return reordered.map(d => ({ ...d, betrag: parseFloat(d.betrag.toFixed(2)) }));
  }, [expenses, year]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Ausgaben nach Wochentag"
        subheader="Gesamtbetrag pro Wochentag"
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <CardContent sx={{ pt: 2 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={n => n.slice(0, 2)} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtEuro(v)} width={72} />
            <Tooltip content={<DarkTooltip />} />
            <Bar dataKey="betrag" name="Betrag" radius={[5, 5, 0, 0]} maxBarSize={42}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Top-10 Ausgaben ───────────────────────────────────────────────────────────
function Top10Table({ expenses, persons, products, year }) {
  const top10 = useMemo(() =>
    [...expenses]
      .filter(e => e.date?.startsWith(String(year)))
      .sort((a, b) => amt(b) - amt(a))
      .slice(0, 10),
    [expenses, year]);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardHeader
        title="Top 10 Buchungen"
        subheader={`Höchste Einzelbuchungen in ${year}`}
        titleTypographyProps={{ fontWeight: 'bold', variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50', fontSize: 12 } }}>
              <TableCell sx={{ width: 32 }}>#</TableCell>
              <TableCell>Datum</TableCell>
              <TableCell>Person</TableCell>
              <TableCell>Kostenstelle</TableCell>
              <TableCell>Zahlungsart</TableCell>
              <TableCell align="right">Betrag</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {top10.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  Keine Daten für dieses Jahr
                </TableCell>
              </TableRow>
            ) : top10.map((e, i) => {
              const person = persons.find(p => String(p.id) === String(e.personId));
              const product = products.find(p => String(p.id) === String(e.productId));
              return (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography variant="caption" color="text.disabled" fontWeight={700}>#{i + 1}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtDate(e.date)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: person?.color || '#6366f1' }}>
                        {person?.name?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Typography variant="caption">{person?.name || '—'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{product?.name || '—'}</TableCell>
                  <TableCell>
                    <Chip label={e.paymentMethod || '—'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#6366f1' }}>
                      {fmtEuro(e.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  useEffect(() => {
    Promise.all([personsApi.getAll(), productsApi.getAll(), expensesApi.getAll()])
      .then(([p, pr, e]) => { setPersons(p); setProducts(pr); setExpenses(e); })
      .finally(() => setLoading(false));
  }, []);

  // Verfügbare Jahre aus den Daten
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => e.date?.slice(0, 4)).filter(Boolean).map(Number));
    years.add(currentYear);
    years.add(currentYear - 1);
    return [...years].sort((a, b) => b - a);
  }, [expenses, currentYear]);

  // KPIs für gewähltes Jahr
  const yearExpenses = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(String(year))),
    [expenses, year]);

  const prevYearExpenses = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(String(year - 1))),
    [expenses, year]);

  const totalYear = useMemo(() => sum(yearExpenses.map(amt)), [yearExpenses]);
  const totalPrevYear = useMemo(() => sum(prevYearExpenses.map(amt)), [prevYearExpenses]);
  const avgPerMonth = totalYear / 12;
  const maxExpense = useMemo(() => yearExpenses.length ? Math.max(...yearExpenses.map(amt)) : 0, [yearExpenses]);
  const yearTrend = totalPrevYear > 0 ? ((totalYear - totalPrevYear) / totalPrevYear * 100) : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Analytics</Typography>
          <Typography variant="body2" color="text.secondary">Detaillierte Auswertungen und Trends</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>Jahr:</Typography>
          <ToggleButtonGroup
            value={year}
            exclusive
            onChange={(_, v) => v && setYear(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: 13, fontWeight: 600 } }}
          >
            {availableYears.map(y => (
              <ToggleButton key={y} value={y}>{y}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <StatCard
          label="Gesamtausgaben"
          value={fmtEuro(totalYear)}
          icon={EuroIcon}
          color="#6366f1"
          trend={yearTrend}
          trendLabel={yearTrend !== null
            ? `${yearTrend >= 0 ? '+' : ''}${yearTrend.toFixed(1)}% ggü. ${year - 1}`
            : `Kein Vorjahresvergleich`}
        />
        <StatCard
          label="Ø pro Monat"
          value={fmtEuro(avgPerMonth)}
          icon={QueryStatsIcon}
          color="#06b6d4"
          sub={`${yearExpenses.length} Buchungen gesamt`}
        />
        <StatCard
          label="Anzahl Buchungen"
          value={yearExpenses.length}
          icon={ReceiptLongIcon}
          color="#10b981"
          sub={yearExpenses.length > 0 ? `Ø ${fmtEuro(totalYear / yearExpenses.length)} pro Buchung` : '—'}
        />
        <StatCard
          label="Größte Buchung"
          value={fmtEuro(maxExpense)}
          icon={TrendingUpIcon}
          color="#f59e0b"
          sub={maxExpense > 0 ? `${((maxExpense / totalYear) * 100).toFixed(1)}% des Jahresbetrags` : '—'}
        />
      </Box>

      {/* Jahresvergleich – volle Breite */}
      <Box mb={3}>
        <JahresvergleichChart expenses={expenses} year={year} />
      </Box>

      {/* Personen + Zahlungsarten */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 3, mb: 3 }}>
        <PersonenMonatsChart expenses={expenses} persons={persons} year={year} />
        <ZahlungsartChart expenses={expenses} year={year} />
      </Box>

      {/* Kostenstellen-Verlauf – volle Breite */}
      <Box mb={3}>
        <KostenstellenVerlaufChart expenses={expenses} products={products} year={year} />
      </Box>

      {/* Wochentag + Top 10 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, gap: 3 }}>
        <WochentagChart expenses={expenses} year={year} />
        <Top10Table expenses={expenses} persons={persons} products={products} year={year} />
      </Box>
    </Box>
  );
}
