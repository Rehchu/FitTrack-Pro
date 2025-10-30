import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close,
  Dashboard,
  People,
  CalendarMonth,
  Settings,
  ExitToApp,
  Notifications,
  Help
} from '@mui/icons-material';

const menuItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'Clients', icon: <People />, path: '/clients' },
  { label: 'Calendar', icon: <CalendarMonth />, path: '/calendar' },
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const getCurrentPageTitle = () => {
    const current = menuItems.find(item => location.pathname.startsWith(item.path));
    return current?.label || 'FitTrack Pro';
  };

  return (
    <>
      {/* App Bar */}
      <AppBar 
        position="sticky" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #673AB7 0%, #512DA8 100%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open menu"
            edge="start"
            onClick={toggleMenu}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getCurrentPageTitle()}
          </Typography>

          <IconButton color="inherit">
            <Notifications />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: theme.palette.mode === 'dark' ? '#1a1d2e' : '#fff',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#FF4B39', width: 48, height: 48 }}>T</Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Trainer
              </Typography>
              <Typography variant="caption" color="text.secondary">
                trainer@fittrack.pro
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setIsOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        <Divider />

        {/* Navigation Items */}
        <List sx={{ flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    backgroundColor: isActive ? 'rgba(255, 178, 43, 0.1)' : 'transparent',
                    borderLeft: isActive ? '4px solid #FFB82B' : '4px solid transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(255, 178, 43, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#FFB82B' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 'bold' : 'normal',
                      color: isActive ? '#FFB82B' : 'inherit',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider />

        {/* Bottom Items */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/help')}>
              <ListItemIcon>
                <Help />
              </ListItemIcon>
              <ListItemText primary="Help & Support" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/login')}>
              <ListItemIcon>
                <ExitToApp />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Version Info */}
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            FitTrack Pro v1.1.0
          </Typography>
        </Box>
      </Drawer>
    </>
  );
}
