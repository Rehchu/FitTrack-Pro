import React, { useMemo } from 'react';

/**
 * Dynamic Fitness Avatar Component
 * Visualizes client progress with color-coded borders, size scaling, and animations
 * Based on fitness score (0-100) calculated from weight, body fat, waist, and meal tracking
 */
export function FitnessAvatar({ 
  avatarUrl, 
  progressScore = 50, 
  size = 180, 
  showBadge = true,
  clientName = 'Client'
}) {
  // Calculate visual properties based on progress score
  const metrics = useMemo(() => {
    const clampedScore = Math.max(0, Math.min(100, progressScore));
    
    // Avatar size: Use provided size prop (default 180px)
    const avatarSize = size;
    
    // Border color based on score ranges
    let borderColor = '#FF4B39'; // Red (0-39)
    if (clampedScore >= 70) borderColor = '#1BB55C'; // Green (70-100)
    else if (clampedScore >= 55) borderColor = '#00BCD4'; // Cyan (55-69)
    else if (clampedScore >= 40) borderColor = '#FFB82B'; // Yellow (40-54)
    
    // Glow intensity: 0.2 - 0.8
    const glowOpacity = 0.2 + (clampedScore / 100) * 0.6;
    
    // Scale animation: subtle 0.95x - 1.05x for pulse effect only
    const scaleMultiplier = 1.0;
    
    // Pulse animation for excellent progress
    const shouldPulse = clampedScore >= 70;
    
    return {
      size: avatarSize,
      borderColor,
      glowOpacity,
      scale: scaleMultiplier,
      pulse: shouldPulse
    };
  }, [progressScore, size]);

  const containerStyle = {
    display: 'inline-block',
    position: 'relative',
    width: size,
    height: size,
  };

  const avatarStyle = {
    width: metrics.size,
    height: metrics.size,
    borderRadius: '50%',
    border: `4px solid ${metrics.borderColor}`,
    boxShadow: `0 0 20px ${metrics.borderColor}${Math.round(metrics.glowOpacity * 255).toString(16).padStart(2, '0')}`,
    transform: `scale(${metrics.scale})`,
    transition: 'all 0.5s ease-in-out',
    animation: metrics.pulse ? 'avatarPulse 2s ease-in-out infinite' : 'none',
    objectFit: 'cover',
    display: 'block',
  };

  const badgeStyle = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: metrics.borderColor,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    border: '2px solid #1a1d2e',
  };

  return (
    <>
      <style>{`
        @keyframes avatarPulse {
          0%, 100% { transform: scale(${metrics.scale}); }
          50% { transform: scale(${metrics.scale * 1.05}); }
        }
      `}</style>
      <div style={containerStyle}>
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={clientName} 
            style={avatarStyle}
          />
        ) : (
          <div style={{
            ...avatarStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2a2f42',
            color: '#9ca3af',
            fontSize: `${metrics.size / 4}px`,
          }}>
            {clientName.charAt(0).toUpperCase()}
          </div>
        )}
        {showBadge && (
          <div style={badgeStyle}>
            {Math.round(progressScore)}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Calculate fitness progress score from client data
 * @param {Object} data - Client measurements and tracking data
 * @returns {number} Score from 0-100
 */
export function calculateProgressScore(data) {
  let score = 50; // Start at neutral
  
  const {
    weightChange = 0,        // kg lost (positive) or gained (negative)
    bodyFatChange = 0,       // % reduced (positive) or increased (negative)
    waistChange = 0,         // cm lost (positive) or gained (negative)
    mealsDays = 0,           // days with meals logged (last 30 days)
  } = data;
  
  // Weight change: ±2 points per kg (max ±20)
  score += Math.max(-20, Math.min(20, weightChange * 2));
  
  // Body fat reduction: +3 points per % reduced (max +20)
  score += Math.max(0, Math.min(20, bodyFatChange * 3));
  
  // Waist reduction: +1.5 points per cm lost (max +15)
  score += Math.max(0, Math.min(15, waistChange * 1.5));
  
  // Meal tracking consistency: 0-15 points (perfect 30/30 days = 15 points)
  score += (mealsDays / 30) * 15;
  
  return Math.max(0, Math.min(100, score));
}
