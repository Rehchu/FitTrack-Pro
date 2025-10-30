import { createTheme, alpha } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    darkGrey: Palette['primary'];
  }
  interface PaletteOptions {
    tertiary: PaletteOptions['primary'];
    darkGrey: PaletteOptions['primary'];
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF4B39', // ProGym red
      light: '#ff7961',
      dark: '#ba000d',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FFB82B', // ProGym yellow/gold
      light: '#ffd95b',
      dark: '#c68a00',
      contrastText: '#000',
    },
    tertiary: {
      main: '#1BB55C', // ProGym green
      light: '#4cc77f',
      dark: '#128540',
      contrastText: '#fff',
    },
    darkGrey: {
      main: '#1A1A1A',
      light: '#2d2d2d',
      dark: '#000000',
      contrastText: '#fff',
    },
    background: {
      default: '#111111',
      paper: '#1A1A1A',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '2.25rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '50px',
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        contained: ({ theme }) => ({
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: alpha(theme.palette.primary.main, 0.8),
          },
        }),
        outlined: ({ theme }) => ({
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.darkGrey.main,
          backgroundImage: 'none',
          borderRadius: '16px',
          boxShadow: `0 8px 16px ${alpha('#000', 0.15)}`,
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1A',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.darkGrey.main,
          borderRight: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
        }),
      },
    },
  },
});