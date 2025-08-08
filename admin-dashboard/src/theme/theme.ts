import { createTheme, alpha } from '@mui/material/styles';

export const getDesignTokens = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          primary: {
            main: '#00D9FF',
            light: '#5EFFFF',
            dark: '#00A8CC',
            contrastText: '#000000',
          },
          secondary: {
            main: '#FF00FF',
            light: '#FF66FF',
            dark: '#CC00CC',
            contrastText: '#FFFFFF',
          },
          success: {
            main: '#00FF88',
            light: '#66FFB3',
            dark: '#00CC6A',
          },
          error: {
            main: '#FF0066',
            light: '#FF6699',
            dark: '#CC0052',
          },
          warning: {
            main: '#FFD700',
            light: '#FFE433',
            dark: '#CCAC00',
          },
          info: {
            main: '#00B8FF',
            light: '#66D4FF',
            dark: '#0093CC',
          },
          background: {
            default: '#0A0E27',
            paper: '#0F1429',
          },
          text: {
            primary: '#FFFFFF',
            secondary: alpha('#FFFFFF', 0.7),
            disabled: alpha('#FFFFFF', 0.5),
          },
          divider: alpha('#00D9FF', 0.12),
        }
      : {
          primary: {
            main: '#0066FF',
            light: '#3385FF',
            dark: '#0052CC',
            contrastText: '#FFFFFF',
          },
          secondary: {
            main: '#9C27B0',
            light: '#BA68C8',
            dark: '#7B1FA2',
            contrastText: '#FFFFFF',
          },
          success: {
            main: '#00C853',
            light: '#5EFC82',
            dark: '#00A041',
          },
          error: {
            main: '#FF1744',
            light: '#FF616F',
            dark: '#C4001D',
          },
          warning: {
            main: '#FF9800',
            light: '#FFB74D',
            dark: '#F57C00',
          },
          info: {
            main: '#00ACC1',
            light: '#4DD0E1',
            dark: '#00838F',
          },
          background: {
            default: '#F5F7FA',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#1A202C',
            secondary: alpha('#1A202C', 0.7),
            disabled: alpha('#1A202C', 0.5),
          },
          divider: alpha('#0066FF', 0.12),
        }),
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.75rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '2.125rem',
      fontWeight: 600,
      letterSpacing: '-0.005em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '0',
      lineHeight: 1.5,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 500,
      letterSpacing: '0',
      lineHeight: 1.6,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 500,
      letterSpacing: '0',
      lineHeight: 1.7,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.75,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'dark' 
              ? '0 8px 24px rgba(0, 217, 255, 0.25)'
              : '0 8px 24px rgba(0, 102, 255, 0.25)',
          },
        },
        contained: {
          background: mode === 'dark'
            ? 'linear-gradient(135deg, #00D9FF 0%, #0099FF 100%)'
            : 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
          '&:hover': {
            background: mode === 'dark'
              ? 'linear-gradient(135deg, #00B8CC 0%, #0088EE 100%)'
              : 'linear-gradient(135deg, #0052CC 0%, #0041AA 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          background: mode === 'dark'
            ? 'linear-gradient(135deg, rgba(15, 20, 41, 0.9) 0%, rgba(15, 20, 41, 0.7) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
          border: mode === 'dark'
            ? '1px solid rgba(0, 217, 255, 0.1)'
            : '1px solid rgba(0, 102, 255, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: mode === 'dark'
              ? '0 20px 60px rgba(0, 217, 255, 0.15)'
              : '0 20px 60px rgba(0, 102, 255, 0.15)',
            border: mode === 'dark'
              ? '1px solid rgba(0, 217, 255, 0.2)'
              : '1px solid rgba(0, 102, 255, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
          background: mode === 'dark'
            ? 'rgba(15, 20, 41, 0.8)'
            : 'rgba(255, 255, 255, 0.9)',
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(0, 217, 255, 0.1)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'dark' ? '#00D9FF' : '#0066FF',
                borderWidth: 2,
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: mode === 'dark' ? '#00D9FF' : '#0066FF',
                borderWidth: 2,
                boxShadow: mode === 'dark'
                  ? '0 0 20px rgba(0, 217, 255, 0.2)'
                  : '0 0 20px rgba(0, 102, 255, 0.2)',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1) rotate(5deg)',
            background: mode === 'dark'
              ? 'rgba(0, 217, 255, 0.1)'
              : 'rgba(0, 102, 255, 0.1)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: mode === 'dark' ? '#00D9FF' : '#0066FF',
            '& + .MuiSwitch-track': {
              backgroundColor: mode === 'dark' ? '#00D9FF' : '#0066FF',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
          background: mode === 'dark'
            ? 'rgba(0, 217, 255, 0.1)'
            : 'rgba(0, 102, 255, 0.1)',
        },
        bar: {
          borderRadius: 8,
          background: mode === 'dark'
            ? 'linear-gradient(90deg, #00D9FF 0%, #FF00FF 100%)'
            : 'linear-gradient(90deg, #0066FF 0%, #9C27B0 100%)',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme(getDesignTokens(mode));
};