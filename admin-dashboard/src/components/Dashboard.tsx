// Main Dashboard Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  Skeleton
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  People,
  CheckCircle,
  TrendingUp,
  Search,
  Psychology,
  AccessTime,
  PersonAdd,
  Verified,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { getDashboardStats } from '../services/api';
import { DashboardStats } from '../types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

const StatCard = ({ title, value, subtitle, icon, color, trend }: any) => {
  return (
    <Card sx={{ 
      height: '100%',
      background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 24px -10px rgba(0,0,0,0.12)'
      }
    }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                mb: 1,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                mb: 0.5,
                background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Box display="flex" alignItems="center" gap={0.5}>
                {trend && (
                  <TrendingUp 
                    sx={{ 
                      fontSize: 16, 
                      color: trend > 0 ? 'success.main' : 'error.main',
                      transform: trend < 0 ? 'rotate(180deg)' : 'none'
                    }} 
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: `${color}20`,
              width: 56,
              height: 56
            }}
          >
            {React.cloneElement(icon, { 
              sx: { color, fontSize: 28 } 
            })}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return <Typography>Failed to load dashboard</Typography>;
  }

  // Prepare data for charts
  const profileCompletionData = [
    { name: 'Complete', value: stats.overview.completedProfiles },
    { name: 'Incomplete', value: stats.overview.totalUsers - stats.overview.completedProfiles }
  ];

  const verificationData = [
    { name: 'Verified', value: stats.overview.verifiedUsers },
    { name: 'Unverified', value: stats.overview.totalUsers - stats.overview.verifiedUsers }
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Welcome to JY Alumni Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor your WhatsApp bot performance and user engagement in real-time
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Users"
            value={stats.overview.totalUsers.toLocaleString()}
            subtitle={`+${stats.growth.daily.new} today`}
            icon={<People />}
            color="#2563eb"
            trend={stats.growth.daily.new}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Verified Users"
            value={stats.overview.verifiedUsers.toLocaleString()}
            subtitle={stats.overview.verificationRate}
            icon={<Verified />}
            color="#10b981"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Complete Profiles"
            value={stats.overview.completedProfiles.toLocaleString()}
            subtitle={stats.overview.completionRate}
            icon={<Psychology />}
            color="#7c3aed"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Active Users (7d)"
            value={stats.overview.activeUsers.toLocaleString()}
            subtitle={`${Math.round((stats.overview.activeUsers / stats.overview.totalUsers) * 100)}% engagement`}
            icon={<AnalyticsIcon />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Profile Completion Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 16px -8px rgba(0,0,0,0.1)'
            }
          }}>
            <Box mb={2}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Profile Completion Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overview of user profile completeness
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profileCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={entry => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {profileCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Verification Status Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 16px -8px rgba(0,0,0,0.1)'
            }
          }}>
            <Box mb={2}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Email Verification Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User verification breakdown
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verificationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={entry => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {verificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Growth Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 16px -8px rgba(0,0,0,0.1)'
            }
          }}>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Growth Metrics & Trends
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track user acquisition and engagement patterns
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <AccessTime color="primary" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Daily Growth
                    </Typography>
                    <Typography>
                      New: {stats.growth.daily.new} | Active: {stats.growth.daily.active}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUp color="success" />
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Weekly Growth
                    </Typography>
                    <Typography>
                      New: {stats.growth.weekly.new} | Active: {stats.growth.weekly.active}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;