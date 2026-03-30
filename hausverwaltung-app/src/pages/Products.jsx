import { useState, useEffect, useMemo } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box, Divider,
  InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { productsApi } from '../api';

const emptyForm = { name: '', description: '', category: '' };

// ── Formular-Modal ────────────────────────────────────────────────────────────
function ProductFormDialog({ open, product, onClose, onSave }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setFormData(product ? { name: product.name, description: product.description, category: product.category } : emptyForm);
  }, [product, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product ? 'Produkt bearbeiten' : 'Produkt hinzufügen'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Produktname *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required fullWidth size="small" autoFocus
            />
            <TextField
              label="Beschreibung"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth size="small" multiline rows={2}
            />
            <TextField
              label="Kostenstelle"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth size="small"
              placeholder="z.B. Instandhaltung, Reinigung…"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" startIcon={product ? <EditIcon /> : <AddIcon />}>
            {product ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ── Löschen-Modal ─────────────────────────────────────────────────────────────
function DeleteDialog({ open, name, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Produkt löschen</DialogTitle>
      <DialogContent>
        <Typography>
          <strong>{name}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </Typography>
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

// ── Hauptkomponente ───────────────────────────────────────────────────────────
function Products() {
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    productsApi.getAll().then(setProducts);
  }, []);

  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, filterCategory]);

  const hasFilter = search || filterCategory;

  const openCreate = () => { setEditProduct(null); setFormOpen(true); };
  const openEdit = (product) => { setEditProduct(product); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const handleSave = async (formData) => {
    if (editProduct) {
      const updated = await productsApi.update(editProduct.id, formData);
      setProducts(prev => prev.map(p => p.id === editProduct.id ? updated : p));
    } else {
      const created = await productsApi.create(formData);
      setProducts(prev => [...prev, created]);
    }
    closeForm();
  };

  const handleDelete = async () => {
    await productsApi.remove(deleteTarget.id);
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Produkte Verwaltung</Typography>

      <Paper elevation={2}>
        <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Alle Produkte ({filtered.length}{hasFilter && filtered.length !== products.length ? ` von ${products.length}` : ''})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Neu
          </Button>
        </Box>

        {/* Filterleiste */}
        <Box px={3} pb={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              placeholder="Suche nach Name, Beschreibung, Kostenstelle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Kostenstelle</InputLabel>
              <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} label="Kostenstelle">
                <MenuItem value="">Alle</MenuItem>
                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            {hasFilter && (
              <Button size="small" onClick={() => { setSearch(''); setFilterCategory(''); }}>
                Zurücksetzen
              </Button>
            )}
          </Stack>
        </Box>

        <Divider />
        {filtered.length === 0 ? (
          <Box px={3} py={4} textAlign="center">
            <Typography color="text.secondary">
              {products.length === 0 ? 'Noch keine Produkte vorhanden' : 'Keine Ergebnisse für diesen Filter'}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 400 }}>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50' } }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Beschreibung</TableCell>
                  <TableCell>Kostenstelle</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(product => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{product.description}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => openEdit(product)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(product)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ProductFormDialog
        open={formOpen}
        product={editProduct}
        onClose={closeForm}
        onSave={handleSave}
      />
      <DeleteDialog
        open={!!deleteTarget}
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default Products;
