import { useState, useEffect, useMemo } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody, TableFooter,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box, Divider,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
  TablePagination, TableSortLabel, Card, CardContent, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EuroIcon from '@mui/icons-material/Euro';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { hoursApi, personsApi, productsApi } from '../api';
import { fmtEuro, fmtDate } from '../utils/format';

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function fmtHours(h) {
  const n = parseFloat(h) || 0;
  const hh = Math.floor(n);
  const mm = Math.round((n - hh) * 60);
  if (mm === 0) return `${hh} h`;
  return `${hh} h ${String(mm).padStart(2, '0')} min`;
}

const emptyForm = {
  personId: '',
  productId: '',
  date: new Date().toISOString().split('T')[0],
  hours: '',
  ratePerHour: '',
  description: '',
};

// ── KPI-Karte ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" fontWeight={600}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {label}
          </Typography>
          <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}18` }}>
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

// ── Formular-Dialog ───────────────────────────────────────────────────────────
function HoursFormDialog({ open, entry, persons, products, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(entry ? {
      personId:    entry.personId,
      productId:   entry.productId,
      date:        entry.date,
      hours:       entry.hours,
      ratePerHour: entry.ratePerHour ?? '',
      description: entry.description ?? '',
    } : emptyForm);
  }, [entry, open]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const totalCost = (parseFloat(form.hours) || 0) * (parseFloat(form.ratePerHour) || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {entry ? 'Stunden bearbeiten' : 'Stunden erfassen'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Person</InputLabel>
                <Select value={form.personId} onChange={set('personId')} label="Person">
                  {persons.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color || '#6366f1' }} />
                        {p.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" required>
                <InputLabel>Kostenstelle</InputLabel>
                <Select value={form.productId} onChange={set('productId')} label="Kostenstelle">
                  {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                label="Datum *" type="date" value={form.date} onChange={set('date')}
                required fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Stunden *" type="number" value={form.hours} onChange={set('hours')}
                required fullWidth size="small" inputProps={{ step: '0.25', min: '0.25' }}
                helperText="z.B. 1.5 = 1h 30min"
              />
              <TextField
                label="Stundensatz (€)" type="number" value={form.ratePerHour} onChange={set('ratePerHour')}
                fullWidth size="small" inputProps={{ step: '0.01', min: '0' }}
                InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
              />
            </Box>

            <TextField
              label="Tätigkeit / Beschreibung" value={form.description} onChange={set('description')}
              fullWidth size="small" multiline rows={2} placeholder="Was wurde gemacht?"
            />

            {totalCost > 0 && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f0ff', border: '1px solid #e0e0f0' }}>
                <Typography variant="body2" color="primary" fontWeight={600}>
                  Gesamtkosten: {fmtEuro(totalCost)}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({form.hours} h × {fmtEuro(form.ratePerHour)})
                  </Typography>
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" startIcon={entry ? <EditIcon /> : <AddIcon />}>
            {entry ? 'Aktualisieren' : 'Erfassen'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ── Löschen-Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Eintrag löschen</DialogTitle>
      <DialogContent>
        <Typography>Diesen Stundeneintrag wirklich löschen?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onConfirm}>
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Personen-Zusammenfassung ──────────────────────────────────────────────────
function PersonSummary({ entries, persons, products }) {
  const rows = useMemo(() => {
    return persons
      .map(p => {
        const mine = entries.filter(e => String(e.personId) === String(p.id));
        const totalH = mine.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
        const totalC = mine.reduce((s, e) => s + (parseFloat(e.hours) || 0) * (parseFloat(e.ratePerHour) || 0), 0);
        const topProduct = (() => {
          const map = {};
          mine.forEach(e => { map[e.productId] = (map[e.productId] || 0) + (parseFloat(e.hours) || 0); });
          const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
          return top ? products.find(pr => String(pr.id) === String(top[0]))?.name : null;
        })();
        return { ...p, totalH, totalC, count: mine.length, topProduct };
      })
      .filter(p => p.totalH > 0)
      .sort((a, b) => b.totalH - a.totalH);
  }, [entries, persons, products]);

  if (rows.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mt: 3 }}>
      <Box px={3} py={2}>
        <Typography variant="h6" fontWeight="bold">Zusammenfassung je Person</Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>Person</TableCell>
              <TableCell align="right">Einträge</TableCell>
              <TableCell align="right">Stunden gesamt</TableCell>
              <TableCell align="right">Kosten gesamt</TableCell>
              <TableCell>Hauptkostenstelle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 700, bgcolor: p.color || '#6366f1' }}>
                      {p.name[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">{p.count}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="primary">{fmtHours(p.totalH)}</Typography>
                </TableCell>
                <TableCell align="right">
                  {p.totalC > 0
                    ? <Typography variant="body2" fontWeight={600}>{fmtEuro(p.totalC)}</Typography>
                    : <Typography variant="caption" color="text.disabled">—</Typography>}
                </TableCell>
                <TableCell>
                  {p.topProduct
                    ? <Chip label={p.topProduct} size="small" variant="outlined" />
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Hours() {
  const [entries, setEntries]   = useState([]);
  const [persons, setPersons]   = useState([]);
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen]   = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter
  const [search, setSearch]             = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  // Tabelle
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy]           = useState('date');
  const [sortDir, setSortDir]         = useState('desc');

  useEffect(() => {
    Promise.all([hoursApi.getAll(), personsApi.getAll(), productsApi.getAll()])
      .then(([h, p, pr]) => { setEntries(h); setPersons(p); setProducts(pr); });
  }, []);

  const getName = (arr, id) => arr.find(x => String(x.id) === String(id))?.name ?? '—';
  const getColor = (id) => persons.find(p => String(p.id) === String(id))?.color || '#6366f1';

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = entries.filter(e => {
      const personName  = getName(persons, e.personId);
      const productName = getName(products, e.productId);
      return (
        (!q || personName.toLowerCase().includes(q) || productName.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) || String(e.hours).includes(q)) &&
        (!filterPerson  || String(e.personId)  === String(filterPerson)) &&
        (!filterProduct || String(e.productId) === String(filterProduct)) &&
        (!filterDateFrom || e.date >= filterDateFrom) &&
        (!filterDateTo   || e.date <= filterDateTo)
      );
    });

    result = [...result].sort((a, b) => {
      let aV, bV;
      if      (sortBy === 'date')    { aV = a.date ?? '';                    bV = b.date ?? ''; }
      else if (sortBy === 'person')  { aV = getName(persons, a.personId);    bV = getName(persons, b.personId); }
      else if (sortBy === 'product') { aV = getName(products, a.productId);  bV = getName(products, b.productId); }
      else if (sortBy === 'hours')   { aV = parseFloat(a.hours || 0);        bV = parseFloat(b.hours || 0); }
      else if (sortBy === 'cost')    {
        aV = (parseFloat(a.hours) || 0) * (parseFloat(a.ratePerHour) || 0);
        bV = (parseFloat(b.hours) || 0) * (parseFloat(b.ratePerHour) || 0);
      }
      else { aV = a.date ?? ''; bV = b.date ?? ''; }
      if (typeof aV === 'number') return sortDir === 'asc' ? aV - bV : bV - aV;
      return sortDir === 'asc'
        ? String(aV).localeCompare(String(bV), 'de')
        : String(bV).localeCompare(String(aV), 'de');
    });

    return result;
  }, [entries, search, filterPerson, filterProduct, filterDateFrom, filterDateTo, sortBy, sortDir, persons, products]);

  useEffect(() => setPage(0), [search, filterPerson, filterProduct, filterDateFrom, filterDateTo]);

  const hasFilter = search || filterPerson || filterProduct || filterDateFrom || filterDateTo;
  const resetFilters = () => {
    setSearch(''); setFilterPerson(''); setFilterProduct('');
    setFilterDateFrom(''); setFilterDateTo(''); setPage(0);
  };

  // KPIs
  const totalHours = useMemo(() => filtered.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0), [filtered]);
  const totalCost  = useMemo(() => filtered.reduce((s, e) => s + (parseFloat(e.hours) || 0) * (parseFloat(e.ratePerHour) || 0), 0), [filtered]);
  const avgHoursPerDay = useMemo(() => {
    const days = new Set(filtered.map(e => e.date)).size;
    return days > 0 ? totalHours / days : 0;
  }, [filtered, totalHours]);

  const handleSave = async (form) => {
    if (editEntry) {
      const updated = await hoursApi.update(editEntry.id, form);
      setEntries(prev => prev.map(e => e.id === editEntry.id ? updated : e));
    } else {
      const created = await hoursApi.create(form);
      setEntries(prev => [...prev, created]);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    await hoursApi.remove(deleteTarget.id);
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const sortCol = (key, label) => (
    <TableSortLabel
      active={sortBy === key}
      direction={sortBy === key ? sortDir : 'asc'}
      onClick={() => handleSort(key)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Stundenaufwand</Typography>

      {/* KPI-Karten */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        <KpiCard label="Stunden gesamt" value={fmtHours(totalHours)} icon={AccessTimeIcon} color="#6366f1"
          sub={`${filtered.length} Einträge${hasFilter ? ' (gefiltert)' : ''}`} />
        <KpiCard label="Kosten gesamt" value={fmtEuro(totalCost)} icon={EuroIcon} color="#10b981"
          sub={totalCost > 0 ? `Ø ${fmtEuro(totalHours > 0 ? totalCost / totalHours : 0)} / h` : 'Kein Stundensatz'} />
        <KpiCard label="Ø pro Arbeitstag" value={fmtHours(avgHoursPerDay)} icon={CalendarMonthIcon} color="#f59e0b"
          sub={`${new Set(filtered.map(e => e.date)).size} Arbeitstage`} />
        <KpiCard label="Personen" value={new Set(filtered.map(e => e.personId)).size} icon={PersonIcon} color="#06b6d4"
          sub={`${new Set(filtered.map(e => e.productId)).size} Kostenstellen`} />
      </Box>

      {/* Tabelle */}
      <Paper elevation={2}>
        {/* Header */}
        <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="h6">
            Alle Einträge ({filtered.length}{hasFilter && filtered.length !== entries.length ? ` von ${entries.length}` : ''})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditEntry(null); setFormOpen(true); }}>
            Erfassen
          </Button>
        </Box>

        {/* Filter */}
        <Box px={3} pb={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small" placeholder="Person, Kostenstelle, Tätigkeit…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ flex: 2, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Person</InputLabel>
              <Select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} label="Person">
                <MenuItem value="">Alle</MenuItem>
                {persons.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Kostenstelle</InputLabel>
              <Select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} label="Kostenstelle">
                <MenuItem value="">Alle</MenuItem>
                {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Von" value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 145 }} />
            <TextField size="small" type="date" label="Bis" value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 145 }} />
            {hasFilter && <Button size="small" onClick={resetFilters}>Zurücksetzen</Button>}
          </Stack>
        </Box>

        <Divider />

        {entries.length === 0 ? (
          <Box px={3} py={5} textAlign="center">
            <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Noch keine Stundeneinträge vorhanden</Typography>
            <Typography variant="caption" color="text.disabled">Klicke auf „Erfassen" um zu beginnen</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50', whiteSpace: 'nowrap' } }}>
                  <TableCell>{sortCol('date', 'Datum')}</TableCell>
                  <TableCell>{sortCol('person', 'Person')}</TableCell>
                  <TableCell>{sortCol('product', 'Kostenstelle')}</TableCell>
                  <TableCell align="right">{sortCol('hours', 'Stunden')}</TableCell>
                  <TableCell align="right">Stundensatz</TableCell>
                  <TableCell align="right">{sortCol('cost', 'Betrag')}</TableCell>
                  <TableCell>Tätigkeit</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Keine Einträge gefunden
                    </TableCell>
                  </TableRow>
                ) : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(entry => {
                  const cost = (parseFloat(entry.hours) || 0) * (parseFloat(entry.ratePerHour) || 0);
                  return (
                    <TableRow key={entry.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getColor(entry.personId), flexShrink: 0 }} />
                          <Typography variant="body2">{getName(persons, entry.personId)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={getName(products, entry.productId)} size="small" variant="outlined"
                          sx={{ fontSize: 11, height: 22 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {fmtHours(entry.hours)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {parseFloat(entry.ratePerHour) > 0 ? fmtEuro(entry.ratePerHour) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {cost > 0
                          ? <Typography variant="body2" fontWeight={600}>{fmtEuro(cost)}</Typography>
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem', maxWidth: 200 }}>
                        <Typography variant="caption" noWrap display="block" title={entry.description}>
                          {entry.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Bearbeiten">
                            <IconButton size="small" onClick={() => { setEditEntry(entry); setFormOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(entry)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ bgcolor: 'grey.100', '& td': { borderTop: '2px solid', borderTopColor: 'grey.300' } }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                    {hasFilter ? `Summe (gefiltert, ${filtered.length} Einträge)` : `Gesamtsumme (${filtered.length} Einträge)`}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#6366f1' }}>
                    {fmtHours(totalHours)}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {totalCost > 0 ? fmtEuro(totalCost) : '—'}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Zeilen pro Seite:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} von ${count}`}
        />
      </Paper>

      {/* Personen-Zusammenfassung */}
      <PersonSummary entries={filtered} persons={persons} products={products} />

      <HoursFormDialog
        open={formOpen}
        entry={editEntry}
        persons={persons}
        products={products}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}
