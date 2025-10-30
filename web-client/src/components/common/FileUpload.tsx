import React, { useCallback, useState, useEffect } from 'react';
import { Box, Typography, Paper, useTheme, alpha, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  label?: string;
  selectedFiles?: File[];
  isUploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB default
  maxFiles = 10,
  label = 'Drop files here or click to upload',
  selectedFiles = [],
  isUploading = false,
}) => {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(URL.revokeObjectURL);
    };
  }, [previewUrls]);

  const generatePreviews = (files: File[]) => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => {
      prev.forEach(URL.revokeObjectURL);
      return urls;
    });
  };

  const validateFiles = (files: File[]): string | null => {
    if (files.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    for (const file of files) {
      if (file.size > maxSize) {
        return `File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`;
      }
    }

    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const validationError = validateFiles(droppedFiles);

    if (validationError) {
      setError(validationError);
      return;
    }

    generatePreviews(droppedFiles);
    onFilesSelected(droppedFiles);
  }, [maxFiles, maxSize, onFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);

    const files = Array.from(e.target.files || []);
    const validationError = validateFiles(files);

    if (validationError) {
      setError(validationError);
      return;
    }

    generatePreviews(files);
    onFilesSelected(files);
  }, [maxFiles, maxSize, onFilesSelected]);

  return (
    <Box>
      <input
        id="file-upload"
        type="file"
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,video/*"
      />
      <label htmlFor="file-upload" style={{ width: '100%', display: 'block' }}>
        <Paper
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          sx={{
            padding: 4,
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : alpha(theme.palette.common.white, 0.1),
            backgroundColor: isDragging
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.background.paper, 0.6),
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              borderColor: alpha(theme.palette.common.white, 0.2),
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {isUploading ? (
              <CircularProgress size={48} color="primary" />
            ) : (
              <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            )}

            <Typography variant="h6" color="text.primary">
              {error || label}
            </Typography>

            {selectedFiles.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </Typography>
            )}
          </Box>
        </Paper>
      </label>

      {previewUrls.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {previewUrls.map((url, index) => (
            <Box
              key={index}
              component="img"
              src={url}
              alt={`Preview ${index + 1}`}
              sx={{
                width: 60,
                height: 60,
                objectFit: 'cover',
                borderRadius: 1,
                border: `2px solid ${theme.palette.primary.main}`
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};