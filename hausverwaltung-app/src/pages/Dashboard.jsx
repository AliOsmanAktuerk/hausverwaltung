import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EuroIcon from '@mui/icons-material/Euro';
import ExpenseChart from '../components/ExpenseChart';
import { personsApi, productsApi, expensesApi } from '../api';

const statCards = [
  { key: 'totalPersons', label: 'Personen', Icon: PeopleIcon, color: '#1976d2' },
  { key: 'totalProducts', label: 'Produkte', Icon: InventoryIcon, color: '#2e7d32' },
  { key: 'totalExpenses', label: 'Kostenpositionen', Icon: ReceiptIcon, color: '#ed6c02' },
  { key: 'totalAmount', label: 'Gesamtkosten', Icon: EuroIcon, color: '#9c27b0', format: (v) => `${v.toFixed(2)} €` },
];

function Dashboard() {
  const [stats, setStats] = useState({ totalPersons: 0, totalProducts: 0, totalExpenses: 0, totalAmount: 0 });
  const [expenses, setExpenses] = useState([]);
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      personsApi.getAll(),
      productsApi.getAll(),
      expensesApi.getAll(),
    ]).then(([loadedPersons, loadedProducts, loadedExpenses]) => {
      const totalAmount = loadedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      setPersons(loadedPersons);
      setProducts(loadedProducts);
      setExpenses(loadedExpenses);
      setStats({
        totalPersons: loadedPersons.length,
        totalProducts: loadedProducts.length,
        totalExpenses: loadedExpenses.length,
        totalAmount,
      });
    });
  }, []);

  return (
    <div>
      <Typography variant="h5" gutterBottom fontWeight="bold">Dashboard – Übersicht</Typography>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">

        {/* Stat-Karten 2×2 */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map(({ key, label, Icon, color, format }) => (
            <Card key={key} sx={{ boxShadow: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography color="text.secondary" variant="caption" lineHeight={1.2}>{label}</Typography>
                  <Icon sx={{ color, fontSize: 20 }} />
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {format ? format(stats[key]) : stats[key]}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <ExpenseChart expenses={expenses} persons={persons} products={products} />

      </div>
    </div>
  );
}

export default Dashboard;
