import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { 
  Brightness4, 
  Brightness7,
} from '@mui/icons-material';

// Theme
import { createAppTheme } from './theme/theme';

// Components
import Layout from './components/Layout';
import FuturisticDashboard from './components/FuturisticDashboard';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import Users from './components/Users';
import UserDetail from './components/UserDetail';
import UserEdit from './components/UserEdit';
import Sessions from './components/Sessions';
import UserBehavior from './components/UserBehavior';
import Login from './components/Login';

// Legacy components (will be replaced gradually)
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Theme mode context
export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as 'light' | 'dark') || 'dark';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
    }),
    []
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Add global styles for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(0, 217, 255, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
        }
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes scaleIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: ${mode === 'dark' ? '#0A0E27' : '#F5F7FA'};
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${mode === 'dark' ? '#00D9FF' : '#0066FF'};
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${mode === 'dark' ? '#00B8CC' : '#0052CC'};
      }
      
      * {
        scrollbar-width: thin;
        scrollbar-color: ${mode === 'dark' ? '#00D9FF #0A0E27' : '#0066FF #F5F7FA'};
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Router basename="/admin">
            <AnimatePresence mode="wait">
              <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                {/* Theme Toggle Button */}
                <Tooltip title="Toggle theme" placement="left">
                  <IconButton
                    sx={{
                      position: 'fixed',
                      bottom: 24,
                      right: 24,
                      zIndex: 9999,
                      bgcolor: 'background.paper',
                      boxShadow: 3,
                      '&:hover': {
                        transform: 'rotate(180deg)',
                        transition: 'transform 0.3s',
                      },
                    }}
                    onClick={colorMode.toggleColorMode}
                    color="inherit"
                  >
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>
                </Tooltip>

                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<FuturisticDashboard />} />
                    <Route path="/dashboard-legacy" element={<Dashboard />} />
                    <Route path="/analytics" element={<AdvancedAnalytics />} />
                    <Route path="/analytics-legacy" element={<Analytics />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:whatsappNumber" element={<UserDetail />} />
                    <Route path="/users/:whatsappNumber/edit" element={<UserEdit />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/behavior" element={<UserBehavior />} />
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </Box>
            </AnimatePresence>
          </Router>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: mode === 'dark' ? '#0F1429' : '#FFFFFF',
              color: mode === 'dark' ? '#FFFFFF' : '#1A202C',
              border: `1px solid ${mode === 'dark' ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 102, 255, 0.2)'}`,
              borderRadius: '12px',
              boxShadow: mode === 'dark' 
                ? '0 8px 32px rgba(0, 217, 255, 0.1)' 
                : '0 8px 32px rgba(0, 102, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: theme.palette.success.main,
                secondary: theme.palette.background.paper,
              },
            },
            error: {
              iconTheme: {
                primary: theme.palette.error.main,
                secondary: theme.palette.background.paper,
              },
            },
          }}
        />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;