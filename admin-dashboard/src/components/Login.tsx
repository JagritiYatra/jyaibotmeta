// Login Component

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  AdminPanelSettings
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation - in production, this should validate against backend
    const validToken = process.env.REACT_APP_ADMIN_TOKEN || 'your-secure-admin-token';
    
    if (token === validToken) {
      localStorage.setItem('adminToken', token);
      navigate('/dashboard');
    } else {
      setError('Invalid admin token');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3
          }}
        >
          <AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography component="h1" variant="h4">
            Admin Login
          </Typography>
        </Box>
        
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleLogin}>
              <Typography variant="h6" align="center" gutterBottom>
                JY WhatsApp Bot Admin
              </Typography>
              
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Enter your admin token to access the dashboard
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <TextField
                fullWidth
                label="Admin Token"
                type={showPassword ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mb: 2 }}
              >
                Login
              </Button>
              
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                Contact system administrator if you don't have access
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;