import { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fmtEuro } from '../utils/format';

const FALLBACK_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0',
  '#0288d1', '#d32f2f', '#f57c00', '#00796b',
];

function PersonPieChart({ person, data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1} justifyContent="center">
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: person.color, flexShrink: 0 }} />
        <Typography variant="subtitle2" fontWeight="bold">{person.name}</Typography>
        <Typography variant="caption" color="text.secondary">({fmtEuro(total)})</Typography>
      </Box>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            innerRadius={35}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => fmtEuro(value)} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

function ExpenseChart({ expenses, persons, products }) {
  const personCharts = useMemo(() => {
    if (!expenses.length || !persons.length || !products.length) return [];

    return persons
      .map((person) => {
        const data = products
          .map(product => ({
            name: product.name,
            value: parseFloat(
              expenses
                .filter(e => String(e.personId) === String(person.id) && String(e.productId) === String(product.id))
                .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                .toFixed(2)
            ),
          }))
          .filter(d => d.value > 0);

        return { person, data };
      })
      .filter(({ data }) => data.length > 0);
  }, [expenses, persons, products]);

  if (!personCharts.length) {
    return (
      <Paper sx={{ p: 3 }} elevation={2}>
        <Typography variant="h6" gutterBottom>Ausgaben pro Person</Typography>
        <Box display="flex" alignItems="center" justifyContent="center" height={120}>
          <Typography color="text.secondary">Keine Daten vorhanden</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }} elevation={2}>
      <Typography variant="h6" gutterBottom>Ausgaben pro Person</Typography>
      <div className={`grid gap-4 ${personCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {personCharts.map(({ person, data }) => (
          <PersonPieChart key={person.id} person={person} data={data} />
        ))}
      </div>
    </Paper>
  );
}

export default ExpenseChart;
