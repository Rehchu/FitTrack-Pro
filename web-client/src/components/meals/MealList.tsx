import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';

interface MealItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
}

interface Meal {
  id: number;
  name: string;
  date: string;
  notes?: string;
  total_nutrients?: Record<string, number>;
  items?: MealItem[];
}

interface MealListProps {
  meals: Meal[];
}

export const MealList: React.FC<MealListProps> = ({ meals }) => {
  return (
    <Grid container spacing={2}>
      {meals.map(m => (
        <Grid item xs={12} md={6} key={m.id}>
          <Card>
            <CardContent>
              <Typography variant="h6">{m.name}</Typography>
              <Typography variant="caption">{new Date(m.date).toLocaleString()}</Typography>
              {m.notes && <Typography variant="body2">{m.notes}</Typography>}

              {m.items && (
                <Box sx={{ mt: 1 }}>
                  {m.items.map(it => (
                    <Typography variant="body2" key={it.id}>{it.name} — {it.quantity} {it.unit || ''}</Typography>
                  ))}
                </Box>
              )}

              {m.total_nutrients && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Nutrients</Typography>
                  {Object.entries(m.total_nutrients).map(([k,v]) => (
                    <Typography key={k} variant="body2">{k}: {v}</Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
