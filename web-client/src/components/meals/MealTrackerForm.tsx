import React, { useState } from 'react';
import { Box, Button, TextField, Grid, Paper, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface MealItem {
  name: string;
  quantity: number;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

interface MealTrackerFormProps {
  clientId: string;
  onSaved?: () => void;
}

export const MealTrackerForm: React.FC<MealTrackerFormProps> = ({ clientId, onSaved }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MealItem[]>([{ name: '', quantity: 1 }] );
  const [loading, setLoading] = useState(false);

  const addItem = () => setItems(prev => [...prev, { name: '', quantity: 1 }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, patch: Partial<MealItem>) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // compute totals
      const totals = items.reduce((acc, it) => {
        acc.calories = (acc.calories || 0) + (it.calories || 0);
        acc.protein = (acc.protein || 0) + (it.protein || 0);
        acc.carbs = (acc.carbs || 0) + (it.carbs || 0);
        acc.fat = (acc.fat || 0) + (it.fat || 0);
        acc.fiber = (acc.fiber || 0) + (it.fiber || 0);
        acc.sodium = (acc.sodium || 0) + (it.sodium || 0);
        return acc;
      }, {} as Record<string, number>);

      const payload = {
        client_id: Number(clientId),
        name,
        notes,
        items: items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
          fiber: i.fiber,
          sodium: i.sodium,
        })),
        total_nutrients: totals
      };
      await fetch(`/api/clients/${clientId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setName(''); setNotes(''); setItems([{ name: '', quantity: 1 }]);
      onSaved && onSaved();
    } catch (err) {
      console.error('Failed to save meal', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Record Meal</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth value={name} onChange={e => setName(e.target.value)} label="Meal name" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth value={notes} onChange={e => setNotes(e.target.value)} label="Notes (optional)" />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1">Items</Typography>
          </Grid>

          {items.map((item, idx) => (
            <Grid item xs={12} key={idx} container spacing={1} alignItems="center">
              <Grid item xs={6}>
                <TextField fullWidth value={item.name} onChange={e => updateItem(idx, { name: e.target.value })} label="Item name" />
              </Grid>
              <Grid item xs={3}>
                <TextField fullWidth type="number" value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} label="Qty" />
              </Grid>
              <Grid item xs={2}>
                <TextField fullWidth value={item.unit || ''} onChange={e => updateItem(idx, { unit: e.target.value })} label="Unit" />
              </Grid>
              <Grid item xs={1}>
                <IconButton onClick={() => removeItem(idx)} size="small"><RemoveIcon /></IconButton>
              </Grid>

              <Grid item xs={12} md={8}>
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Calories" value={item.calories || ''} onChange={e => updateItem(idx, { calories: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Protein (g)" value={item.protein || ''} onChange={e => updateItem(idx, { protein: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Carbs (g)" value={item.carbs || ''} onChange={e => updateItem(idx, { carbs: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Fat (g)" value={item.fat || ''} onChange={e => updateItem(idx, { fat: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Fiber (g)" value={item.fiber || ''} onChange={e => updateItem(idx, { fiber: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField fullWidth type="number" label="Sodium (mg)" value={item.sodium || ''} onChange={e => updateItem(idx, { sodium: Number(e.target.value) })} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth variant="outlined" onClick={async () => {
                  // Build natural language text
                  const text = `${item.quantity || 1} ${item.unit || ''} ${item.name}`.trim();
                  try {
                    const res = await fetch('/api/clients/nutrition/natural', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    const food = (data.foods && data.foods[0]) || null;
                    if (food) {
                      updateItem(idx, {
                        calories: food.nf_calories ?? item.calories,
                        protein: food.nf_protein ?? item.protein,
                        carbs: food.nf_total_carbohydrate ?? item.carbs,
                        fat: food.nf_total_fat ?? item.fat,
                        fiber: food.nf_dietary_fiber ?? item.fiber,
                        sodium: food.nf_sodium ?? item.sodium,
                      });
                    }
                  } catch (e) {
                    console.error('Lookup failed', e);
                  }
                }}>Lookup Nutrients</Button>
              </Grid>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Button startIcon={<AddIcon />} onClick={addItem}>Add Item</Button>
          </Grid>

          <Grid item xs={12}>
            <Button variant="contained" type="submit" disabled={loading}>Save Meal</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};
