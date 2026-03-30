import { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Paper, Chip, Avatar, Stack, Tabs, Tab } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EuroIcon from '@mui/icons-material/Euro';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import BarChartIcon from '@mui/icons-material/BarChart';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { personsApi, productsApi, expensesApi } from '../api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// ── KPI Karte ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, Icon, gradient, trend }) {
  const isPositive = trend > 0;
  return (
    <Card elevation={0} sx={{ background: gradient, borderRadius: 3, overflow: 'hidden', position: 'relative', color: '#fff', minHeight: 130 }}>
      <Box sx={{ position: 'absolute', right: -18, top: -18, width: 100, height: 100, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <Box sx={{ position: 'absolute', right: 20, bottom: -30, width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <CardContent sx={{ p: 2.5, position: 'relative' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {label}
          </Typography>
          <Box sx={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1.5, p: 0.75 }}>
            <Icon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1.5, mb: 0.5, color: '#fff' }}>{value}</Typography>
        {(sub || trend !== undefined) && (
          <Box display="flex" alignItems="center" gap={0.5}>
            {trend !== undefined && (
              <>
                {isPositive
                  ? <TrendingUpIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }} />
                  : <TrendingDownIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }} />}
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {isPositive ? '+' : ''}{trend.toFixed(0)} € ggü. Vormonat
                </Typography>
              </>
            )}
            {sub && !trend && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>{sub}</Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 1.5, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} variant="body2" sx={{ color: p.color || '#fff', fontWeight: 600 }}>
          {typeof p.value === 'number' ? `${p.value.toFixed(2)} €` : p.value}
        </Typography>
      ))}
    </Box>
  );
}

// ── Tab-Inhalte ───────────────────────────────────────────────────────────────
function TabMonatsverlauf({ monthlyData }) {
  return (
    <Box p={3}>
      <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>Monatsverlauf</Typography>
      <Typography variant="caption" color="text.secondary">Ausgaben der letzten 8 Monate</Typography>
      <Box mt={2}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v} €`} width={65} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5}
              fill="url(#areaGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#6366f1' }} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

function TabPersonen({ perPersonData }) {
  return (
    <Box p={3}>
      <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>Ausgaben je Person</Typography>
      <Typography variant="caption" color="text.secondary">Anteil der Gesamtausgaben in €</Typography>
      {perPersonData.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" height={280}>
          <Typography variant="caption" color="text.disabled">Keine Daten vorhanden</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={perPersonData} dataKey="value" nameKey="name"
              cx="50%" cy="48%" innerRadius={70} outerRadius={110} paddingAngle={3}>
              {perPersonData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v.toFixed(2)} €`} contentStyle={{
              backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff'
            }} />
            <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}

