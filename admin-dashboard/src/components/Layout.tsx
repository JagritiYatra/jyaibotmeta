// Layout Component with Navigation

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  alpha,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Psychology,
  Analytics,
  Logout,
  AccountCircle,
  Notifications,
  ChevronLeft,
  Settings,
  WhatsApp,
  Group,
  TrendingUp
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;

const orgName = process.env.REACT_APP_ORG_NAME || 'JY Alumni Network';
const orgTagline = process.env.REACT_APP_ORG_TAGLINE || 'Connecting Change Makers';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Logout functionality removed
    console.log('Logout clicked');
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <Dashboard />, 
      path: '/dashboard',
      description: 'Overview & Statistics',
      color: '#2563eb'
    },
    { 
      text: 'Users', 
      icon: <People />, 
      path: '/users',
      description: 'Manage Alumni Profiles',
      color: '#10b981'
    },
    { 
      text: 'Sessions', 
      icon: <Psychology />, 
      path: '/sessions',
      description: 'Active Conversations',
      color: '#7c3aed'
    },
    { 
      text: 'Analytics', 
      icon: <Analytics />, 
      path: '/analytics',
      description: 'Search Insights',
      color: '#f59e0b'
    },
    { 
      text: 'User Behavior', 
      icon: <TrendingUp />, 
      path: '/behavior',
      description: 'Behavior Analytics',
      color: '#ef4444'
    },
  ];

  const theme = useTheme();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 3, 
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        color: 'white'
      }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <WhatsApp sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {orgName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Admin Dashboard
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <List sx={{ px: 2, py: 1, flex: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(item.color, 0.1),
                    '&:hover': {
                      bgcolor: alpha(item.color, 0.2),
                    },
                  },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <ListItemIcon>
                  <Avatar 
                    sx={{ 
                      width: 40, 
                      height: 40,
                      bgcolor: isSelected ? item.color : alpha(item.color, 0.1),
                      color: isSelected ? 'white' : item.color,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                  </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography fontWeight={isSelected ? 600 : 500}>
                      {item.text}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  }
                  sx={{ ml: 1 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box 
          sx={{ 
            p: 2, 
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            mb: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <TrendingUp color="primary" />
            <Typography variant="subtitle2" fontWeight={600}>
              Quick Stats
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {orgTagline}
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          WhatsApp Bot Admin v3.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap component="div" fontWeight={600}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'Admin Panel'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {menuItems.find(item => item.path === location.pathname)?.description || ''}
            </Typography>
          </Box>
          
          <IconButton 
            sx={{ 
              color: 'text.primary',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
              mr: 1
            }}
          >
            <Badge badgeContent={4} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <Avatar
            sx={{ 
              bgcolor: theme.palette.primary.main,
              width: 36,
              height: 36,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
            onClick={handleProfileMenuOpen}
          >
            A
          </Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;