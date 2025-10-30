import { FC, useState } from 'react';
import { Box, Typography, IconButton, LinearProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { FileUpload } from './FileUpload';

interface VideoUploadProps {
  onVideoSelect: (file: File) => Promise<void>;
  maxSize?: number; // in bytes
  title?: string;
  description?: string;
  previewUrl?: string;
}

export const VideoUpload: FC<VideoUploadProps> = ({
  onVideoSelect,
  maxSize = 100 * 1024 * 1024, // 100MB default
  title = 'Drop video here',
  description = 'or click to select video file',
  previewUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setProgress((video.currentTime / video.duration) * 100);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const togglePlayPause = () => {
    const video = document.getElementById('preview-video') as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = async (files: File[]) => {
    const videoFile = files[0];
    if (videoFile) {
      await onVideoSelect(videoFile);
    }
  };

  return (
    <Box>
      {previewUrl ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            backgroundColor: 'darkGrey.main',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <video
            id="preview-video"
            src={previewUrl}
            style={{ width: '100%', display: 'block' }}
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              p: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={togglePlayPause}
                size="small"
                sx={{ color: 'white' }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <Typography variant="caption" sx={{ color: 'white', flex: 1 }}>
                {formatTime(duration * (progress / 100))} / {formatTime(duration)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                mt: 1,
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'primary.main',
                },
              }}
            />
          </Box>
        </Box>
      ) : (
        <FileUpload
          onFilesSelected={handleFileSelect}
          multiple={false}
          maxSize={maxSize}
          label={`${title} ${description}`}
        />
      )}
    </Box>
  );
};