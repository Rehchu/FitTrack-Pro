import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { MeasurementForm } from './MeasurementForm';

interface MeasurementDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: any;
  title?: string;
}

export const MeasurementDialog: React.FC<MeasurementDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  title = 'Record Measurements'
}) => {
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <MeasurementForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          initialData={initialData}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="measurement-form"
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} />
          ) : initialData ? (
            'Update'
          ) : (
            'Save'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};