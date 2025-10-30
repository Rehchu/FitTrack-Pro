import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Search,
  Add,
  TrendingUp,
  TrendingDown,
  Message,
  VideoCall,
  MoreVert,
  Person
} from '@mui/icons-material';
import axios from 'axios';

interface Client {
  id: number;
  name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
  latest_weight?: number;
  weight_change?: number;
  progress_score?: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://fittrack-pro-desktop.rehchu1.workers.dev/api';
const TRAINER_ID = 1; // For production testing - will be replaced with auth later

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/clients?trainerId=${TRAINER_ID}`);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      await axios.post(`${API_BASE}/clients`, {
        ...newClient,
        trainerId: TRAINER_ID
      });
      setOpenAddDialog(false);
      setNewClient({ name: '', email: '', phone: '' });
      loadClients();
    } catch (error) {
      console.error('Failed to add client:', error);
      alert('Failed to add client. Please try again.');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Clients
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track your clients' progress
          </Typography>
        </Box>
      </Box>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search clients by name or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Client Grid */}
      {loading ? (
        <Typography>Loading clients...</Typography>
      ) : filteredClients.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No clients found' : 'No clients yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'Try a different search term' : 'Click the + button to add your first client'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredClients.map((client) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={client.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      src={client.avatar_url}
                      sx={{ width: 56, height: 56, mr: 2 }}
                    >
                      {client.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {client.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {client.email}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Stats */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {client.latest_weight && (
                      <Chip
                        size="small"
                        label={`${client.latest_weight} lbs`}
                        icon={client.weight_change && client.weight_change < 0 ? <TrendingDown /> : <TrendingUp />}
                        color={client.weight_change && client.weight_change < 0 ? 'success' : 'default'}
                      />
                    )}
                    {client.progress_score !== undefined && (
                      <Chip
                        size="small"
                        label={`${Math.round(client.progress_score)}%`}
                        color={getProgressColor(client.progress_score)}
                      />
                    )}
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}/chat`);
                      }}
                    >
                      <Message />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}/video`);
                      }}
                    >
                      <VideoCall />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add client"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setOpenAddDialog(true)}
      >
        <Add />
      </Fab>

      {/* Add Client Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            type="text"
            fullWidth
            required
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            required
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Phone Number (optional)"
            type="tel"
            fullWidth
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddClient} variant="contained" disabled={!newClient.name || !newClient.email}>
            Add Client
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
