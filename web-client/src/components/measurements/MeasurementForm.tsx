import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { FileUpload } from '../common/FileUpload';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface MeasurementFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: any;
}

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  onSubmit,
  isLoading = false,
  initialData
}) => {
  const [date, setDate] = useState<Date>(initialData?.date ? new Date(initialData.date) : new Date());
  const [photos, setPhotos] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Add date and photos
    formData.set('date', date.toISOString());
    photos.forEach((photo, index) => {
      formData.append('photos', photo);
    });

    await onSubmit(formData);
    form.reset();
    setPhotos([]);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {initialData ? 'Update Measurements' : 'Record New Measurements'}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Measurement Date"
                value={date}
                onChange={(newDate) => setDate(newDate || new Date())}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              name="weight"
              label="Weight"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                inputProps: { step: "0.1", min: "0" }
              }}
              defaultValue={initialData?.weight || ''}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="body_fat"
              label="Body Fat Percentage"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                inputProps: { step: "0.1", min: "0", max: "100" }
              }}
              defaultValue={initialData?.body_fat || ''}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="chest"
              label="Chest"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                inputProps: { step: "0.1", min: "0" }
              }}
              defaultValue={initialData?.chest || ''}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="waist"
              label="Waist"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                inputProps: { step: "0.1", min: "0" }
              }}
              defaultValue={initialData?.waist || ''}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="hips"
              label="Hips"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
                inputProps: { step: "0.1", min: "0" }
              }}
              defaultValue={initialData?.hips || ''}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              name="notes"
              label="Notes"
              multiline
              rows={4}
              defaultValue={initialData?.notes || ''}
            />
          </Grid>

          <Grid item xs={12}>
            <FileUpload
              label="Progress Photos"
              multiple
              onFilesSelected={setPhotos}
              maxFiles={4}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : initialData ? (
                'Update Measurements'
              ) : (
                'Save Measurements'
              )}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};