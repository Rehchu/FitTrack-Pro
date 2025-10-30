import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ExerciseProgress {
  exercise_id: number;
  exercise_name: string;
  data_points: Array<{
    date: string;
    max_weight: number;
    total_volume: number;
    total_reps: number;
  }>;
  overall_improvement: number;
  best_session: {
    date: string;
    max_weight: number;
  };
}

interface StrengthProgressChartProps {
  clientId: number;
}

const StrengthProgressChart: React.FC<StrengthProgressChartProps> = ({ clientId }) => {
  const [exercises, setExercises] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [progressData, setProgressData] = useState<ExerciseProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExerciseList();
  }, [clientId]);

  useEffect(() => {
    if (selectedExercise) {
      fetchProgressData();
    }
  }, [selectedExercise, dateRange]);

  const fetchExerciseList = async () => {
    try {
      // Fetch exercises that the client has performed
      const response = await fetch(`/api/workouts/clients/${clientId}/exercises`);
      const data = await response.json();
      setExercises(data.exercises || []);
      
      if (data.exercises && data.exercises.length > 0) {
        setSelectedExercise(data.exercises[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const fetchProgressData = async () => {
    if (!selectedExercise) return;

    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const response = await fetch(
        `/api/workouts/clients/${clientId}/exercise-progress/${selectedExercise}?${params}`
      );
      const data = await response.json();
      setProgressData(data);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toFixed(1) + ' kg';
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Weight (kg)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  const chartData = {
    labels: progressData?.data_points.map(dp => format(parseISO(dp.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Max Weight',
        data: progressData?.data_points.map(dp => dp.max_weight) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const improvementPercentage = progressData?.overall_improvement || 0;
  const isImproving = improvementPercentage > 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Strength Progress Tracker
      </Typography>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <FormControl fullWidth sx={{ maxWidth: 300 }}>
                <InputLabel>Exercise</InputLabel>
                <Select
                  value={selectedExercise || ''}
                  label="Exercise"
                  onChange={(e) => setSelectedExercise(Number(e.target.value))}
                  disabled={exercises.length === 0}
                >
                  {exercises.map((exercise) => (
                    <MenuItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ToggleButtonGroup
                value={dateRange}
                exclusive
                onChange={(_, value) => value && setDateRange(value)}
                aria-label="date range"
              >
                <ToggleButton value={7}>7 Days</ToggleButton>
                <ToggleButton value={30}>30 Days</ToggleButton>
                <ToggleButton value={90}>90 Days</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>

        {exercises.length === 0 ? (
          <Alert severity="info">
            No exercise data available yet. Complete workouts to track your progress!
          </Alert>
        ) : loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : progressData ? (
          <>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="space-around">
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Total Data Points
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {progressData.data_points.length}
                    </Typography>
                  </Box>

                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Best Performance
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {progressData.best_session.max_weight.toFixed(1)} kg
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(parseISO(progressData.best_session.date), 'MMM d, yyyy')}
                    </Typography>
                  </Box>

                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Overall Improvement
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      {isImproving ? (
                        <TrendingUpIcon color="success" fontSize="large" />
                      ) : (
                        <TrendingDownIcon color="error" fontSize="large" />
                      )}
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        color={isImproving ? 'success.main' : 'error.main'}
                      >
                        {improvementPercentage > 0 ? '+' : ''}
                        {improvementPercentage.toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {progressData.exercise_name} Progress
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line options={chartOptions} data={chartData} />
                </Box>
              </CardContent>
            </Card>

            {progressData.data_points.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Sessions
                  </Typography>
                  <Stack spacing={1}>
                    {progressData.data_points.slice(-5).reverse().map((point, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: index === 0 ? 'primary.light' : 'action.hover',
                        }}
                      >
                        <Typography variant="body2">
                          {format(parseISO(point.date), 'MMM d, yyyy')}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          <Chip
                            label={`${point.max_weight.toFixed(1)} kg`}
                            size="small"
                            color="primary"
                          />
                          <Chip
                            label={`${point.total_reps} reps`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${point.total_volume.toFixed(0)} kg volume`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Alert severity="warning">
            No progress data available for the selected exercise and date range.
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default StrengthProgressChart;
