import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  FitnessCenter,
  Restaurant,
  Timer
} from '@mui/icons-material';

interface ClientProfile {
  name: string;
  email: string;
  avatar_url?: string;
  trainer_name: string;
  measurements?: {
    weight?: number;
    height?: number;
    body_fat?: number;
  };
  achievements?: Array<{
    id: number;
    title: string;
    description: string;
    earned_at: string;
  }>;
  stats?: {
    total_workouts: number;
    total_meals_logged: number;
    days_active: number;
    weight_change?: number;
  };
  quests?: Array<{
    id: number;
    title: string;
    progress: number;
    total: number;
  }>;
}

export function ClientPublicProfile() {
  const { clientname } = useParams<{ clientname: string }>();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [clientname]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from Cloudflare Worker
      const response = await fetch(`https://fittrack-pro-desktop.rehchu1.workers.dev/client/${clientname}`);
      
      if (!response.ok) {
        throw new Error('Profile not found');
      }

      // Worker returns HTML, so we need to fetch JSON instead
      const jsonResponse = await fetch(`https://fittrack-pro-desktop.rehchu1.workers.dev/api/clients/${clientname}/public`);
      
      if (jsonResponse.ok) {
        const data = await jsonResponse.json();
        setProfile(data);
      } else {
        // Fallback: parse HTML or show error
        setError('This profile is not publicly accessible');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const installPWA = () => {
    // PWA install prompt
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Profile not found'}
          </Alert>
          <Typography variant="h4" color="white" textAlign="center">
            404
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Client profile not found
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1d2e 0%, #2a2f42 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #2a2f42 0%, #1a1d2e 100%)',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Avatar
            src={profile.avatar_url}
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 2,
              border: '4px solid #FFB82B',
            }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </Avatar>
          
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            {profile.name}
          </Typography>
          
          <Chip
            label={`Training with ${profile.trainer_name}`}
            sx={{
              background: '#2a2f42',
              color: '#9ca3af',
              fontWeight: 500,
            }}
          />
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: '#2a2f42',
                borderLeft: '4px solid #1BB55C',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Total Workouts
                </Typography>
                <Typography variant="h4" color="#1BB55C" fontWeight="bold">
                  {profile.stats?.total_workouts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: '#2a2f42',
                borderLeft: '4px solid #FFB82B',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Meals Logged
                </Typography>
                <Typography variant="h4" color="#FFB82B" fontWeight="bold">
                  {profile.stats?.total_meals_logged || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: '#2a2f42',
                borderLeft: '4px solid #FF4B39',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Days Active
                </Typography>
                <Typography variant="h4" color="#FF4B39" fontWeight="bold">
                  {profile.stats?.days_active || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: '#2a2f42',
                borderLeft: '4px solid #673AB7',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Weight Change
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" color="#673AB7" fontWeight="bold">
                    {Math.abs(profile.stats?.weight_change || 0)}
                  </Typography>
                  {profile.stats?.weight_change && profile.stats.weight_change > 0 ? (
                    <TrendingUp color="success" />
                  ) : (
                    <TrendingDown color="error" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Measurements */}
        {profile.measurements && (
          <Paper sx={{ p: 3, mb: 4, background: '#2a2f42', borderRadius: 2 }}>
            <Typography variant="h5" color="#FFB82B" mb={2}>
              Current Measurements
            </Typography>
            <Grid container spacing={2}>
              {profile.measurements.weight && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Weight</Typography>
                  <Typography variant="h6" color="white">{profile.measurements.weight} lbs</Typography>
                </Grid>
              )}
              {profile.measurements.height && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Height</Typography>
                  <Typography variant="h6" color="white">{profile.measurements.height} in</Typography>
                </Grid>
              )}
              {profile.measurements.body_fat && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">Body Fat</Typography>
                  <Typography variant="h6" color="white">{profile.measurements.body_fat}%</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Active Quests */}
        {profile.quests && profile.quests.length > 0 && (
          <Paper sx={{ p: 3, mb: 4, background: '#2a2f42', borderRadius: 2 }}>
            <Typography variant="h5" color="#FFB82B" mb={2}>
              Active Quests
            </Typography>
            <Grid container spacing={2}>
              {profile.quests.map((quest) => (
                <Grid item xs={12} key={quest.id}>
                  <Box>
                    <Typography variant="body1" color="white" mb={1}>
                      {quest.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(quest.progress / quest.total) * 100}
                        sx={{
                          flexGrow: 1,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: '#1a1d2e',
                          '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #FF4B39 0%, #FFB82B 100%)',
                          },
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {quest.progress}/{quest.total}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <Paper sx={{ p: 3, background: '#2a2f42', borderRadius: 2 }}>
            <Typography variant="h5" color="#FFB82B" mb={2}>
              Achievements
            </Typography>
            <Grid container spacing={2}>
              {profile.achievements.map((achievement) => (
                <Grid item xs={6} sm={4} md={3} key={achievement.id}>
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #FF4B39 0%, #FFB82B 100%)',
                      p: 3,
                      borderRadius: 2,
                      textAlign: 'center',
                      color: '#1a1d2e',
                      fontWeight: 'bold',
                    }}
                  >
                    <EmojiEvents sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2">{achievement.title}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Install PWA Prompt */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            right: 20,
            background: '#1BB55C',
            color: 'white',
            p: 2,
            borderRadius: 2,
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
          }}
        >
          <Typography variant="body2">Install FitTrack for offline access</Typography>
          <button
            onClick={installPWA}
            style={{
              background: 'white',
              color: '#1BB55C',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 6,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Install
          </button>
        </Box>
      </Container>
    </Box>
  );
}
