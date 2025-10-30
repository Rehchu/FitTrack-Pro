import React, { FC } from 'react';
import Lottie from 'lottie-react';
import { Box } from '@mui/material';

interface LottieAnimationProps {
  animationPath: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
}

export const LottieAnimation: FC<LottieAnimationProps> = ({
  animationPath,
  width = 200,
  height = 200,
  loop = true,
  autoplay = true,
}) => {
  const [animationData, setAnimationData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(animationPath)
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error('Failed to load animation:', error));
  }, [animationPath]);

  if (!animationData) {
    return null;
  }

  return (
    <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
    </Box>
  );
};
