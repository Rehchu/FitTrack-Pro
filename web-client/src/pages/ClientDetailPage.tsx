import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Tabs,
  Tab,
  IconButton,
  Button,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Message,
  VideoCall,
  FitnessCenter,
  Restaurant,
  EmojiEvents,
  Star,
  Lock,
  Straighten
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://fittrack-pro-desktop.rehchu1.workers.dev/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/clients/${clientId}`);
      setClient(response.data);
    } catch (error) {
      console.error('Failed to load client:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!client) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Client not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/clients')}>
            <ArrowBack />
          </IconButton>
          <Avatar src={client.avatar_url} sx={{ width: 48, height: 48 }}>
            {client.name?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{client.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {client.email}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const friendlyName = client.name.replace(/\s+/g, '').toLowerCase();
              const url = `https://fittrack-pro-desktop.rehchu1.workers.dev/client/${friendlyName}`;
              navigator.clipboard.writeText(url);
              alert('Profile link copied to clipboard!');
            }}
          >
            Share Profile
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 2 }}
        >
          <Tab icon={<Straighten />} label="Measurements" />
          <Tab icon={<FitnessCenter />} label="Workouts" />
          <Tab icon={<Restaurant />} label="Meals" />
          <Tab icon={<EmojiEvents />} label="Achievements" />
          <Tab icon={<Star />} label="Quests" />
          <Tab icon={<Message />} label="Chat" />
          <Tab icon={<VideoCall />} label="Video" />
          <Tab icon={<Lock />} label="Demographics" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>Measurements</Typography>
          <Typography color="text.secondary">Track body measurements and progress photos</Typography>
          {/* TODO: Add measurements table/chart */}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>Workouts</Typography>
          <Typography color="text.secondary">Assign workout plans and track client logs</Typography>
          {/* TODO: Add workout builder */}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>Meals</Typography>
          <Typography color="text.secondary">Create meal plans and monitor nutrition</Typography>
          {/* TODO: Add meal builder */}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>Achievements</Typography>
          <Typography color="text.secondary">View earned badges and milestones</Typography>
          {/* TODO: Add achievements grid */}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" gutterBottom>Quests</Typography>
          <Typography color="text.secondary">Assign challenges and track progress</Typography>
          {/* TODO: Add quest assignment */}
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" gutterBottom>Chat</Typography>
          <Typography color="text.secondary">Real-time messaging with client</Typography>
          {/* TODO: Add chat component */}
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <Typography variant="h6" gutterBottom>Video Calls</Typography>
          <Typography color="text.secondary">Schedule and manage video sessions</Typography>
          {/* TODO: Add video call scheduler */}
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          <Typography variant="h6" gutterBottom>Demographics</Typography>
          <Typography color="text.secondary">Private health and personal information</Typography>
          {/* TODO: Add demographics form */}
        </TabPanel>
      </Box>
    </Box>
  );
}
