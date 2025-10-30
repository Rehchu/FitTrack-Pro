import { FC, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  SelectChangeEvent,
  Stack,
} from '@mui/material';
import { VideoUpload } from './common/VideoUpload';

interface WorkoutCategory {
  id: string;
  name: string;
}

interface WorkoutVideoFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    videoFile: File;
  }) => Promise<void>;
  categories: WorkoutCategory[];
}

export const WorkoutVideoForm: FC<WorkoutVideoFormProps> = ({
  onSubmit,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVideoSelect = async (file: File) => {
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        title,
        description,
        category,
        difficulty,
        videoFile,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setDifficulty('');
      setVideoFile(null);
      setPreviewUrl(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Workout Video
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <VideoUpload
              onVideoSelect={handleVideoSelect}
              previewUrl={previewUrl || undefined}
              title="Drop workout video here"
              description="or click to select video (max 100MB)"
            />

            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
            />

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={difficulty}
                onChange={(e: SelectChangeEvent) => setDifficulty(e.target.value)}
                label="Difficulty"
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
                <MenuItem value="expert">Expert</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              disabled={!videoFile || isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? 'Uploading...' : 'Upload Workout'}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};