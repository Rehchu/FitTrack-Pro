import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PhotoIcon from '@mui/icons-material/Photo';
import { format } from 'date-fns';
import { LineChart } from '../charts/LineChart';

interface Measurement {
  id: number;
  date: string;
  weight: number;
  body_fat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  notes?: string;
  photos?: string[];
}

interface MeasurementListProps {
  measurements: Measurement[];
  onEdit?: (measurement: Measurement) => void;
  onViewPhotos?: (photos: string[]) => void;
}

const formatDate = (date: string) => format(new Date(date), 'PP');

const getProgressColor = (current: number, previous: number) => {
  if (!previous) return 'default';
  const diff = current - previous;
  // For body fat and other measurements, lower is generally better
  return diff < 0 ? 'success' : diff > 0 ? 'error' : 'default';
};

export const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  onEdit,
  onViewPhotos
}) => {
  const theme = useTheme();

  // Prepare data for charts
    const reversedMeasurements = [...measurements].reverse();
    const chartData = {
      weight: {
        labels: reversedMeasurements.map(m => format(new Date(m.date), 'MMM d')),
        datasets: [{
          label: 'Weight',
          data: reversedMeasurements.map(m => m.weight),
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.main + '20',
          fill: true,
          tension: 0.4
        }]
      },
      bodyFat: {
        labels: reversedMeasurements.filter(m => m.body_fat).map(m => format(new Date(m.date), 'MMM d')),
        datasets: [{
          label: 'Body Fat %',
          data: reversedMeasurements.filter(m => m.body_fat).map(m => m.body_fat!),
          borderColor: theme.palette.secondary.main,
          backgroundColor: theme.palette.secondary.main + '20',
          fill: true,
          tension: 0.4
        }]
      }
  };

  return (
    <Box>
      {/* Charts Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Progress Charts
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Weight Progress
                </Typography>
                <LineChart
                    data={chartData.weight}
                    height={300}
                    showLegend
                />
              </CardContent>
            </Card>
          </Grid>
            {measurements.some(m => m.body_fat) && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Body Fat Progress
                  </Typography>
                  <LineChart
                      data={chartData.bodyFat}
                      height={300}
                      showLegend
                  />
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Measurements List */}
      <Typography variant="h6" gutterBottom>
        Measurement History
      </Typography>
      <Grid container spacing={2}>
        {measurements.map((measurement, index) => {
          const previousMeasurement = measurements[index + 1];
          
          return (
            <Grid item xs={12} key={measurement.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6">
                      {formatDate(measurement.date)}
                    </Typography>
                    <Box>
                      {measurement.photos && measurement.photos.length > 0 && (
                        <Tooltip title="View Progress Photos">
                          <IconButton 
                            onClick={() => onViewPhotos?.(measurement.photos!)}
                            size="small"
                          >
                            <PhotoIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onEdit && (
                        <Tooltip title="Edit Measurement">
                          <IconButton
                            onClick={() => onEdit(measurement)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Weight
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{measurement.weight} kg</Typography>
                        {previousMeasurement && (
                          <Chip
                            size="small"
                            label={`${(measurement.weight - previousMeasurement.weight).toFixed(1)} kg`}
                            color={getProgressColor(measurement.weight, previousMeasurement.weight)}
                          />
                        )}
                      </Box>
                    </Grid>

                    {measurement.body_fat && (
                      <Grid item xs={6} sm={3}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Body Fat
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{measurement.body_fat}%</Typography>
                          {previousMeasurement?.body_fat && (
                            <Chip
                              size="small"
                              label={`${(measurement.body_fat - previousMeasurement.body_fat).toFixed(1)}%`}
                              color={getProgressColor(measurement.body_fat, previousMeasurement.body_fat)}
                            />
                          )}
                        </Box>
                      </Grid>
                    )}

                    {(measurement.chest || measurement.waist || measurement.hips) && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Measurements (cm)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {measurement.chest && (
                            <Typography>
                              Chest: {measurement.chest}
                            </Typography>
                          )}
                          {measurement.waist && (
                            <Typography>
                              Waist: {measurement.waist}
                            </Typography>
                          )}
                          {measurement.hips && (
                            <Typography>
                              Hips: {measurement.hips}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  {measurement.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Notes
                      </Typography>
                      <Typography variant="body2">
                        {measurement.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};