import { FC } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: ChartData<'line'>;
  title?: string;
  height?: number;
  showLegend?: boolean;
}

export const LineChart: FC<LineChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = false
}) => {
  const theme = useTheme();

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          color: theme.palette.text.primary,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: theme.palette.text.primary,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
        }
      },
      x: {
        border: {
          display: false
        },
        grid: {
          display: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        }
      },
    },
  };

  return (
    <Box height={height} width="100%">
      <Line data={data} options={options} />
    </Box>
  );
}