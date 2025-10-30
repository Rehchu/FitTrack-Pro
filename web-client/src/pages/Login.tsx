import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { useBrandingStore } from '../stores/brandingStore';
import { LottieAnimation } from '../components/common/LottieAnimation';

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { businessName, logoUrl } = useBrandingStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const { token, user } = await response.json();
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Paper className="p-8 w-full max-w-md" elevation={4}>
        <div className="text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <>
              <LottieAnimation 
                animationPath="/animations/gym-fitness.json" 
                width={120} 
                height={120} 
              />
              <Typography variant="h4" className="mb-4">
                {businessName || 'FitTrack Pro'}
              </Typography>
            </>
          )}
          <Typography variant="subtitle1" color="textSecondary">
            Welcome back! Please log in.
          </Typography>
        </div>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        <Typography
          variant="body2"
          color="textSecondary"
          className="mt-4 text-center"
        >
          Need an account?{' '}
          <Button
            color="primary"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </Button>
        </Typography>
      </Paper>
    </div>
  );
}