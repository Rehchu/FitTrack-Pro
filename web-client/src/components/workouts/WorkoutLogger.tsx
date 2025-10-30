import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add,
  Delete,
  Check,
  Edit,
  Save,
  Close,
  Timer,
  TrendingUp
} from '@mui/icons-material';
import { ExerciseLibrary } from './ExerciseLibrary';

interface WorkoutSet {
  set_number: number;
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  distance_meters?: number;
  rpe?: number;
  completed: boolean;
  notes?: string;
}

interface Setgroup {
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  rest_seconds?: number;
  notes?: string;
  sets: WorkoutSet[];
  total_volume: number;
}

interface WorkoutLoggerProps {
  clientId: number;
  workoutId?: number;
  onSave?: (workout: any) => void;
}

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  clientId,
  workoutId,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [setgroups, setSetgroups] = useState<Setgroup[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [editingSet, setEditingSet] = useState<{
    setgroupIndex: number;
    setIndex: number;
  } | null>(null);
  const [startTime] = useState(new Date());
  const [isCompleting, setIsCompleting] = useState(false);

  const handleAddExercise = (exercise: any) => {
    const newSetgroup: Setgroup = {
      exercise_id: exercise.exerciseId, // Use exerciseId from ExerciseDB
      exercise_name: exercise.name,
      order_index: setgroups.length,
      rest_seconds: 90,
      sets: [
        { set_number: 1, reps: 10, weight: 0, completed: false, rpe: 7 }
      ],
      total_volume: 0
    };
    setSetgroups([...setgroups, newSetgroup]);
    setShowExerciseLibrary(false);
  };

  const handleAddSet = (setgroupIndex: number) => {
    const updatedSetgroups = [...setgroups];
    const setgroup = updatedSetgroups[setgroupIndex];
    const lastSet = setgroup.sets[setgroup.sets.length - 1];
    
    setgroup.sets.push({
      set_number: setgroup.sets.length + 1,
      reps: lastSet.reps,
      weight: lastSet.weight,
      completed: false,
      rpe: lastSet.rpe
    });
    
    setSetgroups(updatedSetgroups);
  };

  const handleUpdateSet = (
    setgroupIndex: number,
    setIndex: number,
    field: string,
    value: any
  ) => {
    const updatedSetgroups = [...setgroups];
    const set = updatedSetgroups[setgroupIndex].sets[setIndex];
    (set as any)[field] = value;
    
    // Calculate volume
    if (set.reps && set.weight) {
      updatedSetgroups[setgroupIndex].total_volume = updatedSetgroups[setgroupIndex].sets
        .reduce((sum, s) => sum + ((s.reps || 0) * (s.weight || 0)), 0);
    }
    
    setSetgroups(updatedSetgroups);
  };

  const handleToggleSetComplete = (setgroupIndex: number, setIndex: number) => {
    const updatedSetgroups = [...setgroups];
    const set = updatedSetgroups[setgroupIndex].sets[setIndex];
    set.completed = !set.completed;
    setSetgroups(updatedSetgroups);
  };

  const handleRemoveSet = (setgroupIndex: number, setIndex: number) => {
    const updatedSetgroups = [...setgroups];
    updatedSetgroups[setgroupIndex].sets.splice(setIndex, 1);
    // Renumber sets
    updatedSetgroups[setgroupIndex].sets.forEach((set, idx) => {
      set.set_number = idx + 1;
    });
    setSetgroups(updatedSetgroups);
  };

  const handleRemoveExercise = (setgroupIndex: number) => {
    const updatedSetgroups = setgroups.filter((_, idx) => idx !== setgroupIndex);
    // Reorder
    updatedSetgroups.forEach((sg, idx) => {
      sg.order_index = idx;
    });
    setSetgroups(updatedSetgroups);
  };

  const handleSaveWorkout = async () => {
    const duration = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
    
    const workoutData = {
      client_id: clientId,
      title: title || 'Untitled Workout',
      description,
      scheduled_at: new Date().toISOString(),
      setgroups: setgroups.map(sg => ({
        exercise_id: sg.exercise_id,
        order_index: sg.order_index,
        rest_seconds: sg.rest_seconds,
        notes: sg.notes,
        sets: sg.sets.map(s => ({
          set_number: s.set_number,
          reps: s.reps,
          weight: s.weight,
          duration_seconds: s.duration_seconds,
          distance_meters: s.distance_meters,
          rpe: s.rpe,
          completed: s.completed,
          notes: s.notes
        }))
      }))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workouts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workoutData)
      });

      if (response.ok) {
        const createdWorkout = await response.json();
        
        // Mark as completed if requested
        if (isCompleting) {
          await fetch(`/api/workouts/${createdWorkout.id}/complete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ duration_minutes: duration })
          });
        }
        
        if (onSave) {
          onSave(createdWorkout);
        }
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
    }
  };

  const getTotalVolume = () => {
    return setgroups.reduce((sum, sg) => sum + sg.total_volume, 0);
  };

  const getCompletedSets = () => {
    return setgroups.reduce((sum, sg) => 
      sum + sg.sets.filter(s => s.completed).length, 0
    );
  };

  const getTotalSets = () => {
    return setgroups.reduce((sum, sg) => sum + sg.sets.length, 0);
  };

  return (
    <Box>
      {/* Workout Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Workout Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upper Body Strength"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this workout..."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Workout Stats
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Exercises:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {setgroups.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Sets:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {getCompletedSets()} / {getTotalSets()}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Total Volume:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {getTotalVolume().toFixed(0)} kg
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Exercise List */}
      <Stack spacing={3}>
        {setgroups.map((setgroup, sgIndex) => (
          <Paper key={sgIndex} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip label={`#${sgIndex + 1}`} color="primary" size="small" />
                <Typography variant="h6">{setgroup.exercise_name}</Typography>
                {setgroup.rest_seconds && (
                  <Chip
                    icon={<Timer />}
                    label={`${setgroup.rest_seconds}s rest`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <IconButton
                color="error"
                onClick={() => handleRemoveExercise(sgIndex)}
              >
                <Delete />
              </IconButton>
            </Box>

            {/* Sets Table */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Set</TableCell>
                  <TableCell align="center">Reps</TableCell>
                  <TableCell align="center">Weight (kg)</TableCell>
                  <TableCell align="center">RPE</TableCell>
                  <TableCell align="center">Volume</TableCell>
                  <TableCell align="center">Done</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {setgroup.sets.map((set, setIndex) => (
                  <TableRow
                    key={setIndex}
                    sx={{
                      bgcolor: set.completed ? 'success.light' : 'transparent',
                      opacity: set.completed ? 0.8 : 1
                    }}
                  >
                    <TableCell>{set.set_number}</TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => handleUpdateSet(sgIndex, setIndex, 'reps', parseInt(e.target.value))}
                        sx={{ width: 70 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => handleUpdateSet(sgIndex, setIndex, 'weight', parseFloat(e.target.value))}
                        sx={{ width: 70 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 1, max: 10 }}
                        value={set.rpe || ''}
                        onChange={(e) => handleUpdateSet(sgIndex, setIndex, 'rpe', parseInt(e.target.value))}
                        sx={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {set.reps && set.weight ? (set.reps * set.weight).toFixed(0) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color={set.completed ? 'success' : 'default'}
                        onClick={() => handleToggleSetComplete(sgIndex, setIndex)}
                      >
                        <Check />
                      </IconButton>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveSet(sgIndex, setIndex)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Button
                startIcon={<Add />}
                onClick={() => handleAddSet(sgIndex)}
                size="small"
              >
                Add Set
              </Button>
              <Typography variant="body2" color="text.secondary">
                Total Volume: <strong>{setgroup.total_volume.toFixed(0)} kg</strong>
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      {/* Add Exercise Button */}
      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setShowExerciseLibrary(true)}
          fullWidth
        >
          Add Exercise
        </Button>
      </Box>

      {/* Action Buttons */}
      {setgroups.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => {
                setIsCompleting(false);
                handleSaveWorkout();
              }}
            >
              Save as Template
            </Button>
            <Button
              variant="contained"
              startIcon={<Check />}
              onClick={() => {
                setIsCompleting(true);
                handleSaveWorkout();
              }}
            >
              Complete Workout
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Exercise Library Dialog */}
      <Dialog
        open={showExerciseLibrary}
        onClose={() => setShowExerciseLibrary(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Select Exercise</Typography>
            <IconButton onClick={() => setShowExerciseLibrary(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <Box p={2}>
          <ExerciseLibrary
            mode="select"
            onSelectExercise={handleAddExercise}
          />
        </Box>
      </Dialog>
    </Box>
  );
};
