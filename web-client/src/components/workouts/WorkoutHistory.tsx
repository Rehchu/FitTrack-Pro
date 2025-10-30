import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { format, parseISO, isSameDay } from 'date-fns';

interface WorkoutSet {
  id: number;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  completed: boolean;
  volume: number;
}

interface SetGroup {
  id: number;
  exercise: {
    id: number;
    name: string;
    category: string;
  };
  sets: WorkoutSet[];
  total_volume: number;
  notes: string | null;
  rest_seconds: number | null;
}

interface Workout {
  id: number;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  timestamp: string;
  setgroups: SetGroup[];
  total_volume: number;
  completed: boolean;
}

interface WorkoutHistoryProps {
  clientId: number;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ clientId }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchWorkouts();
  }, [clientId, filter, page]);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });

      if (filter === 'completed') {
        params.append('completed_only', 'true');
      } else if (filter === 'pending') {
        params.append('pending_only', 'true');
      }

      const response = await fetch(`/api/workouts/clients/${clientId}/workouts?${params}`);
      const data = await response.json();
      
      setWorkouts(data.workouts || []);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      console.error('Failed to fetch workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch {
      return dateString;
    }
  };

  // Group workouts by date
  const groupWorkoutsByDate = (workouts: Workout[]) => {
    const grouped: Record<string, Workout[]> = {};
    
    workouts.forEach(workout => {
      const dateKey = workout.completed_at || workout.timestamp;
      const formattedDate = formatDate(dateKey);
      
      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      grouped[formattedDate].push(workout);
    });
    
    return grouped;
  };

  const groupedWorkouts = groupWorkoutsByDate(workouts);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          <FitnessCenterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Workout History
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filter}
            label="Filter"
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPage(1);
            }}
          >
            <MenuItem value="all">All Workouts</MenuItem>
            <MenuItem value="completed">Completed Only</MenuItem>
            <MenuItem value="pending">Pending Only</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {workouts.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No workouts found. Start logging your first workout!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {Object.entries(groupedWorkouts).map(([date, dateWorkouts]) => (
            <Box key={date}>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                {date}
              </Typography>
              
              <Stack spacing={2}>
                {dateWorkouts.map((workout) => (
                  <Accordion key={workout.id}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {workout.title}
                          </Typography>
                          {workout.description && (
                            <Typography variant="body2" color="text.secondary">
                              {workout.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {workout.completed_at ? formatDateTime(workout.completed_at) : formatDateTime(workout.timestamp)}
                          </Typography>
                        </Box>
                        
                        <Stack direction="row" spacing={1} alignItems="center">
                          {workout.completed ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Completed"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<PendingIcon />}
                              label="Pending"
                              color="warning"
                              size="small"
                            />
                          )}
                          
                          {workout.duration_minutes && (
                            <Chip
                              label={`${workout.duration_minutes} min`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          
                          <Chip
                            label={`${workout.total_volume.toFixed(0)} kg`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        </Stack>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <Stack spacing={3}>
                        {workout.setgroups.map((setgroup, index) => (
                          <Box key={setgroup.id}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                              {index + 1}. {setgroup.exercise.name}
                              <Chip
                                label={setgroup.exercise.category}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                            
                            {setgroup.notes && (
                              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                Notes: {setgroup.notes}
                              </Typography>
                            )}
                            
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Set</TableCell>
                                    <TableCell align="right">Reps</TableCell>
                                    <TableCell align="right">Weight (kg)</TableCell>
                                    <TableCell align="right">RPE</TableCell>
                                    <TableCell align="right">Volume (kg)</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {setgroup.sets.map((set) => (
                                    <TableRow
                                      key={set.id}
                                      sx={{
                                        backgroundColor: set.completed ? 'success.light' : 'inherit',
                                        opacity: set.completed ? 1 : 0.6,
                                      }}
                                    >
                                      <TableCell>{set.set_number}</TableCell>
                                      <TableCell align="right">
                                        {set.reps !== null ? set.reps : '-'}
                                      </TableCell>
                                      <TableCell align="right">
                                        {set.weight !== null ? set.weight.toFixed(1) : '-'}
                                      </TableCell>
                                      <TableCell align="right">
                                        {set.rpe !== null ? (
                                          <Chip
                                            label={set.rpe}
                                            size="small"
                                            color={
                                              set.rpe >= 9 ? 'error' :
                                              set.rpe >= 7 ? 'warning' :
                                              'success'
                                            }
                                          />
                                        ) : '-'}
                                      </TableCell>
                                      <TableCell align="right">
                                        <strong>{set.volume.toFixed(1)}</strong>
                                      </TableCell>
                                      <TableCell align="center">
                                        {set.completed ? (
                                          <CheckCircleIcon color="success" fontSize="small" />
                                        ) : (
                                          <PendingIcon color="disabled" fontSize="small" />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                    <TableCell colSpan={4} align="right">
                                      <strong>Total Volume:</strong>
                                    </TableCell>
                                    <TableCell align="right">
                                      <strong>{setgroup.total_volume.toFixed(1)} kg</strong>
                                    </TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        ))}
                        
                        {workout.notes && (
                          <Box sx={{ backgroundColor: 'info.light', p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              Workout Notes:
                            </Typography>
                            <Typography variant="body2">{workout.notes}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Box>
  );
};

export default WorkoutHistory;
