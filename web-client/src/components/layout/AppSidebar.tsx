import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard,
  Group,
  Message,
  Person,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brightness4,
  Brightness7,
  CalendarMonth,
  HelpOutline,
} from '@mui/icons-material';
import { useColorScheme } from '../../hooks/useColorScheme';

type AppSidebarProps = {
  onStartTour?: () => void;
};

export function AppSidebar({ onStartTour }: AppSidebarProps) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isOpen, setIsOpen] = useState(!isMobile);
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Dashboard />, id: 'nav-dashboard' },
    { path: '/clients', label: 'Clients', icon: <Person /> },
    { path: '/teams', label: 'Teams', icon: <Group /> },
    { path: '/messages', label: 'Messages', icon: <Message /> },
    { path: '/calendar', label: 'Calendar', icon: <CalendarMonth />, id: 'nav-calendar' },
    { path: '/settings', label: 'Settings', icon: <Settings /> },
  ];

  const drawer = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <img
          src="/logo.png"
          alt="FitTrack Pro"
          className="h-8"
        />
        <IconButton
          onClick={() => setIsOpen(false)}
          sx={{ display: { md: 'none' } }}
        >
          <ChevronLeft />
        </IconButton>
      </div>

      {/* Navigation */}
      <List className="flex-1">
        {navigationItems.map(({ path, label, icon, id }) => (
          <ListItem
            key={path}
            component={Link}
            to={path}
            button
            selected={location.pathname === path}
            id={id}
            className={`my-1 mx-2 rounded-lg transition-colors ${
              location.pathname === path
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ListItemIcon className="min-w-[40px]">
              {icon}
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItem>
        ))}
      </List>

      {/* Bottom actions */}
      <div className="p-4 border-t dark:border-gray-700">
        <IconButton
          onClick={onStartTour}
          className="w-full justify-start mb-2"
          size="large"
          id="action-help-tour"
        >
          <HelpOutline />
          <span className="ml-4">Help & Tour</span>
        </IconButton>
        <IconButton
          onClick={toggleColorScheme}
          className="w-full justify-start"
          size="large"
        >
          {colorScheme === 'dark' ? <Brightness7 /> : <Brightness4 />}
          <span className="ml-4">
            {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </IconButton>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-20 bg-white dark:bg-gray-800 shadow-lg"
        >
          <ChevronRight />
        </IconButton>
        <Drawer
          open={isOpen}
          onClose={() => setIsOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: 280 } }}
        >
          {drawer}
        </Drawer>
      </>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawer}
    </Drawer>
  );
}