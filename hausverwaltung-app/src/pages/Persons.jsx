import { useState, useEffect } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box, Tooltip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { personsApi } from '../api';

const PRESET_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0',
  '#0288d1', '#d32f2f', '#f57c00', '#00796b',
  '#5d4037', '#455a64',
];

const emptyForm = { name: '', color: PRESET_COLORS[0] };

function ColorPicker({ value, onChange }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        Farbe
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {PRESET_COLORS.map(color => (
          <Tooltip key={color} title={color}>
            <Box
              onClick={() => onChange(color)}
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: color, cursor: 'pointer',
                border: value === color ? '3px solid #000' : '2px solid transparent',
                outline: value === color ? '2px solid #fff' : 'none',
                outlineOffset: '-4px',
                transition: 'transform 0.1s',
                '&:hover': { transform: 'scale(1.2)' },
              }}
            />
          </Tooltip>
        ))}
        <Tooltip title="Eigene Farbe">
          <Box
            component="label"
            sx={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', border: '2px solid #ccc', position: 'relative' }}
          >
            <Box
              component="input" type="color" value={value}
              onChange={(e) => onChange(e.target.value)}
              sx={{ position: 'absolute', top: -4, left: -4, width: 36, height: 36, border: 'none', cursor: 'pointer', padding: 0 }}
            />
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
}

// ── Formular-Modal ────────────────────────────────────────────────────────────
function PersonFormDialog({ open, person, onClose, onSave }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setFormData(person ? { name: person.name, color: person.color || PRESET_COLORS[0] } : emptyForm);
  }, [person, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {person ? 'Person bearbeiten' : 'Person hinzufügen'}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={3}>
            <TextField
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required fullWidth size="small" autoFocus
            />
            <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" startIcon={person ? <EditIcon /> : <AddIcon />}>
            {person ? 'Aktualisieren' : 'Hinzufügen'}
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
      <DialogTitle>Person löschen</DialogTitle>
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
function Persons() {
  const [persons, setPersons] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editPerson, setEditPerson] = useState(null);   // null = neu anlegen
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    personsApi.getAll().then(setPersons);
  }, []);

  const openCreate = () => { setEditPerson(null); setFormOpen(true); };
  const openEdit = (person) => { setEditPerson(person); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  const handleSave = async (formData) => {
    if (editPerson) {
      const updated = await personsApi.update(editPerson.id, formData);
      setPersons(prev => prev.map(p => p.id === editPerson.id ? updated : p));
    } else {
      const created = await personsApi.create(formData);
      setPersons(prev => [...prev, created]);
    }
    closeForm();
  };

  const handleDelete = async () => {
    await personsApi.remove(deleteTarget.id);
    setPersons(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Personen Verwaltung</Typography>

      <Paper elevation={2}>
        <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Alle Personen ({persons.length})</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Neu
          </Button>
        </Box>
        <Divider />
        {persons.length === 0 ? (
          <Box px={3} py={4} textAlign="center">
            <Typography color="text.secondary">Noch keine Personen vorhanden</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50' } }}>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {persons.map(person => (
                  <TableRow key={person.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: person.color || '#1976d2', flexShrink: 0 }} />
                        {person.name}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => openEdit(person)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(person)}>
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

      <PersonFormDialog
        open={formOpen}
        person={editPerson}
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

export default Persons;
