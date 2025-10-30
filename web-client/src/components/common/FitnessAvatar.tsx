import React from 'react';
import { Box, Typography } from '@mui/material';
import { LottieAnimation } from './LottieAnimation';

interface FitnessAvatarProps {
  gender?: 'male' | 'female';
  progressScore: number;
  size?: number;
  showBadge?: boolean;
}

export const FitnessAvatar: React.FC<FitnessAvatarProps> = ({
  gender = 'male',
  progressScore,
  size = 180,
  showBadge = true,
}) => {
  // Map progress to visual properties
  const scale = 0.85 + (progressScore / 100) * 0.3; // 0.85-1.15x
  const glowIntensity = 0.2 + (progressScore / 100) * 0.6; // 0.2-0.8

  // Color based on progress
  let borderColor = '#FFB82B'; // yellow - neutral
  if (progressScore >= 70) borderColor = '#1BB55C'; // green - excellent
  else if (progressScore >= 55) borderColor = '#00BCD4'; // cyan - good
  else if (progressScore < 40) borderColor = '#FF4B39'; // red - needs work

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${borderColor} 0%, #FFB82B 100%)`,
        padding: '6px',
        boxShadow: `0 8px 32px rgba(255, 75, 57, ${glowIntensity})`,
        transition: 'all 0.5s ease-in-out',
        animation: progressScore >= 70 ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: `0 8px 32px rgba(255, 75, 57, ${glowIntensity})`,
          },
          '50%': {
            transform: 'scale(1.05)',
            boxShadow: `0 12px 48px rgba(27, 181, 92, ${glowIntensity * 1.5})`,
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
          transform: `scale(${scale})`,
          transition: 'transform 0.5s ease-in-out',
        }}
      >
        <LottieAnimation
          animationPath={`/animations/${gender === 'female' ? 'female-avatar' : 'male-avatar'}.json`}
          width={size - 40}
          height={size - 40}
          loop={true}
        />
      </Box>

      {/* Progress Badge */}
      {showBadge && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: borderColor,
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
            {progressScore}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
