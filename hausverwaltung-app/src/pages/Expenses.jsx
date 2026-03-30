import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider,
  IconButton, Tooltip, Dialog, DialogContent, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { expensesApi, personsApi, productsApi, uploadsApi } from '../api';

const paymentMethods = ['Bar', 'Karte', 'Überweisung', 'Lastschrift'];
const paymentColors = { Bar: 'default', Karte: 'primary', Überweisung: 'success', Lastschrift: 'warning' };

const emptyForm = {
  personId: '', productId: '', amount: '', paymentMethod: 'Bar',
  date: new Date().toISOString().split('T')[0], note: '', attachments: []
};

function isImage(mimetype) {
  return mimetype?.startsWith('image/');
}

function FileIcon({ mimetype, size = 20 }) {
  if (isImage(mimetype)) return <ImageIcon sx={{ fontSize: size, color: '#1976d2' }} />;
  if (mimetype === 'application/pdf') return <PictureAsPdfIcon sx={{ fontSize: size, color: '#d32f2f' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: size, color: '#757575' }} />;
}

// ── Upload-Zone ────────────────────────────────────────────────────────────────
function FileUploadZone({ attachments, onAdd, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    setUploading(true);
    for (const file of files) {
      try {
        const result = await uploadsApi.upload(file);
        onAdd(result);
      } catch (err) {
        console.error('Upload fehlgeschlagen:', err);
      }
    }
    setUploading(false);
    // Input zurücksetzen damit gleiche Datei erneut gewählt werden kann
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        Anhänge
      </Typography>

      {/* Drop-Zone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles([...e.dataTransfer.files]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        sx={{
          border: `2px dashed ${dragging ? '#1976d2' : '#ccc'}`,
          borderRadius: 1,
          p: 1.5,
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          backgroundColor: dragging ? 'rgba(25,118,210,0.05)' : 'transparent',
          transition: 'all 0.15s',
          '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.03)' },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => handleFiles([...e.target.files])}
        />
        <AttachFileIcon sx={{ fontSize: 20, color: 'text.disabled', mb: 0.5 }} />
        <Typography variant="caption" color="text.secondary" display="block">
          {uploading ? 'Wird hochgeladen…' : 'Dateien ablegen oder klicken'}
        </Typography>
      </Box>

      {/* Angehängte Dateien */}
      {attachments.length > 0 && (
        <Stack spacing={0.5} mt={1}>
          {attachments.map((att) => (
            <Box
              key={att.filename}
              display="flex"
              alignItems="center"
              gap={1}
              sx={{
                px: 1, py: 0.5, borderRadius: 1,
                backgroundColor: 'grey.50',
                border: '1px solid', borderColor: 'grey.200',
              }}
            >
              <FileIcon mimetype={att.mimetype} size={16} />
              <Typography
                variant="caption"
                flex={1}
                noWrap
                component="a"
                href={uploadsApi.url(att.filename)}
                target="_blank"
                rel="noreferrer"
                sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {att.originalName}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onRemove(att)}
                sx={{ p: 0.25 }}
              >
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

  // Index bei erneutem Öffnen synchronisieren
  useEffect(() => { if (open) setIdx(startIndex); }, [open, startIndex]);

  const prev = useCallback(() => setIdx(i => (i - 1 + attachments.length) % attachments.length), [attachments.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % attachments.length), [attachments.length]);

  // Tastaturnavigation
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { backgroundColor: '#111', color: '#fff', m: { xs: 1, sm: 2 } } }}
    >
      <DialogContent sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>

        {/* Header-Leiste */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        }}>
          <FileIcon mimetype={att.mimetype} size={18} />
          <Typography variant="body2" noWrap flex={1} sx={{ color: '#eee' }}>
            {att.originalName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#aaa', whiteSpace: 'nowrap' }}>
            {idx + 1} / {attachments.length}
          </Typography>
          <Tooltip title="In neuem Tab öffnen">
            <IconButton size="small" component="a" href={uploadsApi.url(att.filename)} target="_blank" rel="noreferrer" sx={{ color: '#ccc' }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: '#ccc' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Vorschau-Bereich */}
        <Box sx={{ minHeight: { xs: 280, sm: 480 }, display: 'flex', alignItems: 'center', justifyContent: 'center', pt: '48px', pb: '48px' }}>
          {isImage(att.mimetype) && (
            <Box
              component="img"
              src={uploadsApi.url(att.filename)}
              alt={att.originalName}
              sx={{ maxWidth: '100%', maxHeight: { xs: 260, sm: 440 }, objectFit: 'contain' }}
            />
          )}
          {att.mimetype === 'application/pdf' && (
            <Box
              component="iframe"
              src={uploadsApi.url(att.filename)}
              title={att.originalName}
              sx={{ width: '100%', height: { xs: 360, sm: 520 }, border: 'none' }}
            />
          )}
          {!isImage(att.mimetype) && att.mimetype !== 'application/pdf' && (
            <Stack alignItems="center" spacing={2}>
              <FileIcon mimetype={att.mimetype} size={64} />
              <Typography sx={{ color: '#ccc' }}>{att.originalName}</Typography>
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                component="a"
                href={uploadsApi.url(att.filename)}
                target="_blank"
                rel="noreferrer"
                sx={{ color: '#fff', borderColor: '#666' }}
              >
                Datei öffnen
              </Button>
            </Stack>
          )}
        </Box>

        {/* Navigation Links/Rechts */}
        {attachments.length > 1 && (
          <>
            <IconButton
              onClick={prev}
              sx={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={next}
              sx={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}

        {/* Thumbnail-Leiste unten */}
        {attachments.length > 1 && (
          <Box sx={{
            display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap',
            px: 2, py: 1, backgroundColor: 'rgba(0,0,0,0.6)',
            position: 'absolute', bottom: 0, left: 0, right: 0,
          }}>
            {attachments.map((a, i) => (
              <Box
                key={a.filename}
                onClick={() => setIdx(i)}
                sx={{
                  width: 40, height: 40, borderRadius: 0.5, overflow: 'hidden',
                  cursor: 'pointer', flexShrink: 0,
                  border: `2px solid ${i === idx ? '#fff' : 'transparent'}`,
                  opacity: i === idx ? 1 : 0.5,
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#333',
                }}
              >
                {isImage(a.mimetype)
                  ? <Box component="img" src={uploadsApi.url(a.filename)} alt={a.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <FileIcon mimetype={a.mimetype} size={20} />
                }
              </Box>
            ))}
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null); // { expense, startIndex }
  const [search, setSearch] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    Promise.all([
      expensesApi.getAll(),
      personsApi.getAll(),
      productsApi.getAll(),
    ]).then(([e, p, pr]) => {
      setExpenses(e);
      setPersons(p);
      setProducts(pr);
    });
  }, []);

  const saveExpense = async (e) => {
    e.preventDefault();
    if (editingId) {
      const updated = await expensesApi.update(editingId, formData);
      setExpenses(prev => prev.map(exp => exp.id === editingId ? updated : exp));
      setEditingId(null);
    } else {
      const created = await expensesApi.create(formData);
      setExpenses(prev => [...prev, created]);
    }
    setFormData(emptyForm);
  };

  const editExpense = (expense) => {
    setFormData({
      personId: expense.personId,
      productId: expense.productId,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: expense.date,
      note: expense.note,
      attachments: expense.attachments || [],
    });
    setEditingId(expense.id);
  };

  const deleteExpense = async (id) => {
    if (confirm('Kostenposition wirklich löschen?')) {
      // Anhänge vom Server entfernen
      const expense = expenses.find(e => e.id === id);
      for (const att of expense?.attachments || []) {
        await uploadsApi.remove(att.filename);
      }
      await expensesApi.remove(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const cancelEdit = () => { setFormData(emptyForm); setEditingId(null); };

  const update = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const addAttachment = (att) => {
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, att] }));
  };

  const removeAttachment = async (att) => {
    await uploadsApi.remove(att.filename);
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.filename !== att.filename),
    }));
  };

  const getPersonName = (personId) => persons.find(p => String(p.id) === String(personId))?.name ?? 'Unbekannt';
  const getProductName = (productId) => products.find(p => String(p.id) === String(productId))?.name ?? 'Unbekannt';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter(exp => {
      const personName = getPersonName(exp.personId).toLowerCase();
      const productName = getProductName(exp.productId).toLowerCase();
      const matchesSearch = !q ||
        personName.includes(q) ||
        productName.includes(q) ||
        exp.note?.toLowerCase().includes(q) ||
        String(exp.amount).includes(q);
      const matchesPerson = !filterPerson || String(exp.personId) === String(filterPerson);
      const matchesProduct = !filterProduct || String(exp.productId) === String(filterProduct);
      const matchesPayment = !filterPayment || exp.paymentMethod === filterPayment;
      const matchesFrom = !filterDateFrom || exp.date >= filterDateFrom;
      const matchesTo = !filterDateTo || exp.date <= filterDateTo;
      return matchesSearch && matchesPerson && matchesProduct && matchesPayment && matchesFrom && matchesTo;
    });
  }, [expenses, search, filterPerson, filterProduct, filterPayment, filterDateFrom, filterDateTo, persons, products]);

  const hasFilter = search || filterPerson || filterProduct || filterPayment || filterDateFrom || filterDateTo;

  const resetFilters = () => {
    setSearch(''); setFilterPerson(''); setFilterProduct('');
    setFilterPayment(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Kosten Dokumentation</Typography>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* Formular */}
        <Paper sx={{ p: 3 }} elevation={2}>
          <Typography variant="h6" gutterBottom>
            {editingId ? 'Kosten bearbeiten' : 'Kosten hinzufügen'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="form" onSubmit={saveExpense}>
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
                  label="Betrag (€) *"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={formData.amount}
                  onChange={update('amount')}
                  required
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Datum *"
                  type="date"
                  value={formData.date}
                  onChange={update('date')}
                  required
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </div>

              <FormControl fullWidth size="small">
                <InputLabel>Zahlungsart</InputLabel>
                <Select value={formData.paymentMethod} onChange={update('paymentMethod')} label="Zahlungsart">
                  {paymentMethods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField
                label="Notiz"
                value={formData.note}
                onChange={update('note')}
                fullWidth
                size="small"
                placeholder="Optional"
              />

              <FileUploadZone
                attachments={formData.attachments}
                onAdd={addAttachment}
                onRemove={removeAttachment}
              />

              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" startIcon={editingId ? <EditIcon /> : <AddIcon />}>
                  {editingId ? 'Aktualisieren' : 'Hinzufügen'}
                </Button>
                {editingId && (
                  <Button variant="outlined" onClick={cancelEdit}>Abbrechen</Button>
                )}
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {/* Tabelle */}
        <Paper elevation={2}>
          <Box px={3} py={2}>
            <Typography variant="h6">
              Alle Kostenpositionen ({filtered.length}{hasFilter && filtered.length !== expenses.length ? ` von ${expenses.length}` : ''})
            </Typography>
          </Box>

          {/* Filterleiste */}
          <Box px={3} pb={2}>
            <Stack spacing={1}>
              {/* Zeile 1: Suche + Person + Produkt */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  size="small"
                  placeholder="Suche nach Person, Produkt, Notiz…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

              {/* Zeile 2: Zahlungsart + Datum von/bis + Reset */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Zahlungsart</InputLabel>
                  <Select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} label="Zahlungsart">
                    <MenuItem value="">Alle</MenuItem>
                    {paymentMethods.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small" type="date" label="Von"
                  value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
                />
                <TextField
                  size="small" type="date" label="Bis"
                  value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
                />
                {hasFilter && (
                  <Button size="small" onClick={resetFilters}>Zurücksetzen</Button>
                )}
              </Stack>
            </Stack>
          </Box>

          <Divider />
          {filtered.length === 0 ? (
            <Box px={3} py={4} textAlign="center">
              <Typography color="text.secondary">
                {expenses.length === 0 ? 'Noch keine Kostenpositionen vorhanden' : 'Keine Ergebnisse für diesen Filter'}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50' } }}>
                    <TableCell>Datum</TableCell>
                    <TableCell>Person</TableCell>
                    <TableCell>Produkt</TableCell>
                    <TableCell>Betrag</TableCell>
                    <TableCell>Zahlung</TableCell>
                    <TableCell>Notiz</TableCell>
                    <TableCell>Anhänge</TableCell>
                    <TableCell align="right">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(expense => {
                    const attachments = expense.attachments || [];
                    return (
                      <TableRow key={expense.id} hover>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>{getPersonName(expense.personId)}</TableCell>
                        <TableCell>{getProductName(expense.productId)}</TableCell>
                        <TableCell sx={{ fontWeight: 'medium' }}>{parseFloat(expense.amount).toFixed(2)} €</TableCell>
                        <TableCell>
                          <Chip
                            label={expense.paymentMethod}
                            color={paymentColors[expense.paymentMethod] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{expense.note}</TableCell>
                        <TableCell>
                          {attachments.length > 0 ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {attachments.slice(0, 3).map((att, attIdx) => (
                                <Tooltip key={att.filename} title={att.originalName}>
                                  <Box
                                    onClick={() => setPreview({ expense, startIndex: attIdx })}
                                    sx={{
                                      width: 32, height: 32, borderRadius: 0.5, cursor: 'pointer',
                                      border: '1px solid', borderColor: 'grey.300',
                                      overflow: 'hidden', flexShrink: 0,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      backgroundColor: 'grey.100',
                                    }}
                                  >
                                    {isImage(att.mimetype)
                                      ? <Box component="img" src={uploadsApi.url(att.filename)} alt={att.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : <FileIcon mimetype={att.mimetype} size={18} />
                                    }
                                  </Box>
                                </Tooltip>
                              ))}
                              {attachments.length > 3 && (
                                <Chip
                                  label={`+${attachments.length - 3}`}
                                  size="small"
                                  onClick={() => setPreview({ expense, startIndex: 3 })}
                                  sx={{ cursor: 'pointer', height: 22, fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" startIcon={<EditIcon />} onClick={() => editExpense(expense)}>
                              Bearbeiten
                            </Button>
                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteExpense(expense.id)}>
                              Löschen
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </div>

      {/* Lightbox */}
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
