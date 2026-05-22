import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody, TableFooter,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, TablePagination, TableSortLabel, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import { expensesApi, personsApi, productsApi, uploadsApi } from '../api';
import { fmtEuro, fmtAmount, fmtDate } from '../utils/format';
import { exportExpensesPdf, exportSingleExpensePdf } from '../utils/exportPdf';

const paymentMethods = ['Bar', 'Karte', 'Überweisung', 'Lastschrift'];
const paymentColors = { Bar: 'default', Karte: 'primary', Überweisung: 'success', Lastschrift: 'warning' };

const emptyForm = {
  personId: '', productId: '', amount: '', paymentMethod: 'Bar',
  date: new Date().toISOString().split('T')[0], note: '', attachments: [], type: 'Ausgabe',
  predecessorId: '',
};

function isImage(mimetype) { return mimetype?.startsWith('image/'); }

function FileIcon({ mimetype, size = 20 }) {
  if (isImage(mimetype)) return <ImageIcon sx={{ fontSize: size, color: '#1976d2' }} />;
  if (mimetype === 'application/pdf') return <PictureAsPdfIcon sx={{ fontSize: size, color: '#d32f2f' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: size, color: '#757575' }} />;
}

// ── Upload-Zone ────────────────────────────────────────────────────────────────
function FileUploadZone({ attachments, onAdd, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    setUploading(true);
    setUploadError('');
    for (const file of files) {
      try { onAdd(await uploadsApi.upload(file)); }
      catch (err) {
        console.error('Upload fehlgeschlagen:', err);
        setUploadError(`Upload fehlgeschlagen: ${err.message}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Anhänge</Typography>
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles([...e.dataTransfer.files]); }}
        onClick={() => !uploading && inputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragging ? '#1976d2' : '#ccc'}`, borderRadius: 1, p: 1.5,
          textAlign: 'center', cursor: uploading ? 'wait' : 'pointer',
          backgroundColor: dragging ? 'rgba(25,118,210,0.05)' : 'transparent', transition: 'all 0.15s',
          '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.03)' },
        }}
      >
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => handleFiles([...e.target.files])} />
        <AttachFileIcon sx={{ fontSize: 20, color: 'text.disabled', mb: 0.5 }} />
        <Typography variant="caption" color="text.secondary" display="block">
          {uploading ? 'Wird hochgeladen…' : 'Dateien ablegen oder klicken'}
        </Typography>
      </Box>
      {uploadError && (
        <Typography variant="caption" color="error" display="block" mt={0.5}>{uploadError}</Typography>
      )}
      {attachments.length > 0 && (
        <Stack spacing={0.5} mt={1}>
          {attachments.map((att) => (
            <Box key={att.filename} display="flex" alignItems="center" gap={1}
              sx={{ px: 1, py: 0.5, borderRadius: 1, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
              <FileIcon mimetype={att.mimetype} size={16} />
              <Typography variant="caption" flex={1} noWrap component="a"
                href={uploadsApi.url(att.filename)} target="_blank" rel="noreferrer"
                sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {att.originalName}
              </Typography>
              <IconButton size="small" onClick={() => onRemove(att)} sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function AttachmentsDialog({ open, attachments, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => { if (open) setIdx(startIndex); }, [open, startIndex]);

  const prev = useCallback(() => setIdx(i => (i - 1 + attachments.length) % attachments.length), [attachments.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % attachments.length), [attachments.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, prev, next, onClose]);

  if (!attachments.length) return null;
  const att = attachments[idx];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { backgroundColor: '#111', color: '#fff', m: { xs: 1, sm: 2 } } }}>
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
          backgroundColor: 'rgba(0,0,0,0.6)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <FileIcon mimetype={att.mimetype} size={18} />
          <Typography variant="body2" noWrap flex={1} sx={{ color: '#eee' }}>{att.originalName}</Typography>
          <Typography variant="caption" sx={{ color: '#aaa', whiteSpace: 'nowrap' }}>{idx + 1} / {attachments.length}</Typography>
          <Tooltip title="In neuem Tab öffnen">
            <IconButton size="small" component="a" href={uploadsApi.url(att.filename)} target="_blank" rel="noreferrer" sx={{ color: '#ccc' }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: '#ccc' }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <Box sx={{ minHeight: { xs: 280, sm: 480 }, display: 'flex', alignItems: 'center', justifyContent: 'center', pt: '48px', pb: '48px' }}>
          {isImage(att.mimetype) && (
            <Box component="img" src={uploadsApi.url(att.filename)} alt={att.originalName}
              sx={{ maxWidth: '100%', maxHeight: { xs: 260, sm: 440 }, objectFit: 'contain' }} />
          )}
          {att.mimetype === 'application/pdf' && (
            <Box component="iframe" src={uploadsApi.url(att.filename)} title={att.originalName}
              sx={{ width: '100%', height: { xs: 360, sm: 520 }, border: 'none' }} />
          )}
          {!isImage(att.mimetype) && att.mimetype !== 'application/pdf' && (
            <Stack alignItems="center" spacing={2}>
              <FileIcon mimetype={att.mimetype} size={64} />
              <Typography sx={{ color: '#ccc' }}>{att.originalName}</Typography>
              <Button variant="outlined" startIcon={<OpenInNewIcon />} component="a"
                href={uploadsApi.url(att.filename)} target="_blank" rel="noreferrer"
                sx={{ color: '#fff', borderColor: '#666' }}>Datei öffnen</Button>
            </Stack>
          )}
        </Box>
        {attachments.length > 1 && (
          <>
            <IconButton onClick={prev} sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={next} sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}>
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
        {attachments.length > 1 && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap',
            px: 2, py: 1, backgroundColor: 'rgba(0,0,0,0.6)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            {attachments.map((a, i) => (
              <Box key={a.filename} onClick={() => setIdx(i)} sx={{
                width: 40, height: 40, borderRadius: 0.5, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                border: `2px solid ${i === idx ? '#fff' : 'transparent'}`, opacity: i === idx ? 1 : 0.5,
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333',
              }}>
                {isImage(a.mimetype)
                  ? <Box component="img" src={uploadsApi.url(a.filename)} alt={a.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <FileIcon mimetype={a.mimetype} size={20} />}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Formular-Modal ────────────────────────────────────────────────────────────
function ExpenseFormDialog({ open, expense, persons, products, expenses, onClose, onSave }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setFormData(expense ? {
      personId: expense.personId, productId: expense.productId, amount: expense.amount,
      paymentMethod: expense.paymentMethod, date: expense.date, note: expense.note,
      attachments: expense.attachments || [], type: expense.type || 'Ausgabe',
      predecessorId: expense.predecessorId || '',
    } : emptyForm);
  }, [expense, open]);

  const update = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const addAttachment = (att) => setFormData(prev => ({ ...prev, attachments: [...prev.attachments, att] }));
  const removeAttachment = async (att) => {
    await uploadsApi.remove(att.filename);
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.filename !== att.filename) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {expense ? 'Kosten bearbeiten' : 'Kosten hinzufügen'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Person</InputLabel>
              <Select value={formData.personId} onChange={update('personId')} label="Person">
                {persons.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>Produkt</InputLabel>
              <Select value={formData.productId} onChange={update('productId')} label="Produkt">
                {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Betrag (€) *" type="number" inputProps={{ step: '0.01' }}
                value={formData.amount} onChange={update('amount')} required fullWidth size="small"
              />
              <TextField
                label="Datum *" type="date" value={formData.date} onChange={update('date')}
                required fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
            </div>

            <FormControl fullWidth size="small" required>
              <InputLabel>Typ</InputLabel>
              <Select value={formData.type || 'Ausgabe'} onChange={update('type')} label="Typ">
                <MenuItem value="Ausgabe">Ausgabe</MenuItem>
                <MenuItem value="Einnahme">Einnahme</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Zahlungsart</InputLabel>
              <Select value={formData.paymentMethod} onChange={update('paymentMethod')} label="Zahlungsart">
                {paymentMethods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField
              label="Notiz" value={formData.note} onChange={update('note')}
              fullWidth size="small" placeholder="Optional"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Vorgänger-Buchung</InputLabel>
              <Select value={formData.predecessorId || ''} onChange={update('predecessorId')} label="Vorgänger-Buchung">
                <MenuItem value=""><em>Kein Vorgänger</em></MenuItem>
                {[...expenses]
                  .filter(e => !expense || String(e.id) !== String(expense.id))
                  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
                  .map(e => {
                    const pName = persons.find(p => String(p.id) === String(e.personId))?.name ?? '?';
                    const prName = products.find(p => String(p.id) === String(e.productId))?.name ?? '?';
                    return (
                      <MenuItem key={e.id} value={e.id}>
                        {fmtDate(e.date)} · {pName} · {prName} · {fmtEuro(e.amount)}
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            <FileUploadZone
              attachments={formData.attachments}
              onAdd={addAttachment}
              onRemove={removeAttachment}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" startIcon={expense ? <EditIcon /> : <AddIcon />}>
            {expense ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ── Löschen-Modal ─────────────────────────────────────────────────────────────
function DeleteDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Kostenposition löschen</DialogTitle>
      <DialogContent>
        <Typography>Diese Kostenposition wirklich löschen? Alle Anhänge werden ebenfalls entfernt.</Typography>
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

// ── Storno-Modal ──────────────────────────────────────────────────────────────
function StornoDialog({ open, expense, persons, products, onClose, onConfirm }) {
  if (!expense) return null;
  const personName = persons.find(p => String(p.id) === String(expense.personId))?.name ?? '?';
  const productName = products.find(p => String(p.id) === String(expense.productId))?.name ?? '?';
  const oppositeType = (expense.type || 'Ausgabe') === 'Ausgabe' ? 'Einnahme' : 'Ausgabe';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Buchung stornieren</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Es wird eine Gegenbuchung ({oppositeType}) erstellt, die diese Buchung ausgleicht:
        </Typography>
        <Box sx={{ mt: 1, p: 1.5, borderRadius: 1, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
          <Typography variant="body2"><b>Datum:</b> {fmtDate(expense.date)}</Typography>
          <Typography variant="body2"><b>Person:</b> {personName}</Typography>
          <Typography variant="body2"><b>Produkt:</b> {productName}</Typography>
          <Typography variant="body2"><b>Betrag:</b> {fmtEuro(expense.amount)}</Typography>
          <Typography variant="body2"><b>Typ:</b> {expense.type || 'Ausgabe'} → <b>{oppositeType}</b></Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" color="warning" startIcon={<UndoIcon />} onClick={onConfirm}>
          Stornieren
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stornoTarget, setStornoTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [colFilters, setColFilters] = useState({ date: '', createdAt: '', updatedAt: '', person: '', product: '', amount: '', type: '', payment: '', note: '' });
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [rowPdfLoading, setRowPdfLoading] = useState(null); // expense.id

  const handleRowExportPdf = async (expense) => {
    setRowPdfLoading(expense.id);
    try {
      await exportSingleExpensePdf({ expense, persons, products, expenses });
    } finally {
      setRowPdfLoading(null);
    }
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    setPdfProgress('PDF wird erstellt…');
    try {
      // Beschreibung der aktiven Filter für das PDF
      const filterParts = [];
      if (search) filterParts.push(`Suche: „${search}"`);
      if (filterPerson)  filterParts.push(`Person: ${persons.find(p => String(p.id) === String(filterPerson))?.name}`);
      if (filterProduct) filterParts.push(`Kostenstelle: ${products.find(p => String(p.id) === String(filterProduct))?.name}`);
      if (filterPayment) filterParts.push(`Zahlung: ${filterPayment}`);
      if (filterType)   filterParts.push(`Typ: ${filterType}`);
      if (filterDateFrom) filterParts.push(`Von: ${fmtDate(filterDateFrom)}`);
      if (filterDateTo)   filterParts.push(`Bis: ${fmtDate(filterDateTo)}`);

      await exportExpensesPdf({
        expenses: filtered,
        persons,
        products,
        filterDescription: filterParts.length ? filterParts.join('  |  ') : null,
        onProgress: (msg) => setPdfProgress(msg),
      });
    } finally {
      setPdfLoading(false);
      setPdfProgress('');
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(0);
  };

  const updateColFilter = (col) => (e) => {
    setColFilters(prev => ({ ...prev, [col]: e.target.value }));
    setPage(0);
  };

  useEffect(() => {
    Promise.all([expensesApi.getAll(), personsApi.getAll(), productsApi.getAll()])
      .then(([e, p, pr]) => { setExpenses(e); setPersons(p); setProducts(pr); });
  }, []);

  const getPersonName = (id) => persons.find(p => String(p.id) === String(id))?.name ?? 'Unbekannt';
  const getProductName = (id) => products.find(p => String(p.id) === String(id))?.name ?? 'Unbekannt';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const cf = colFilters;
    let result = expenses.filter(exp => {
      const personName = getPersonName(exp.personId);
      const productName = getProductName(exp.productId);
      const matchesSearch = !q ||
        personName.toLowerCase().includes(q) ||
        productName.toLowerCase().includes(q) ||
        exp.note?.toLowerCase().includes(q) ||
        String(exp.amount).includes(q);
      const expType = exp.type || 'Ausgabe';
      return matchesSearch &&
        (!filterPerson || String(exp.personId) === String(filterPerson)) &&
        (!filterProduct || String(exp.productId) === String(filterProduct)) &&
        (!filterPayment || exp.paymentMethod === filterPayment) &&
        (!filterDateFrom || exp.date >= filterDateFrom) &&
        (!filterDateTo || exp.date <= filterDateTo) &&
        (!filterType || expType === filterType) &&
        (!cf.date || fmtDate(exp.date).includes(cf.date)) &&
        (!cf.createdAt || fmtDate(exp.createdAt?.split('T')[0]).includes(cf.createdAt)) &&
        (!cf.updatedAt || fmtDate(exp.updatedAt?.split('T')[0]).includes(cf.updatedAt)) &&
        (!cf.person || personName.toLowerCase().includes(cf.person.toLowerCase())) &&
        (!cf.product || productName.toLowerCase().includes(cf.product.toLowerCase())) &&
        (!cf.amount || String(exp.amount).includes(cf.amount)) &&
        (!cf.type || expType.toLowerCase().includes(cf.type.toLowerCase())) &&
        (!cf.payment || exp.paymentMethod?.toLowerCase().includes(cf.payment.toLowerCase())) &&
        (!cf.note || exp.note?.toLowerCase().includes(cf.note.toLowerCase()));
    });

    result = [...result].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'date')      { aVal = a.date ?? ''; bVal = b.date ?? ''; }
      else if (sortBy === 'createdAt') { aVal = a.createdAt ?? ''; bVal = b.createdAt ?? ''; }
      else if (sortBy === 'updatedAt') { aVal = a.updatedAt ?? ''; bVal = b.updatedAt ?? ''; }
      else if (sortBy === 'person')    { aVal = getPersonName(a.personId);  bVal = getPersonName(b.personId); }
      else if (sortBy === 'product')   { aVal = getProductName(a.productId); bVal = getProductName(b.productId); }
      else if (sortBy === 'amount')    { aVal = parseFloat(a.amount || 0);   bVal = parseFloat(b.amount || 0); }
      else if (sortBy === 'type')       { aVal = (a.type || 'Ausgabe');        bVal = (b.type || 'Ausgabe'); }
      else if (sortBy === 'payment')   { aVal = a.paymentMethod ?? '';        bVal = b.paymentMethod ?? ''; }
      else { aVal = a.date ?? ''; bVal = b.date ?? ''; }
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal), 'de')
        : String(bVal).localeCompare(String(aVal), 'de');
    });

    return result;
  }, [expenses, search, filterPerson, filterProduct, filterPayment, filterDateFrom, filterDateTo, filterType, colFilters, sortBy, sortDir, persons, products]);

  // Bei Filteränderung zurück auf Seite 1
  useEffect(() => { setPage(0); }, [search, filterPerson, filterProduct, filterPayment, filterDateFrom, filterDateTo, filterType]);

  const hasColFilter = Object.values(colFilters).some(Boolean);
  const hasFilter = search || filterPerson || filterProduct || filterPayment || filterDateFrom || filterDateTo || filterType || hasColFilter;
  const resetFilters = () => {
    setPage(0);
    setSearch(''); setFilterPerson(''); setFilterProduct('');
    setFilterPayment(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterType('');
    setColFilters({ date: '', createdAt: '', updatedAt: '', person: '', product: '', amount: '', type: '', payment: '', note: '' });
  };

  const predecessorSet = useMemo(() =>
    new Set(expenses.filter(e => e.predecessorId && !e.storno).map(e => String(e.predecessorId))),
    [expenses]
  );

  const stornoSet = useMemo(() =>
    new Set(expenses.filter(e => e.storno && e.predecessorId).map(e => String(e.predecessorId))),
    [expenses]
  );

  const totalEinnahmen = filtered.reduce((sum, e) => (e.type || 'Ausgabe') === 'Einnahme' ? sum + parseFloat(e.amount || 0) : sum, 0);
  const totalAusgaben = filtered.reduce((sum, e) => (e.type || 'Ausgabe') === 'Ausgabe' ? sum + parseFloat(e.amount || 0) : sum, 0);
  const saldo = totalEinnahmen - totalAusgaben;

  const openCreate = () => { setEditExpense(null); setFormOpen(true); };
  const openEdit = (expense) => { setEditExpense(expense); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const handleSave = async (formData) => {
    if (editExpense) {
      const updated = await expensesApi.update(editExpense.id, formData);
      setExpenses(prev => prev.map(e => e.id === editExpense.id ? updated : e));
    } else {
      const created = await expensesApi.create(formData);
      setExpenses(prev => [...prev, created]);
    }
    closeForm();
  };

  const handleDelete = async () => {
    for (const att of deleteTarget?.attachments || []) await uploadsApi.remove(att.filename);
    await expensesApi.remove(deleteTarget.id);
    setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleStorno = async () => {
    const exp = stornoTarget;
    const stornoData = {
      personId: exp.personId,
      productId: exp.productId,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      date: new Date().toISOString().split('T')[0],
      note: `Storno${exp.note ? ': ' + exp.note : ''}`,
      attachments: [],
      type: (exp.type || 'Ausgabe') === 'Ausgabe' ? 'Einnahme' : 'Ausgabe',
      predecessorId: exp.id,
      storno: true,
    };
    const created = await expensesApi.create(stornoData);
    setExpenses(prev => [...prev, created]);
    setStornoTarget(null);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Kosten Dokumentation</Typography>

      <Paper elevation={2}>
        <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6">
              Alle Kostenpositionen ({filtered.length}{hasFilter && filtered.length !== expenses.length ? ` von ${expenses.length}` : ''})
            </Typography>
            {pdfLoading && (
              <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={10} /> {pdfProgress}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title={showTimestamps ? 'Zeitstempel ausblenden' : 'Zeitstempel einblenden'}>
              <IconButton
                onClick={() => setShowTimestamps(v => !v)}
                sx={{
                  border: '1px solid',
                  borderColor: showTimestamps ? 'primary.main' : 'divider',
                  color: showTimestamps ? 'primary.main' : 'text.secondary',
                  borderRadius: 1,
                }}
              >
                <AccessTimeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`PDF exportieren (${filtered.length} Einträge${hasFilter ? ', gefiltert' : ''})`}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  onClick={handleExportPdf}
                  disabled={pdfLoading || filtered.length === 0}
                >
                  PDF
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Neu</Button>
          </Stack>
        </Box>

        {/* Filterleiste */}
        <Box px={3} pb={2}>
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small" placeholder="Suche nach Person, Produkt, Notiz…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                sx={{ flex: 2 }}
              />
              <FormControl size="small" sx={{ flex: 1, minWidth: 130 }}>
                <InputLabel>Person</InputLabel>
                <Select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} label="Person">
                  <MenuItem value="">Alle</MenuItem>
                  {persons.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1, minWidth: 130 }}>
                <InputLabel>Produkt</InputLabel>
                <Select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} label="Produkt">
                  <MenuItem value="">Alle</MenuItem>
                  {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Typ</InputLabel>
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Typ">
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="Ausgabe">Ausgabe</MenuItem>
                  <MenuItem value="Einnahme">Einnahme</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Zahlungsart</InputLabel>
                <Select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} label="Zahlungsart">
                  <MenuItem value="">Alle</MenuItem>
                  {paymentMethods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label="Von" value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
              <TextField size="small" type="date" label="Bis" value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
              {hasFilter && <Button size="small" onClick={resetFilters}>Zurücksetzen</Button>}
            </Stack>
          </Stack>
        </Box>

        <Divider />
        {expenses.length === 0 ? (
          <Box px={3} py={4} textAlign="center">
            <Typography color="text.secondary">Noch keine Kostenpositionen vorhanden</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                {/* Spalten-Header mit Sortierung */}
                <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50', whiteSpace: 'nowrap' } }}>
                  {[
                    { key: 'date',      label: 'Rechnungsdatum' },
                    ...(showTimestamps ? [
                      { key: 'createdAt', label: 'Erfasst am' },
                      { key: 'updatedAt', label: 'Aktualisiert am' },
                    ] : []),
                    { key: 'person',    label: 'Person' },
                    { key: 'product',   label: 'Produkt' },
                    { key: 'amount',    label: 'Betrag' },
                    { key: 'type',      label: 'Typ' },
                    { key: 'payment',   label: 'Zahlung' },
                  ].map(({ key, label }) => (
                    <TableCell key={key}>
                      <TableSortLabel
                        active={sortBy === key}
                        direction={sortBy === key ? sortDir : 'asc'}
                        onClick={() => handleSort(key)}
                      >
                        {label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell>Notiz</TableCell>
                  <TableCell>Anhänge</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>

                {/* Spalten-Filterzeile */}
                <TableRow sx={{ '& td': { py: 0.5, backgroundColor: 'grey.50', borderBottom: '2px solid', borderBottomColor: 'divider' } }}>
                  {[
                    { key: 'date',      placeholder: 'z.B. 04.2026' },
                    ...(showTimestamps ? [
                      { key: 'createdAt', placeholder: 'z.B. 04.2026' },
                      { key: 'updatedAt', placeholder: 'z.B. 04.2026' },
                    ] : []),
                    { key: 'person',    placeholder: 'Name…' },
                    { key: 'product',   placeholder: 'Produkt…' },
                    { key: 'amount',    placeholder: 'Betrag…' },
                    { key: 'type',      placeholder: 'Typ…' },
                    { key: 'payment',   placeholder: 'Zahlung…' },
                    { key: 'note',      placeholder: 'Notiz…' },
                  ].map(({ key, placeholder }) => (
                    <TableCell key={key}>
                      <TextField
                        size="small"
                        placeholder={placeholder}
                        value={colFilters[key]}
                        onChange={updateColFilter(key)}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': { fontSize: '0.75rem', height: 28 },
                          '& .MuiOutlinedInput-input': { py: 0, px: 1 },
                          width: '100%',
                          minWidth: 80,
                        }}
                        InputProps={colFilters[key] ? {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" sx={{ p: 0.25 }} onClick={() => { setColFilters(prev => ({ ...prev, [key]: '' })); setPage(0); }}>
                                <CloseIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        } : undefined}
                      />
                    </TableCell>
                  ))}
                  <TableCell />{/* Anhänge */}
                  <TableCell />{/* Aktionen */}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showTimestamps ? 12 : 10} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      Keine Daten gefunden
                    </TableCell>
                  </TableRow>
                ) : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(expense => {
                  const attachments = expense.attachments || [];
                  return (
                    <TableRow key={expense.id} hover>
                      <TableCell>{fmtDate(expense.date)}</TableCell>
                      {showTimestamps && (
                        <>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{fmtDate(expense.createdAt?.split('T')[0])}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{fmtDate(expense.updatedAt?.split('T')[0])}</TableCell>
                        </>
                      )}
                      <TableCell>{getPersonName(expense.personId)}</TableCell>
                      <TableCell>{getProductName(expense.productId)}</TableCell>
                      <TableCell sx={{ fontWeight: 'medium' }}>{fmtAmount(expense.amount, expense.type)}</TableCell>
                      <TableCell>
                        <Chip
                          label={expense.type || 'Ausgabe'}
                          color={(expense.type || 'Ausgabe') === 'Einnahme' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={expense.paymentMethod} color={paymentColors[expense.paymentMethod] || 'default'} size="small" />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        <Box display="flex" flexDirection="column" gap={0.25} alignItems="flex-start">
                          {expense.storno && expense.predecessorId && (() => {
                            const pred = expenses.find(e => String(e.id) === String(expense.predecessorId));
                            const tip = pred
                              ? `Storno von: ${fmtDate(pred.date)} · ${getPersonName(pred.personId)} · ${getProductName(pred.productId)} · ${fmtEuro(pred.amount)}`
                              : 'Ursprungsbuchung nicht gefunden';
                            return (
                              <Tooltip title={tip}>
                                <Chip icon={<UndoIcon />} label="Storno" size="small" color="error" variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 12 } }} />
                              </Tooltip>
                            );
                          })()}
                          {!expense.storno && expense.predecessorId && (() => {
                            const pred = expenses.find(e => String(e.id) === String(expense.predecessorId));
                            const tip = pred
                              ? `Korrektur von: ${fmtDate(pred.date)} · ${getPersonName(pred.personId)} · ${getProductName(pred.productId)} · ${fmtEuro(pred.amount)}`
                              : 'Vorgänger nicht gefunden';
                            return (
                              <Tooltip title={tip}>
                                <Chip icon={<AccountTreeIcon />} label="Korrektur" size="small" color="warning" variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 12 } }} />
                              </Tooltip>
                            );
                          })()}
                          {stornoSet.has(String(expense.id)) && (
                            <Tooltip title="Diese Buchung wurde storniert">
                              <Chip icon={<UndoIcon />} label="Storniert" size="small" color="default" variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 12 } }} />
                            </Tooltip>
                          )}
                          {predecessorSet.has(String(expense.id)) && (
                            <Tooltip title="Diese Buchung hat eine Nachfolge-Korrektur">
                              <Chip icon={<AccountTreeIcon />} label="Korrigiert" size="small" color="info" variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-icon': { fontSize: 12 } }} />
                            </Tooltip>
                          )}
                          {expense.note && <span>{expense.note}</span>}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {attachments.length > 0 ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {attachments.slice(0, 3).map((att, attIdx) => (
                              <Tooltip key={att.filename} title={att.originalName}>
                                <Box onClick={() => setPreview({ expense, startIndex: attIdx })}
                                  sx={{ width: 32, height: 32, borderRadius: 0.5, cursor: 'pointer',
                                    border: '1px solid', borderColor: 'grey.300', overflow: 'hidden',
                                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'grey.100' }}>
                                  {isImage(att.mimetype)
                                    ? <Box component="img" src={uploadsApi.url(att.filename)} alt={att.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <FileIcon mimetype={att.mimetype} size={18} />}
                                </Box>
                              </Tooltip>
                            ))}
                            {attachments.length > 3 && (
                              <Chip label={`+${attachments.length - 3}`} size="small"
                                onClick={() => setPreview({ expense, startIndex: 3 })}
                                sx={{ cursor: 'pointer', height: 22, fontSize: '0.7rem' }} />
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="PDF herunterladen">
                            <IconButton
                              size="small"
                              onClick={() => handleRowExportPdf(expense)}
                              disabled={rowPdfLoading === expense.id}
                              sx={{ color: '#6366f1' }}
                            >
                              {rowPdfLoading === expense.id
                                ? <CircularProgress size={14} color="inherit" />
                                : <PictureAsPdfIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={stornoSet.has(String(expense.id)) ? 'Bereits storniert' : 'Stornieren'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setStornoTarget(expense)}
                                disabled={stornoSet.has(String(expense.id))}
                                sx={{ color: 'warning.main' }}
                              >
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <IconButton size="small" onClick={() => openEdit(expense)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(expense)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>

              <TableFooter>
                <TableRow sx={{ '& td': { borderTop: '2px solid', borderTopColor: 'grey.300', backgroundColor: '#f0fdf4', py: 0.75 } }}>
                  <TableCell colSpan={showTimestamps ? 6 : 4} sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'success.dark' }}>
                    {hasFilter ? 'Einnahmen (gefiltert)' : 'Einnahmen'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'success.main' }}>
                    {fmtEuro(totalEinnahmen)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
                <TableRow sx={{ '& td': { backgroundColor: '#fff5f5', py: 0.75 } }}>
                  <TableCell colSpan={showTimestamps ? 6 : 4} sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'error.dark' }}>
                    {hasFilter ? 'Ausgaben (gefiltert)' : 'Ausgaben'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'error.main' }}>
                    {fmtEuro(totalAusgaben)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
                <TableRow sx={{ '& td': { backgroundColor: 'grey.100', py: 0.75 } }}>
                  <TableCell colSpan={showTimestamps ? 6 : 4} sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                    {hasFilter ? `Saldo (gefiltert, ${filtered.length} Einträge)` : `Saldo (${filtered.length} Einträge)`}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem', color: saldo >= 0 ? 'success.main' : 'error.main' }}>
                    {fmtEuro(saldo)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Zeilen pro Seite:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} von ${count}`}
        />
      </Paper>

      <ExpenseFormDialog
        open={formOpen}
        expense={editExpense}
        persons={persons}
        products={products}
        expenses={expenses}
        onClose={closeForm}
        onSave={handleSave}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <StornoDialog
        open={!!stornoTarget}
        expense={stornoTarget}
        persons={persons}
        products={products}
        onClose={() => setStornoTarget(null)}
        onConfirm={handleStorno}
      />
      <AttachmentsDialog
        open={!!preview}
        attachments={preview?.expense?.attachments || []}
        startIndex={preview?.startIndex ?? 0}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

export default Expenses;
