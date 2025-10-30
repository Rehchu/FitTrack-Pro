import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  ImageList,
  ImageListItem,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import { LineChart } from '../components/charts/LineChart';
import { LottieAnimation } from '../components/common/LottieAnimation';
import { PWAInstallPrompt } from '../components/common/PWAInstallPrompt';
import { format, parseISO } from 'date-fns';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const PublicProfilePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/public/profile/${token}`);
      setProfileData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profileData) {
    return null;
  }

  const { client, measurements, recent_meals, quests = [], milestones = [], achievements = [], share_expires_at } = profileData;

  // Calculate fitness metrics for dynamic avatar
  const calculateAvatarMetrics = () => {
    if (measurements.length === 0) {
      return {
        size: 180,
        borderColor: '#FFB82B',
        glowIntensity: 0.3,
        scale: 1,
        bodyShape: 'normal',
      };
    }

    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];

    // Calculate progress metrics
    const weightChange = oldest.weight && latest.weight ? oldest.weight - latest.weight : 0;
    const bodyFatChange = oldest.body_fat && latest.body_fat ? oldest.body_fat - latest.body_fat : 0;
    const waistChange = oldest.waist && latest.waist ? oldest.waist - latest.waist : 0;

    // Overall progress score (0-100)
    let progressScore = 50; // neutral start
    
    // Weight loss/gain evaluation
    if (weightChange > 0) progressScore += Math.min(weightChange * 2, 20); // Lost weight
    else if (weightChange < 0) progressScore -= Math.min(Math.abs(weightChange) * 2, 20); // Gained weight
    
    // Body fat reduction
    if (bodyFatChange > 0) progressScore += Math.min(bodyFatChange * 3, 20);
    
    // Waist reduction
    if (waistChange > 0) progressScore += Math.min(waistChange * 1.5, 15);

    // Meal consistency (nutrition tracking)
    const mealConsistency = recent_meals.length / 30; // 30 days
    progressScore += Math.min(mealConsistency * 10, 15);

    // BMI calculation for body shape
    let bodyShape = 'normal';
    if (latest.weight && client.height) {
      const heightM = client.height / 100;
      const bmi = latest.weight / (heightM * heightM);
      if (bmi < 18.5) bodyShape = 'slim';
      else if (bmi >= 18.5 && bmi < 25) bodyShape = 'fit';
      else if (bmi >= 25 && bmi < 30) bodyShape = 'bulky';
      else bodyShape = 'heavy';
    }

    // Map progress to avatar appearance
    const size = 140 + Math.min(Math.max(progressScore, 0), 100) * 0.8; // 140-220px
    const scale = 0.85 + (progressScore / 100) * 0.3; // 0.85-1.15x
    const glowIntensity = 0.2 + (progressScore / 100) * 0.6; // 0.2-0.8

    // Color based on progress
    let borderColor = '#FFB82B'; // yellow - neutral
    if (progressScore >= 70) borderColor = '#1BB55C'; // green - excellent
    else if (progressScore >= 55) borderColor = '#00BCD4'; // cyan - good
    else if (progressScore < 40) borderColor = '#FF4B39'; // red - needs work

    return {
      size: Math.round(size),
      borderColor,
      glowIntensity,
      scale,
      bodyShape,
      progressScore: Math.round(progressScore),
      weightChange,
      bodyFatChange,
    };
  };

  const avatarMetrics = calculateAvatarMetrics();

  // Prepare chart data
  const weightChartData = {
    labels: measurements
      .filter((m: any) => m.weight)
      .reverse()
      .map((m: any) => format(parseISO(m.date), 'MMM d')),
    datasets: [
      {
        label: 'Weight (kg)',
        data: measurements
          .filter((m: any) => m.weight)
          .reverse()
          .map((m: any) => m.weight),
        borderColor: '#FF4B39',
        backgroundColor: 'rgba(255, 75, 57, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const waistChartData = {
    labels: measurements
      .filter((m: any) => m.waist)
      .reverse()
      .map((m: any) => format(parseISO(m.date), 'MMM d')),
    datasets: [
      {
        label: 'Waist (cm)',
        data: measurements
          .filter((m: any) => m.waist)
          .reverse()
          .map((m: any) => m.waist),
        borderColor: '#1BB55C',
        backgroundColor: 'rgba(27, 181, 92, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const bodyFatChartData = {
    labels: measurements
      .filter((m: any) => m.body_fat)
      .reverse()
      .map((m: any) => format(parseISO(m.date), 'MMM d')),
    datasets: [
      {
        label: 'Body Fat %',
        data: measurements
          .filter((m: any) => m.body_fat)
          .reverse()
          .map((m: any) => m.body_fat),
        borderColor: '#FFB82B',
        backgroundColor: 'rgba(255, 184, 43, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Collect all progress photos
  const allPhotos = measurements
    .filter((m: any) => m.photos && m.photos.length > 0)
    .flatMap((m: any) =>
      m.photos.map((photo: string) => ({
        url: photo.startsWith('http') ? photo : `${API_URL}${photo}`,
        date: m.date,
      }))
    );

  // Calculate nutrition totals
  const totalNutrition = recent_meals.reduce(
    (acc: any, meal: any) => {
      if (meal.total_nutrients) {
        acc.calories += meal.total_nutrients.calories || 0;
        acc.protein += meal.total_nutrients.protein || 0;
        acc.carbs += meal.total_nutrients.carbs || 0;
        acc.fat += meal.total_nutrients.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const avgDailyCalories = recent_meals.length > 0 ? Math.round(totalNutrition.calories / 30) : 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header with Avatar */}
        <Paper sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            {/* Dynamic Animated Avatar */}
            <Box
              sx={{
                position: 'relative',
                width: avatarMetrics.size,
                height: avatarMetrics.size,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${avatarMetrics.borderColor} 0%, #FFB82B 100%)`,
                padding: '6px',
                boxShadow: `0 8px 32px rgba(255, 75, 57, ${avatarMetrics.glowIntensity})`,
                transition: 'all 0.5s ease-in-out',
                animation: avatarMetrics.progressScore >= 70 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: `0 8px 32px rgba(255, 75, 57, ${avatarMetrics.glowIntensity})`,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: `0 12px 48px rgba(27, 181, 92, ${avatarMetrics.glowIntensity * 1.5})`,
                  },
                },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(26, 26, 46, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${avatarMetrics.scale})`,
                  transition: 'transform 0.5s ease-in-out',
                }}
              >
                <LottieAnimation
                  animationPath={`/animations/${client.gender === 'female' ? 'female-avatar' : 'male-avatar'}.json`}
                  width={avatarMetrics.size - 40}
                  height={avatarMetrics.size - 40}
                  loop={true}
                />
              </Box>
              
              {/* Progress Badge */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -5,
                  right: -5,
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: avatarMetrics.borderColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #1a1a2e',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    color: '#fff',
                  }}
                >
                  {avatarMetrics.progressScore}
                </Typography>
              </Box>
            </Box>

            {/* Profile Info */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" gutterBottom sx={{ color: '#FF4B39', fontWeight: 'bold' }}>
                {client.name}'s Progress
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                Shared profile - Updates automatically
              </Typography>
              
              {/* Progress Indicators */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {avatarMetrics.weightChange !== 0 && (
                  <Chip
                    label={`${avatarMetrics.weightChange > 0 ? '−' : '+'}${Math.abs(avatarMetrics.weightChange).toFixed(1)} kg`}
                    size="small"
                    sx={{
                      backgroundColor: avatarMetrics.weightChange > 0 ? 'rgba(27, 181, 92, 0.2)' : 'rgba(255, 75, 57, 0.2)',
                      color: avatarMetrics.weightChange > 0 ? '#1BB55C' : '#FF4B39',
                    }}
                  />
                )}
                {avatarMetrics.bodyFatChange !== 0 && (
                  <Chip
                    label={`${avatarMetrics.bodyFatChange > 0 ? '−' : '+'}${Math.abs(avatarMetrics.bodyFatChange).toFixed(1)}% body fat`}
                    size="small"
                    sx={{
                      backgroundColor: avatarMetrics.bodyFatChange > 0 ? 'rgba(27, 181, 92, 0.2)' : 'rgba(255, 75, 57, 0.2)',
                      color: avatarMetrics.bodyFatChange > 0 ? '#1BB55C' : '#FF4B39',
                    }}
                  />
                )}
                <Chip
                  label={`Fitness Score: ${avatarMetrics.progressScore}/100`}
                  size="small"
                  sx={{
                    backgroundColor: `${avatarMetrics.borderColor}33`,
                    color: avatarMetrics.borderColor,
                    fontWeight: 'bold',
                  }}
                />
              </Box>
              
              <Chip
                label={`Link expires ${format(parseISO(share_expires_at), 'MMMM d, yyyy')}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255, 184, 43, 0.2)', color: '#FFB82B' }}
              />
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Weight Chart */}
          {weightChartData.labels.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Weight Progress
                  </Typography>
                  <LineChart data={weightChartData} height={250} />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Waist Chart */}
          {waistChartData.labels.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Waist Measurement
                  </Typography>
                  <LineChart data={waistChartData} height={250} />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Body Fat Chart */}
          {bodyFatChartData.labels.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Body Fat %
                  </Typography>
                  <LineChart data={bodyFatChartData} height={250} />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Nutrition Summary */}
          {recent_meals.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Nutrition (Last 30 Days)
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Avg Daily Calories
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#FF4B39' }}>
                        {avgDailyCalories}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Meals Logged
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#1BB55C' }}>
                        {recent_meals.length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Protein
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#FFB82B' }}>
                        {Math.round(totalNutrition.protein)}g
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Carbs
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#FFB82B' }}>
                        {Math.round(totalNutrition.carbs)}g
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Fat
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#FFB82B' }}>
                        {Math.round(totalNutrition.fat)}g
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Progress Photos */}
          {allPhotos.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Progress Photos
                  </Typography>
                  <ImageList cols={3} gap={8}>
                    {allPhotos.map((photo, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={photo.url}
                          alt={`Progress ${format(parseISO(photo.date), 'MMM d, yyyy')}`}
                          loading="lazy"
                          style={{ borderRadius: 8, objectFit: 'cover', height: 200 }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Active Quests */}
          {quests.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B', display: 'flex', alignItems: 'center', gap: 1 }}>
                    🎯 Active Quests
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {quests.map((quest: any) => {
                      const difficultyColors: any = {
                        easy: '#1BB55C',
                        medium: '#FFB82B',
                        hard: '#FF4B39',
                        epic: '#9C27B0',
                      };
                      
                      return (
                        <Grid item xs={12} md={6} key={quest.id}>
                          <Box
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: `2px solid ${difficultyColors[quest.difficulty] || '#FFB82B'}`,
                              boxShadow: `0 4px 12px ${difficultyColors[quest.difficulty]}33`,
                            }}
                          >
                            <Stack spacing={1.5}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                  {quest.title}
                                </Typography>
                                <Chip
                                  label={quest.difficulty.toUpperCase()}
                                  size="small"
                                  sx={{
                                    backgroundColor: difficultyColors[quest.difficulty],
                                    color: '#fff',
                                    fontWeight: 'bold',
                                  }}
                                />
                              </Box>
                              
                              <Typography variant="body2" color="textSecondary">
                                {quest.description}
                              </Typography>
                              
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" color="textSecondary">
                                    Progress
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1BB55C' }}>
                                    {quest.progress_percentage}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={quest.progress_percentage}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: difficultyColors[quest.difficulty],
                                      borderRadius: 4,
                                    },
                                  }}
                                />
                                {quest.target_value && quest.current_value !== null && (
                                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {quest.current_value} / {quest.target_value} {quest.target_unit}
                                  </Typography>
                                )}
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {quest.reward_achievement && (
                                  <Chip
                                    icon={<span>🏆</span>}
                                    label={`Reward: ${quest.reward_achievement}`}
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(255, 184, 43, 0.2)', color: '#FFB82B' }}
                                  />
                                )}
                                {quest.xp_reward && (
                                  <Chip
                                    label={`+${quest.xp_reward} XP`}
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(27, 181, 92, 0.2)', color: '#1BB55C' }}
                                  />
                                )}
                                {quest.deadline && (
                                  <Chip
                                    label={`Due: ${format(parseISO(quest.deadline), 'MMM d')}`}
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(255, 75, 57, 0.2)', color: '#FF4B39' }}
                                  />
                                )}
                              </Box>
                            </Stack>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B', display: 'flex', alignItems: 'center', gap: 1 }}>
                    🏆 Achievements Unlocked
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                    {achievements.map((achievement: any) => (
                      <Box
                        key={achievement.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(255, 184, 43, 0.1) 0%, rgba(255, 75, 57, 0.05) 100%)',
                          border: '1px solid rgba(255, 184, 43, 0.3)',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="h3">{achievement.icon || '🏆'}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#FFB82B' }}>
                            {achievement.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {achievement.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                            Earned {format(parseISO(achievement.awarded_at), 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B', display: 'flex', alignItems: 'center', gap: 1 }}>
                    🎖️ Milestones Achieved
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                    {milestones.map((milestone: any) => (
                      <Box
                        key={milestone.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, rgba(27, 181, 92, 0.1) 0%, rgba(0, 188, 212, 0.05) 100%)',
                          border: '1px solid rgba(27, 181, 92, 0.3)',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="h3">{milestone.icon || '🎖️'}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1BB55C' }}>
                            {milestone.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {milestone.description}
                          </Typography>
                          {milestone.celebration_message && (
                            <Typography variant="caption" sx={{ color: '#FFB82B', mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                              {milestone.celebration_message}
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                            Achieved {format(parseISO(milestone.achieved_at), 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Latest Measurements */}
          {measurements.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FFB82B' }}>
                    Latest Measurements
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {measurements[0].weight && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Weight
                        </Typography>
                        <Typography variant="h6">{measurements[0].weight} kg</Typography>
                      </Grid>
                    )}
                    {measurements[0].chest && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Chest
                        </Typography>
                        <Typography variant="h6">{measurements[0].chest} cm</Typography>
                      </Grid>
                    )}
                    {measurements[0].waist && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Waist
                        </Typography>
                        <Typography variant="h6">{measurements[0].waist} cm</Typography>
                      </Grid>
                    )}
                    {measurements[0].hips && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Hips
                        </Typography>
                        <Typography variant="h6">{measurements[0].hips} cm</Typography>
                      </Grid>
                    )}
                    {measurements[0].biceps_left && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Biceps (L)
                        </Typography>
                        <Typography variant="h6">{measurements[0].biceps_left} cm</Typography>
                      </Grid>
                    )}
                    {measurements[0].biceps_right && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Biceps (R)
                        </Typography>
                        <Typography variant="h6">{measurements[0].biceps_right} cm</Typography>
                      </Grid>
                    )}
                    {measurements[0].body_fat && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="body2" color="textSecondary">
                          Body Fat
                        </Typography>
                        <Typography variant="h6">{measurements[0].body_fat}%</Typography>
                      </Grid>
                    )}
                  </Grid>
                  {measurements[0].notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Notes
                      </Typography>
                      <Typography variant="body1">{measurements[0].notes}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
          <Typography variant="body2">Powered by FitTrack Pro</Typography>
          <Typography variant="caption">This profile updates automatically with your latest progress</Typography>
        </Box>
      </Container>
      
      {/* PWA Install Prompt for Mobile */}
      <PWAInstallPrompt />
    </Box>
  );
};
