import React, { useEffect, useMemo, useState } from 'react';
import { Container, Box, Typography, Button, Grid, Paper, Divider, Chip, Fab, useMediaQuery, useTheme } from '@mui/material';
import { LineChart } from '../components/charts/LineChart';
import type { ChartData } from 'chart.js';
import { useParams } from 'react-router-dom';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { MealTrackerForm } from '../components/meals/MealTrackerForm';
import { MealList } from '../components/meals/MealList';

interface Meal { id: number; name: string; date: string; notes?: string; total_nutrients?: Record<string, number>; items?: any[] }

export const MealPlanPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { clientId } = useParams<{ clientId: string }>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormOnMobile, setShowFormOnMobile] = useState(false);

  const fetchMeals = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/meals`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMeals(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeals(); }, [clientId]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const m of meals) {
      const n = m.total_nutrients || {};
      for (const [k, v] of Object.entries(n)) {
        totals[k] = (totals[k] || 0) + (v || 0);
      }
    }
    return totals;
  }, [meals]);

  const caloriesTrend: ChartData<'line'> = useMemo(() => {
    // Group by date and sum calories
    const byDate = new Map<string, number>();
    for (const m of meals) {
      const d = m.date?.slice(0, 10) || 'Unknown';
      const calories = m.total_nutrients?.calories || 0;
      byDate.set(d, (byDate.get(d) || 0) + calories);
    }
    const labels = Array.from(byDate.keys()).sort();
    const data = labels.map(l => byDate.get(l) || 0);
    return {
      labels,
      datasets: [
        {
          label: 'Calories',
          data,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }, [meals]);

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: isMobile ? 10 : 4 }}>
      <Grid container spacing={3}>
        {/* Form Column - hidden on mobile unless toggled */}
        <Grid item xs={12} md={5} sx={{ display: isMobile && !showFormOnMobile ? 'none' : 'block' }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Quick Nutrient Summary</Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.keys(dayTotals).length === 0 && (
                <Typography variant="body2" color="text.secondary">No nutrients yet</Typography>
              )}
              {Object.entries(dayTotals).map(([k, v]) => (
                <Chip key={k} label={`${k}: ${Math.round(v)}`} color="primary" variant="outlined" />
              ))}
            </Box>
          </Paper>

          <MealTrackerForm 
            clientId={clientId || ''} 
            onSaved={() => {
              fetchMeals();
              if (isMobile) setShowFormOnMobile(false);
            }} 
          />
          
          {isMobile && (
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => setShowFormOnMobile(false)}
              sx={{ mt: 2 }}
            >
              Back to Meals
            </Button>
          )}
        </Grid>

        {/* Data Column - hidden on mobile when form is shown */}
        <Grid item xs={12} md={7} sx={{ display: isMobile && showFormOnMobile ? 'none' : 'block' }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Calories Trend</Typography>
            <Divider sx={{ my: 1 }} />
            <LineChart data={caloriesTrend} height={220} />
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Meal History</Typography>
              <Button size="small" onClick={fetchMeals} disabled={loading} startIcon={<RefreshIcon />}>
                Refresh
              </Button>
            </Box>
            <Divider sx={{ my: 1 }} />
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <MealList meals={meals} />
          </Paper>
        </Grid>
      </Grid>

      {/* Mobile FAB for quick add */}
      {isMobile && !showFormOnMobile && (
        <Fab
          color="primary"
          aria-label="add meal"
          onClick={() => setShowFormOnMobile(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Container>
  );
};
