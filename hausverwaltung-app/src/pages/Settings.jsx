import { useState, useEffect } from 'react';
import {
  Typography, Box, Stack, Card, CardContent, CardHeader,
  TextField, Button, Divider, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import GppBadIcon from '@mui/icons-material/GppBad';
import ShieldIcon from '@mui/icons-material/Shield';
import CloseIcon from '@mui/icons-material/Close';
import { authApi, systemApi, integrityApi } from '../api';
import { useAuth } from '../context/AuthContext';

// ── Passwort ändern ───────────────────────────────────────────────────────────
function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setStatus({ type: 'error', msg: 'Neues Passwort und Bestätigung stimmen nicht überein' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      setStatus({ type: 'success', msg: 'Passwort erfolgreich geändert' });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      const msg = err.message.includes('falsch') ? 'Aktuelles Passwort falsch'
        : err.message.includes('4') ? 'Passwort muss mindestens 4 Zeichen haben'
        : 'Fehler beim Ändern des Passworts';
      setStatus({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<LockIcon color="primary" />}
        title="Passwort ändern"
        titleTypographyProps={{ fontWeight: 'bold' }}
      />
      <Divider />
      <CardContent>
        {status && (
          <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
            {status.msg}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Aktuelles Passwort"
              type="password"
              value={form.currentPassword}
              onChange={set('currentPassword')}
              required fullWidth size="small"
              autoComplete="current-password"
            />
            <TextField
              label="Neues Passwort"
              type="password"
              value={form.newPassword}
              onChange={set('newPassword')}
              required fullWidth size="small"
              autoComplete="new-password"
              helperText="Mindestens 4 Zeichen"
            />
            <TextField
              label="Neues Passwort bestätigen"
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              required fullWidth size="small"
              autoComplete="new-password"
              error={form.confirm.length > 0 && form.newPassword !== form.confirm}
              helperText={form.confirm.length > 0 && form.newPassword !== form.confirm ? 'Passwörter stimmen nicht überein' : ''}
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              >
                Passwort speichern
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Benutzer hinzufügen Dialog ────────────────────────────────────────────────
function AddUserDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setForm({ username: '', password: '', confirm: '' }); setError(''); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwörter stimmen nicht überein'); return; }
    setLoading(true);
    setError('');
    try {
      const created = await authApi.createUser(form.username, form.password);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message.includes('vergeben') ? 'Benutzername bereits vergeben' : 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Benutzer hinzufügen
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Benutzername" value={form.username} onChange={set('username')}
              required fullWidth size="small" autoFocus autoComplete="off"
            />
            <TextField
              label="Passwort" type="password" value={form.password} onChange={set('password')}
              required fullWidth size="small" autoComplete="new-password"
              helperText="Mindestens 4 Zeichen"
            />
            <TextField
              label="Passwort bestätigen" type="password" value={form.confirm} onChange={set('confirm')}
              required fullWidth size="small" autoComplete="new-password"
              error={form.confirm.length > 0 && form.password !== form.confirm}
              helperText={form.confirm.length > 0 && form.password !== form.confirm ? 'Passwörter stimmen nicht überein' : ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={<AddIcon />}>
            Hinzufügen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ── Benutzerverwaltung ────────────────────────────────────────────────────────
function UsersCard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    authApi.getUsers().then(setUsers);
  }, []);

  const handleCreated = (newUser) => setUsers(u => [...u, newUser]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await authApi.deleteUser(deleteTarget.id);
      setUsers(u => u.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card elevation={2}>
        <CardHeader
          avatar={<PeopleIcon color="primary" />}
          title="Benutzerverwaltung"
          titleTypographyProps={{ fontWeight: 'bold' }}
          action={
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ mr: 1 }}>
              Neu
            </Button>
          }
        />
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'grey.50' } }}>
                <TableCell>Benutzername</TableCell>
                <TableCell>Erstellt am</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {u.username}
                      {u.username === currentUser.username && (
                        <Chip label="Ich" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString('de-DE')}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={u.username === currentUser.username}
                      onClick={() => setDeleteTarget(u)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Benutzer löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Benutzer <strong>{deleteTarget?.username}</strong> wirklich löschen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
          <Button variant="contained" color="error" disabled={deleteLoading} startIcon={<DeleteIcon />} onClick={handleDelete}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── App-Info ──────────────────────────────────────────────────────────────────
function AppInfoCard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    systemApi.getStatus().then(setStatus).catch(() => {});
  }, []);

  const fmtBytes = (b) => {
    if (b == null) return '–';
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
    return (b / 1e6).toFixed(0) + ' MB';
  };

  const fmtUptime = (s) => {
    if (s == null) return '–';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const rows = [
    { label: 'Anwendung', value: 'Buchungssystem' },
    { label: 'Plattform', value: status?.platform ?? '–' },
    { label: 'Node.js', value: status?.nodeVersion ?? '–' },
    { label: 'Serverzeit', value: new Date().toLocaleString('de-DE') },
    { label: 'Uptime', value: fmtUptime(status?.uptime) },
    { label: 'RAM gesamt', value: fmtBytes(status?.memory?.total) },
    { label: 'RAM belegt', value: status?.memory ? `${status.memory.usedPercent}%` : '–' },
  ];

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<InfoIcon color="primary" />}
        title="App-Info"
        titleTypographyProps={{ fontWeight: 'bold' }}
      />
      <Divider />
      <TableContainer>
        <Table size="small">
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.label}>
                <TableCell sx={{ color: 'text.secondary', width: 160 }}>{r.label}</TableCell>
                <TableCell>{r.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ── Integrität prüfen ─────────────────────────────────────────────────────────
const ENTITY_LABELS = { persons: 'Personen', products: 'Kostenstellen', expenses: 'Kosten' };

function IntegrityCard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      setResult(await integrityApi.verify());
    } catch {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        avatar={<ShieldIcon color="primary" />}
        title="Datenintegrität prüfen"
        titleTypographyProps={{ fontWeight: 'bold' }}
        subheader="Kryptografische Hash-Kette (SHA-256) zur Manipulationserkennung"
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={runCheck}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <VerifiedIcon />}
            sx={{ mr: 1 }}
          >
            Jetzt prüfen
          </Button>
        }
      />
      <Divider />
      <CardContent>
        {!result && !loading && (
          <Typography color="text.secondary" variant="body2">
            Klicke auf „Jetzt prüfen" um die Integrität aller gespeicherten Daten zu verifizieren.
            Jeder Eintrag ist kryptografisch mit dem vorherigen verkettet — eine Änderung an einem
            Eintrag bricht die gesamte Kette.
          </Typography>
        )}

        {result?.error && (
          <Alert severity="error">Prüfung fehlgeschlagen — Server nicht erreichbar.</Alert>
        )}

        {result && !result.error && (
          <Stack spacing={2}>
            <Alert
              severity={result.valid ? 'success' : 'error'}
              icon={result.valid ? <VerifiedIcon /> : <GppBadIcon />}
            >
              {result.valid
                ? 'Alle Daten integer – keine Manipulation erkannt.'
                : 'Integritätsverletzung erkannt! Mindestens ein Eintrag wurde manipuliert.'}
              <Typography variant="caption" display="block" sx={{ opacity: 0.75, mt: 0.25 }}>
                Geprüft am {new Date(result.checkedAt).toLocaleString('de-DE')}
              </Typography>
            </Alert>

            {Object.entries(result.results).map(([entity, r]) => (
              <Box key={entity}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {r.valid
                    ? <VerifiedIcon fontSize="small" color="success" />
                    : <GppBadIcon fontSize="small" color="error" />}
                  <Typography fontWeight="bold">{ENTITY_LABELS[entity] ?? entity}</Typography>
                  <Chip label={`${r.count} Einträge`} size="small" variant="outlined" />
                  <Chip
                    label={r.valid ? 'integer' : `${r.violations.length} Verletzung(en)`}
                    size="small"
                    color={r.valid ? 'success' : 'error'}
                  />
                </Box>

                {r.violations.length > 0 && (
                  <TableContainer component="div" sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: 'error.50' } }}>
                          <TableCell>ID</TableCell>
                          <TableCell>Erstellt am</TableCell>
                          <TableCell>Gespeicherter Hash</TableCell>
                          <TableCell>Erwarteter Hash</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {r.violations.map(v => (
                          <TableRow key={v.id}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{v.id}</TableCell>
                            <TableCell>{new Date(v.createdAt).toLocaleString('de-DE')}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'error.main' }}>
                              {v.actual ? v.actual.slice(0, 16) + '…' : '–'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: 'success.main' }}>
                              {v.expected.slice(0, 16)}…
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Einstellungen</Typography>
      <Stack spacing={3}>
        <IntegrityCard />
        <ChangePasswordCard />
        <UsersCard />
        <AppInfoCard />
      </Stack>
    </Box>
  );
}
