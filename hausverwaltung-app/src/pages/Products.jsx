import { useState, useEffect } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { productsApi } from '../api';

const emptyForm = { name: '', description: '', category: '' };

function Products() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    productsApi.getAll().then(setProducts);
  }, []);

  const saveProduct = async (e) => {
    e.preventDefault();
    if (editingId) {
      const updated = await productsApi.update(editingId, formData);
      setProducts(prev => prev.map(p => p.id === editingId ? updated : p));
      setEditingId(null);
    } else {
      const created = await productsApi.create(formData);
      setProducts(prev => [...prev, created]);
    }
    setFormData(emptyForm);
  };

  const editProduct = (product) => {
    setFormData({ name: product.name, description: product.description, category: product.category });
    setEditingId(product.id);
  };

  const deleteProduct = async (id) => {
    if (confirm('Produkt wirklich löschen?')) {
      await productsApi.remove(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const cancelEdit = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Produkte Verwaltung</Typography>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

        {/* Formular */}
        <Paper sx={{ p: 3 }} elevation={2}>
          <Typography variant="h6" gutterBottom>
            {editingId ? 'Produkt bearbeiten' : 'Produkt hinzufügen'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="form" onSubmit={saveProduct}>
            <Stack spacing={2}>
              <TextField
                label="Produktname *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                size="small"
              />
              <TextField
                label="Beschreibung"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
              <TextField
                label="Kategorie"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
                size="small"
                placeholder="z.B. Instandhaltung, Reinigung..."
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

        {/* Liste */}
        <Paper elevation={2}>
          <Box px={3} py={2}>
            <Typography variant="h6">Alle Produkte ({products.length})</Typography>
          </Box>
          <Divider />
          {products.length === 0 ? (
            <Box px={3} py={4} textAlign="center">
              <Typography color="text.secondary">Noch keine Produkte vorhanden</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 400 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50' } }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell>Kategorie</TableCell>
                    <TableCell align="right">Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id} hover>
                      <TableCell>{product.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{product.description}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" startIcon={<EditIcon />} onClick={() => editProduct(product)}>
                            Bearbeiten
                          </Button>
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteProduct(product.id)}>
                            Löschen
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

      </div>
    </div>
  );
}

export default Products;
