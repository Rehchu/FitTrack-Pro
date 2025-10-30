import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  InputAdornment,
  Collapse,
  Stack,
  Divider
} from '@mui/material';
import {
  Search,
  Add,
  FilterList,
  FitnessCenter,
  Close,
  PlayArrow
} from '@mui/icons-material';

interface Exercise {
  exerciseId: string;
  name: string;
  gifUrl?: string;
  equipments: string[];
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface ExerciseLibraryProps {
  onSelectExercise?: (exercise: Exercise) => void;
  mode?: 'browse' | 'select';
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  onSelectExercise,
  mode = 'browse'
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [muscles, setMuscles] = useState<string[]>([]);

  // Fetch metadata (body parts, equipment, muscles)
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = localStorage.getItem('token');
      
      try {
        // Fetch body parts
        const bodyPartsRes = await fetch('/api/exercisedb/metadata/bodyparts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (bodyPartsRes.ok) {
          const bodyPartsData = await bodyPartsRes.json();
          setBodyParts(bodyPartsData.data || []);
        }

        // Fetch equipment types
        const equipmentRes = await fetch('/api/exercisedb/metadata/equipments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (equipmentRes.ok) {
          const equipmentData = await equipmentRes.json();
          setEquipmentTypes(equipmentData.data || []);
        }

        // Fetch muscles
        const musclesRes = await fetch('/api/exercisedb/metadata/muscles', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (musclesRes.ok) {
          const musclesData = await musclesRes.json();
          setMuscles(musclesData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };

    fetchMetadata();
  }, []);

  // Fetch exercises from ExerciseDB API
  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      try {
        // Build filter params
        const params = new URLSearchParams({
          offset: '0',
          limit: '100' // Get first 100 exercises
        });

        // Use filter endpoint if filters are applied
        let endpoint = '/api/exercisedb/exercises';
        
        if (searchTerm || selectedBodyPart !== 'all' || selectedEquipment !== 'all' || selectedMuscle !== 'all') {
          endpoint = '/api/exercisedb/exercises/filter';
          
          if (searchTerm) {
            params.set('search', searchTerm);
          }
          if (selectedBodyPart !== 'all') {
            params.set('body_parts', selectedBodyPart);
          }
          if (selectedEquipment !== 'all') {
            params.set('equipment', selectedEquipment);
          }
          if (selectedMuscle !== 'all') {
            params.set('muscles', selectedMuscle);
          }
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const exerciseData = result.data || [];
          setExercises(exerciseData);
          setFilteredExercises(exerciseData);
        }
      } catch (error) {
        console.error('Failed to fetch exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [searchTerm, selectedBodyPart, selectedEquipment, selectedMuscle]);

  const handleExerciseClick = (exercise: Exercise) => {
    if (mode === 'select' && onSelectExercise) {
      onSelectExercise(exercise);
    } else {
      setSelectedExercise(exercise);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBodyPart('all');
    setSelectedEquipment('all');
    setSelectedMuscle('all');
  };

  return (
    <Box>
      {/* Search and Filter Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search exercises by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </Box>

        {/* Collapsible Filters */}
        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Body Part</InputLabel>
                <Select
                  value={selectedBodyPart}
                  onChange={(e) => setSelectedBodyPart(e.target.value)}
                  label="Body Part"
                >
                  <MenuItem value="all">All Body Parts</MenuItem>
                  {bodyParts.map((bp) => (
                    <MenuItem key={bp} value={bp}>
                      {bp.charAt(0).toUpperCase() + bp.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Equipment</InputLabel>
                <Select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  label="Equipment"
                >
                  <MenuItem value="all">All Equipment</MenuItem>
                  {equipmentTypes.map((eq) => (
                    <MenuItem key={eq} value={eq}>
                      {eq.charAt(0).toUpperCase() + eq.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Target Muscle</InputLabel>
                <Select
                  value={selectedMuscle}
                  onChange={(e) => setSelectedMuscle(e.target.value)}
                  label="Target Muscle"
                >
                  <MenuItem value="all">All Muscles</MenuItem>
                  {muscles.map((muscle) => (
                    <MenuItem key={muscle} value={muscle}>
                      {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button size="small" onClick={handleClearFilters}>
              Clear All Filters
            </Button>
          </Box>
        </Collapse>
      </Paper>

      {/* Exercise Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
        {(searchTerm || selectedBodyPart !== 'all' || selectedEquipment !== 'all' || selectedMuscle !== 'all') && 
          ' (filtered from 1,300+ exercises)'}
      </Typography>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Exercise Grid */}
      {!loading && (
        <Grid container spacing={3}>
          {filteredExercises.map((exercise) => (
            <Grid item xs={12} sm={6} md={4} key={exercise.exerciseId}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)'
                  },
                  border: selectedExercise?.exerciseId === exercise.exerciseId ? '2px solid' : 'none',
                  borderColor: 'primary.main'
                }}
                onClick={() => handleExerciseClick(exercise)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FitnessCenter color="primary" />
                      <Typography variant="h6" component="div">
                        {exercise.name}
                      </Typography>
                    </Box>
                    {mode === 'select' && (
                      <IconButton size="small" color="primary">
                        <Add />
                      </IconButton>
                    )}
                  </Box>

                  {/* GIF Image */}
                  {exercise.gifUrl && (
                    <CardMedia
                      component="img"
                      image={exercise.gifUrl}
                      alt={exercise.name}
                      sx={{
                        height: 200,
                        objectFit: 'contain',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        mb: 2
                      }}
                    />
                  )}

                  {/* Chips */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
                    {exercise.bodyParts.map((bp, idx) => (
                      <Chip
                        key={idx}
                        label={bp}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {exercise.equipments.map((eq, idx) => (
                      <Chip
                        key={idx}
                        label={eq}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>

                  {/* Target Muscles */}
                  {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Target:</strong> {exercise.targetMuscles.join(', ')}
                    </Typography>
                  )}

                  {/* Instructions Preview */}
                  {exercise.instructions && exercise.instructions.length > 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {exercise.instructions[0]}
                    </Typography>
                  )}

                  {/* View GIF Button */}
                  {exercise.gifUrl && mode === 'browse' && (
                    <Box mt={2}>
                      <Button
                        variant="text"
                        size="small"
                        startIcon={<PlayArrow />}
                        fullWidth
                      >
                        View Animation
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!loading && filteredExercises.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No exercises found
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Try adjusting your search or filters
          </Typography>
          <Button onClick={handleClearFilters} variant="outlined" sx={{ mt: 2 }}>
            Clear Filters
          </Button>
        </Paper>
      )}

      {/* Exercise Detail Dialog (browse mode only) */}
      <Dialog
        open={!!selectedExercise && mode === 'browse'}
        onClose={() => setSelectedExercise(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedExercise && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">{selectedExercise.name}</Typography>
                <IconButton onClick={() => setSelectedExercise(null)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* GIF */}
              {selectedExercise.gifUrl && (
                <Box mb={3}>
                  <img
                    src={selectedExercise.gifUrl}
                    alt={selectedExercise.name}
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px'
                    }}
                  />
                </Box>
              )}

              {/* Chips */}
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={3}>
                {selectedExercise.bodyParts.map((bp, idx) => (
                  <Chip key={idx} label={bp} color="primary" />
                ))}
                {selectedExercise.equipments.map((eq, idx) => (
                  <Chip key={idx} label={eq} />
                ))}
              </Stack>

              {/* Target Muscles */}
              {selectedExercise.targetMuscles && selectedExercise.targetMuscles.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Target Muscles:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedExercise.targetMuscles.join(', ')}
                  </Typography>
                </Box>
              )}

              {/* Secondary Muscles */}
              {selectedExercise.secondaryMuscles && selectedExercise.secondaryMuscles.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Secondary Muscles:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedExercise.secondaryMuscles.join(', ')}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Instructions */}
              <Typography variant="subtitle2" gutterBottom>
                Instructions:
              </Typography>
              <Box component="ol" sx={{ pl: 2 }}>
                {selectedExercise.instructions.map((instruction, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {instruction}
                  </Typography>
                ))}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};
