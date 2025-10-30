import { FC, useState } from 'react';
import { Box, Card, CardContent, Tab, Tabs, Typography, useTheme, alpha } from '@mui/material';
import { LineChart } from './LineChart';
import type { ChartData } from 'chart.js';

interface Measurement {
  date: string;
  value: number;
}

interface MeasurementData {
  chest: Measurement[];
  waist: Measurement[];
  hips: Measurement[];
  arms: Measurement[];
  legs: Measurement[];
  weight: Measurement[];
}

interface MeasurementChartsProps {
  data: MeasurementData;
}

type MeasurementKey = keyof MeasurementData;

const measurementLabels: Record<MeasurementKey, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  arms: 'Arms',
  legs: 'Legs',
  weight: 'Weight'
};

export const MeasurementCharts: FC<MeasurementChartsProps> = ({ data }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<MeasurementKey>('weight');

  const handleTabChange = (event: React.SyntheticEvent, newValue: MeasurementKey) => {
    setActiveTab(newValue);
  };

  const prepareChartData = (measurements: Measurement[]): ChartData<'line'> => {
    return {
      labels: measurements.map(m => new Date(m.date).toLocaleDateString()),
      datasets: [
        {
          label: measurementLabels[activeTab],
          data: measurements.map(m => m.value),
          fill: true,
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  };

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.darkGrey.main,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              minWidth: 100,
            },
          }}
        >
          {Object.entries(measurementLabels).map(([key, label]) => (
            <Tab
              key={key}
              label={label}
              value={key}
              sx={{
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
      <CardContent>
        {data[activeTab].length > 0 ? (
          <Box sx={{ height: 400 }}>
            <LineChart
              data={prepareChartData(data[activeTab])}
            />
          </Box>
        ) : (
          <Box
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">
              No {measurementLabels[activeTab].toLowerCase()} measurements recorded yet
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};