import { useState, useEffect } from 'react';
import {
  Typography, TextField, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Box, Tooltip, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
              component="input"
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              sx={{ position: 'absolute', top: -4, left: -4, width: 36, height: 36, border: 'none', cursor: 'pointer', padding: 0 }}
            />
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function Persons() {
  const [persons, setPersons] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    personsApi.getAll().then(setPersons);
  }, []);

  const savePerson = async (e) => {
    e.preventDefault();
    if (editingId) {
      const updated = await personsApi.update(editingId, formData);
      setPersons(prev => prev.map(p => p.id === editingId ? updated : p));
      setEditingId(null);
    } else {
      const created = await personsApi.create(formData);
      setPersons(prev => [...prev, created]);
    }
    setFormData(emptyForm);
  };

  const editPerson = (person) => {
    setFormData({ name: person.name, color: person.color || PRESET_COLORS[0] });
    setEditingId(person.id);
  };

  const deletePerson = async (id) => {
    if (confirm('Person wirklich löschen?')) {
      await personsApi.remove(id);
      setPersons(prev => prev.filter(p => p.id !== id));
    }
  };

  const cancelEdit = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Personen Verwaltung</Typography>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

        {/* Formular */}
        <Paper sx={{ p: 3 }} elevation={2}>
          <Typography variant="h6" gutterBottom>
            {editingId ? 'Person bearbeiten' : 'Person hinzufügen'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box component="form" onSubmit={savePerson}>
            <Stack spacing={3}>
              <TextField
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                size="small"
              />
              <ColorPicker value={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
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
            <Typography variant="h6">Alle Personen ({persons.length})</Typography>
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
                          <Button size="small" startIcon={<EditIcon />} onClick={() => editPerson(person)}>
                            Bearbeiten
                          </Button>
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deletePerson(person.id)}>
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

export default Persons;
