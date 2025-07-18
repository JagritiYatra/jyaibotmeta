import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  People,
  QueryStats,
  Schedule,
  TrendingUp,
  Speed,
  Memory
} from '@mui/icons-material';
import { getUserBehaviorAnalytics, getSystemMetrics } from '../services/api';
import { UserBehaviorAnalytics, SystemMetrics } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899'];

const UserBehavior: React.FC = () => {
  const [behaviorData, setBehaviorData] = useState<UserBehaviorAnalytics | null>(null);
  const [systemData, setSystemData] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');

  useEffect(() => {
    fetchData();
  }, [timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const [behavior, system] = await Promise.all([
        getUserBehaviorAnalytics(timeframe),
        getSystemMetrics(timeframe)
      ]);
      setBehaviorData(behavior);
      setSystemData(system);
    } catch (error) {
      console.error('Failed to fetch user behavior data:', error);
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

  const queryTypeData = behaviorData?.queryTypeBreakdown ? 
    Object.entries(behaviorData.queryTypeBreakdown).map(([type, count]) => ({
      type,
      count
    })) : [];

  const hourlyData = behaviorData?.hourlyDistribution?.map(item => ({
    hour: `${item.hour}:00`,
    count: item.count
  })) || [];

  const engagementData = behaviorData?.engagementMetrics ? [
    { name: 'Active Users', value: behaviorData.engagementMetrics.activeUsers },
    { name: 'Returning Users', value: behaviorData.engagementMetrics.returningUsers },
    { name: 'New Users', value: behaviorData.engagementMetrics.newUsers }
  ] : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          User Behavior Analytics
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            label="Timeframe"
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                    Total Queries
                  </Typography>
                  <Typography variant="h4">
                    {behaviorData?.totalQueries?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <QueryStats fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                    Unique Users
                  </Typography>
                  <Typography variant="h4">
                    {behaviorData?.uniqueUsers || 0}
                  </Typography>
                </Box>
                <People fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                    Avg Session
                  </Typography>
                  <Typography variant="h4">
                    {behaviorData?.avgSessionDuration || 0}m
                  </Typography>
                </Box>
                <Schedule fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                    Total Sessions
                  </Typography>
                  <Typography variant="h4">
                    {behaviorData?.totalSessions || 0}
                  </Typography>
                </Box>
                <TrendingUp fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Metrics */}
      {systemData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      Response Time
                    </Typography>
                    <Typography variant="h4">
                      {systemData.responseTime?.avg || 0}ms
                    </Typography>
                  </Box>
                  <Speed fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      Memory Usage
                    </Typography>
                    <Typography variant="h4">
                      {systemData.memoryUsage?.percentage || 0}%
                    </Typography>
                  </Box>
                  <Memory fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      API Calls
                    </Typography>
                    <Typography variant="h4">
                      {systemData.apiCalls?.total || 0}
                    </Typography>
                  </Box>
                  <QueryStats fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #84cc16 0%, #a3e635 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                      Uptime
                    </Typography>
                    <Typography variant="h4">
                      {Math.round((systemData.uptime || 0) / 3600)}h
                    </Typography>
                  </Box>
                  <TrendingUp fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Query Types Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Query Types Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queryTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {queryTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* User Engagement */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Engagement
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Hourly Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Hourly Activity Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Active Users */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Active Users
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>WhatsApp Number</TableCell>
                    <TableCell align="right">Total Queries</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {behaviorData?.topUsersByActivity?.map((user, index) => (
                    <TableRow key={user.whatsappNumber}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{user.whatsappNumber}</TableCell>
                      <TableCell align="right">{user.totalQueries}</TableCell>
                      <TableCell>{new Date(user.lastActivity).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.totalQueries > 10 ? 'High Activity' : user.totalQueries > 5 ? 'Medium Activity' : 'Low Activity'}
                          size="small"
                          color={user.totalQueries > 10 ? 'success' : user.totalQueries > 5 ? 'warning' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserBehavior;