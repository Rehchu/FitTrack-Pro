import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  useTheme,
  DialogTitle,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface PhotoViewerProps {
  open: boolean;
  onClose: () => void;
  photos: string[];
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  open,
  onClose,
  photos
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photos.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevious}
                sx={{
                  position: 'absolute',
                  left: 0,
                  zIndex: 1,
                  backgroundColor: theme.palette.background.paper,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <NavigateBeforeIcon />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 0,
                  zIndex: 1,
                  backgroundColor: theme.palette.background.paper,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <NavigateNextIcon />
              </IconButton>
            </>
          )}
          <Box
            component="img"
            src={photos[currentIndex]}
            alt={`Progress photo ${currentIndex + 1}`}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </Box>
        {photos.length > 1 && (
          <Grid
            container
            spacing={1}
            sx={{
              mt: 2,
              justifyContent: 'center'
            }}
          >
            {photos.map((photo, index) => (
              <Grid item key={index}>
                <Box
                  component="img"
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    width: 60,
                    height: 60,
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: index === currentIndex ? `2px solid ${theme.palette.primary.main}` : 'none',
                    borderRadius: 1,
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};