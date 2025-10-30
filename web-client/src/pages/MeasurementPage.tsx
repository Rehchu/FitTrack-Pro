import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Alert, Button, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { MeasurementDialog } from '../components/measurements/MeasurementDialog';
import { PhotoViewer } from '../components/measurements/PhotoViewer';
import { MeasurementList } from '../components/measurements/MeasurementList';

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

interface MeasurementPageProps {
  isTrainer?: boolean;
}

export const MeasurementPage: React.FC<MeasurementPageProps> = ({ isTrainer = false }) => {
  const theme = useTheme();
  const { clientId } = useParams<{ clientId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMeasurements = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/clients/${clientId}/measurements`);
      setMeasurements(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load measurements. Please try again later.');
      console.error('Error fetching measurements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [clientId]);

  const handleSubmit = async (formData: FormData) => {
    if (!clientId) return;
    try {
      setLoading(true);
      if (selectedMeasurement) {
        await axios.put(
          `/api/clients/${clientId}/measurements/${selectedMeasurement.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        await axios.post(
          `/api/clients/${clientId}/measurements`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }
      setError(null);
      setDialogOpen(false);
      setSelectedMeasurement(null);
      await fetchMeasurements();
    } catch (err) {
      setError('Failed to save measurement. Please try again.');
      console.error('Error saving measurement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (measurement: Measurement) => {
    setSelectedMeasurement(measurement);
    setDialogOpen(true);
  };

  const handleViewPhotos = (photos: string[]) => {
    setSelectedPhotos(photos);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Body Measurements
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Record New Measurements
        </Button>
      </Box>

      <MeasurementList
        measurements={measurements as any}
        onEdit={isTrainer ? (m) => handleEdit(m as any) : undefined}
        onViewPhotos={handleViewPhotos}
      />

      <MeasurementDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedMeasurement(null);
        }}
        onSubmit={handleSubmit}
        isLoading={loading}
        initialData={selectedMeasurement as any}
        title={selectedMeasurement ? 'Update Measurements' : 'Record New Measurements'}
      />

      <PhotoViewer
        open={selectedPhotos.length > 0}
        onClose={() => setSelectedPhotos([])}
        photos={selectedPhotos}
      />
    </Container>
  );
};