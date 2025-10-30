import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Person,
  Group,
  VideoCall,
  Message,
  EmojiEvents,
  TrendingUp,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { LineChart } from '../components/charts/LineChart';

interface DashboardStats {
  totalClients: number;
  activeTeams: number;
  upcomingCalls: number;
  unreadMessages: number;
  achievements: number;
  recentProgress: {
    date: string;
    value: number;
  }[];
}

export function Dashboard() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { showNotification } = useNotifications();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Fetch dashboard stats
    fetch('/api/trainers/dashboard')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => {
        showNotification({
          title: 'Error',
          body: 'Failed to load dashboard stats',
          type: 'info'
        });
      });
  }, []);

  if (!stats) {
    return <div>Loading...</div>;
  }

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: <Person />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Active Teams',
      value: stats.activeTeams,
      icon: <Group />,
      color: theme.palette.secondary.main,
    },
    {
      title: 'Upcoming Calls',
      value: stats.upcomingCalls,
      icon: <VideoCall />,
      color: theme.palette.success.main,
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: <Message />,
      color: theme.palette.info.main,
    },
    {
      title: 'Achievements',
      value: stats.achievements,
      icon: <EmojiEvents />,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4">
          Welcome back, {user?.name}!
        </Typography>
      </div>

      {/* Stats Grid */}
      <Grid container spacing={3} className="mb-6">
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card className="h-full">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Typography color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4">
                      {stat.value}
                    </Typography>
                  </div>
                  <IconButton
                    style={{ color: stat.color }}
                    size="large"
                  >
                    {stat.icon}
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Progress Chart */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h6">
              Client Progress Overview
            </Typography>
            <IconButton size="large">
              <TrendingUp />
            </IconButton>
          </div>
          <div className="h-80">
            <LineChart
              data={{
                labels: stats.recentProgress.map(item => item.date),
                datasets: [{
                  label: 'Progress',
                  data: stats.recentProgress.map(item => item.value),
                  borderColor: theme.palette.primary.main,
                  backgroundColor: theme.palette.primary.main,
                  tension: 0.4,
                }]
              }}
              height={320}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}