function TabKostenstellen({ perKostenstelleData, paymentData }) {
  return (
    <Box p={3}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>Top Kostenstellen</Typography>
          <Typography variant="caption" color="text.secondary">Ausgaben nach Kategorie</Typography>
          <Box mt={2}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perKostenstelleData} layout="vertical" margin={{ top: 0, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v} €`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {perKostenstelleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>Zahlungsarten</Typography>
          <Typography variant="caption" color="text.secondary">Verteilung nach Anzahl</Typography>
          <Box mt={2}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {paymentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={0.75} mt={1}>
              {paymentData.map((p, i) => (
                <Box key={p.name} display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <Typography variant="caption">{p.name}</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight="bold">{p.value}×</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </div>
    </Box>
  );
}

function TabRanking({ topPersons, totalAmount, recentExpenses, persons, products }) {
  return (
    <Box p={3}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
        {/* Personen Ranking */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>Personen Ranking</Typography>
          <Stack spacing={2}>
            {topPersons.map((p, i) => {
              const pct = totalAmount > 0 ? (p.value / totalAmount) * 100 : 0;
              return (
                <Box key={p.name}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="text.disabled" sx={{ minWidth: 20, fontWeight: 'bold' }}>#{i + 1}</Typography>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 'bold', backgroundColor: p.color }}>
                        {p.name[0]?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight="medium">{p.name}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Typography variant="caption" color="text.secondary">{pct.toFixed(1)}%</Typography>
                      <Typography variant="body2" fontWeight="bold">{p.value.toFixed(2)} €</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: p.color, transition: 'width 0.8s ease' }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Letzte Buchungen */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>Letzte Buchungen</Typography>
          <Stack spacing={1.5}>
            {recentExpenses.length === 0 ? (
              <Typography variant="caption" color="text.disabled">Keine Daten</Typography>
            ) : recentExpenses.map(exp => {
              const person = persons.find(p => String(p.id) === String(exp.personId));
              const product = products.find(p => String(p.id) === String(exp.productId));
              return (
                <Box key={exp.id} display="flex" alignItems="center" gap={1.5}
                  sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', '&:hover': { backgroundColor: 'action.hover' } }}>
                  <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 'bold', backgroundColor: person?.color || '#6366f1', flexShrink: 0 }}>
                    {person?.name?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="caption" fontWeight="bold" noWrap display="block">{product?.name || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">{person?.name || '—'} · {exp.date}</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#6366f1', whiteSpace: 'nowrap' }}>
                    {parseFloat(exp.amount).toFixed(2)} €
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </div>
    </Box>
  );
}

// ── Haupt-Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    Promise.all([personsApi.getAll(), productsApi.getAll(), expensesApi.getAll()])
      .then(([p, pr, e]) => { setPersons(p); setProducts(pr); setExpenses(e); });
  }, []);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0), [expenses]);

  const thisMonthTotal = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(thisMonth)).reduce((s, e) => s + parseFloat(e.amount || 0), 0),
    [expenses, thisMonth]);

  const lastMonthTotal = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(lastMonth)).reduce((s, e) => s + parseFloat(e.amount || 0), 0),
    [expenses, lastMonth]);

  const trend = thisMonthTotal - lastMonthTotal;

  const monthlyData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        name: MONTH_NAMES[d.getMonth()],
        total: parseFloat(expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + parseFloat(e.amount || 0), 0).toFixed(2)),
      };
    });
  }, [expenses]);

  const perPersonData = useMemo(() =>
    persons.map(p => ({
      name: p.name,
      value: parseFloat(expenses.filter(e => String(e.personId) === String(p.id)).reduce((s, e) => s + parseFloat(e.amount || 0), 0).toFixed(2)),
      color: p.color || CHART_COLORS[0],
    })).filter(p => p.value > 0),
    [expenses, persons]);

  const perKostenstelleData = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const key = products.find(p => String(p.id) === String(exp.productId))?.category || 'Sonstige';
      map[key] = (map[key] || 0) + parseFloat(exp.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [expenses, products]);

  const paymentData = useMemo(() => {
    const map = {};
    expenses.forEach(e => { map[e.paymentMethod] = (map[e.paymentMethod] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const recentExpenses = useMemo(() =>
    [...expenses].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 5),
    [expenses]);

  const topPersons = useMemo(() => [...perPersonData].sort((a, b) => b.value - a.value), [perPersonData]);

  const isEmpty = expenses.length === 0;

  const TABS = [
    { label: 'Monatsverlauf', icon: <ShowChartIcon sx={{ fontSize: 16 }} /> },
    { label: 'Personen', icon: <DonutLargeIcon sx={{ fontSize: 16 }} /> },
    { label: 'Kostenstellen', icon: <BarChartIcon sx={{ fontSize: 16 }} /> },
    { label: 'Ranking', icon: <LeaderboardIcon sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Finanzübersicht auf einen Blick</Typography>
        </Box>
        <Chip icon={<CalendarMonthIcon />} label={now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          variant="outlined" size="small" />
      </Box>

      {/* KPI Karten */}
      <div className="grid grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Gesamtkosten" value={`${totalAmount.toFixed(2)} €`} Icon={EuroIcon}
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" trend={trend} />
        <KpiCard label="Dieser Monat" value={`${thisMonthTotal.toFixed(2)} €`} Icon={CalendarMonthIcon}
          gradient="linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)"
          sub={`${expenses.filter(e => e.date?.startsWith(thisMonth)).length} Buchungen`} />
        <KpiCard label="Kostenstellen" value={products.length} Icon={InventoryIcon}
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          sub={`${expenses.length} Positionen gesamt`} />
        <KpiCard label="Personen" value={persons.length} Icon={PeopleIcon}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          sub={topPersons[0] ? `Top: ${topPersons[0].name}` : 'Keine Daten'} />
      </div>

      {isEmpty ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
          <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Noch keine Kostendaten vorhanden.</Typography>
          <Typography variant="caption" color="text.disabled">Füge Kostenpositionen hinzu, um Auswertungen zu sehen.</Typography>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {/* Tab-Leiste */}
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { minHeight: 52, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', gap: 0.75 },
                '& .Mui-selected': { color: '#6366f1' },
                '& .MuiTabs-indicator': { backgroundColor: '#6366f1', height: 3, borderRadius: '3px 3px 0 0' },
              }}
            >
              {TABS.map((t, i) => (
                <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
              ))}
            </Tabs>
          </Box>

          {/* Tab-Inhalt */}
          {tab === 0 && <TabMonatsverlauf monthlyData={monthlyData} />}
          {tab === 1 && <TabPersonen perPersonData={perPersonData} />}
          {tab === 2 && <TabKostenstellen perKostenstelleData={perKostenstelleData} paymentData={paymentData} />}
          {tab === 3 && <TabRanking topPersons={topPersons} totalAmount={totalAmount} recentExpenses={recentExpenses} persons={persons} products={products} />}
        </Paper>
      )}
    </Box>
  );
}

export default Dashboard;
