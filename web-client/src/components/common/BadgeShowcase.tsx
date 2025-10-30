import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import { format, parseISO } from 'date-fns';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  category: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  badge_image_url: string | null;
  unlock_animation: any | null;
  awarded_at: string;
}

interface BadgeShowcaseProps {
  clientId: number;
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ clientId }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, [clientId]);

  const fetchAchievements = async () => {
    try {
      const response = await fetch(`/api/quests/achievements/client/${clientId}`);
      const data = await response.json();
      setAchievements(data || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return {
          main: '#E5E4E2',
          gradient: 'linear-gradient(135deg, #E5E4E2 0%, #BFC1C2 100%)',
        };
      case 'gold':
        return {
          main: '#FFD700',
          gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        };
      case 'silver':
        return {
          main: '#C0C0C0',
          gradient: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
        };
      case 'bronze':
      default:
        return {
          main: '#CD7F32',
          gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
        };
    }
  };

  const filteredAchievements = achievements.filter(
    (achievement) => tierFilter === 'all' || achievement.tier === tierFilter
  );

  const achievementCountByTier = {
    bronze: achievements.filter((a) => a.tier === 'bronze').length,
    silver: achievements.filter((a) => a.tier === 'silver').length,
    gold: achievements.filter((a) => a.tier === 'gold').length,
    platinum: achievements.filter((a) => a.tier === 'platinum').length,
  };

  const handleShare = (achievement: Achievement) => {
    const text = `🏆 I just unlocked the "${achievement.name}" achievement! ${achievement.description}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Achievement Unlocked!',
        text: text,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        alert('Achievement copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Achievement copied to clipboard!');
    }
  };

  const unlockAnimationVariants = {
    hidden: { scale: 0, rotate: -180, opacity: 0 },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const cardHoverVariants = {
    rest: { scale: 1, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    hover: {
      scale: 1.05,
      boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
      transition: { duration: 0.3 },
    },
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" mb={3}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Achievement Showcase
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {achievements.length} achievements unlocked
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={tierFilter}
          exclusive
          onChange={(_, value) => value && setTierFilter(value)}
          size="small"
        >
          <ToggleButton value="all">
            All ({achievements.length})
          </ToggleButton>
          <ToggleButton value="bronze">
            🥉 Bronze ({achievementCountByTier.bronze})
          </ToggleButton>
          <ToggleButton value="silver">
            🥈 Silver ({achievementCountByTier.silver})
          </ToggleButton>
          <ToggleButton value="gold">
            🥇 Gold ({achievementCountByTier.gold})
          </ToggleButton>
          <ToggleButton value="platinum">
            💎 Platinum ({achievementCountByTier.platinum})
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Grid container spacing={3}>
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => {
            const tierColors = getTierColor(achievement.tier);

            return (
              <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                <motion.div
                  layout
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={cardHoverVariants}
                  whileHover="hover"
                >
                  <Card
                    sx={{
                      cursor: 'pointer',
                      background: tierColors.gradient,
                      color: 'white',
                      position: 'relative',
                      overflow: 'visible',
                    }}
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography
                            variant="h4"
                            sx={{
                              fontSize: '3rem',
                              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                            }}
                          >
                            {achievement.icon || '🏆'}
                          </Typography>
                        </Box>

                        <Chip
                          label={achievement.tier.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </Box>

                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{
                          mt: 2,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {achievement.name}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          opacity: 0.9,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {achievement.description}
                      </Typography>

                      {achievement.category && (
                        <Chip
                          label={achievement.category.replace('_', ' ')}
                          size="small"
                          sx={{
                            mt: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                          }}
                        />
                      )}

                      <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.8 }}>
                        Unlocked: {format(parseISO(achievement.awarded_at), 'MMM d, yyyy')}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </AnimatePresence>
      </Grid>

      {/* Achievement Details Dialog */}
      <Dialog
        open={selectedAchievement !== null}
        onClose={() => setSelectedAchievement(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAchievement && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h4">{selectedAchievement.icon || '🏆'}</Typography>
                  <Box>
                    <Typography variant="h6">{selectedAchievement.name}</Typography>
                    <Chip
                      label={selectedAchievement.tier.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getTierColor(selectedAchievement.tier).main,
                        color: 'white',
                      }}
                    />
                  </Box>
                </Box>
                <IconButton onClick={() => setSelectedAchievement(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{selectedAchievement.description}</Typography>
                </Box>

                {selectedAchievement.category && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body1">
                      {selectedAchievement.category.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Unlocked On
                  </Typography>
                  <Typography variant="body1">
                    {format(parseISO(selectedAchievement.awarded_at), 'MMMM d, yyyy • h:mm a')}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                startIcon={<ShareIcon />}
                onClick={() => handleShare(selectedAchievement)}
                variant="outlined"
              >
                Share Achievement
              </Button>
              <Button onClick={() => setSelectedAchievement(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Unlock Animation (for future use when new achievements are earned) */}
      <AnimatePresence>
        {showUnlockAnimation && selectedAchievement && (
          <motion.div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9999,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              variants={unlockAnimationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: getTierColor(selectedAchievement.tier).gradient,
                padding: '3rem',
                borderRadius: '1rem',
                textAlign: 'center',
                color: 'white',
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: 2,
                }}
              >
                <Typography variant="h1">{selectedAchievement.icon || '🏆'}</Typography>
              </motion.div>
              <Typography variant="h4" fontWeight="bold" mt={2}>
                Achievement Unlocked!
              </Typography>
              <Typography variant="h5" mt={1}>
                {selectedAchievement.name}
              </Typography>
              <Typography variant="body1" mt={2} sx={{ opacity: 0.9 }}>
                {selectedAchievement.description}
              </Typography>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default BadgeShowcase;
