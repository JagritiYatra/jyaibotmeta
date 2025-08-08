// Sessions Management Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  LinearProgress,
  Avatar,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility,
  Psychology,
  TrendingUp,
  AccessTime,
  Chat,
  Search
} from '@mui/icons-material';
import { sessionAPI } from '../services/enhancedApi';
import { Session } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    avgInteractions: 0,
    avgSearches: 0
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await sessionAPI.getActiveSessions();
      const sessionsData = response.data || [];
      setSessions(sessionsData);
      calculateStats(sessionsData);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessions: Session[]) => {
    const activeSessions = sessions.filter(s => {
      const lastActivity = new Date(s.lastActivity);
      const hoursSinceActive = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
      return hoursSinceActive < 24;
    }).length;

    const avgInteractions = sessions.reduce((sum, s) => sum + s.totalInteractions, 0) / sessions.length || 0;
    const avgSearches = sessions.reduce((sum, s) => sum + s.totalSearches, 0) / sessions.length || 0;

    setStats({
      totalSessions: sessions.length,
      activeSessions,
      avgInteractions: Math.round(avgInteractions),
      avgSearches: Math.round(avgSearches)
    });
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'highly_engaged': return 'success';
      case 'engaged': return 'info';
      case 'moderate': return 'warning';
      default: return 'default';
    }
  };

  const isActiveSession = (lastActivity: string) => {
    const lastActivityDate = new Date(lastActivity);
    const hoursSinceActive = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceActive < 1; // Active within last hour
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Session Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Sessions
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSessions}
                  </Typography>
                </Box>
                <Psychology fontSize="large" color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active (24h)
                  </Typography>
                  <Typography variant="h4">
                    {stats.activeSessions}
                  </Typography>
                </Box>
                <TrendingUp fontSize="large" color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Interactions
                  </Typography>
                  <Typography variant="h4">
                    {stats.avgInteractions}
                  </Typography>
                </Box>
                <Chat fontSize="large" color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Searches
                  </Typography>
                  <Typography variant="h4">
                    {stats.avgSearches}
                  </Typography>
                </Box>
                <Search fontSize="large" color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sessions Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Session Info</TableCell>
              <TableCell>Activity</TableCell>
              <TableCell>Engagement</TableCell>
              <TableCell>Last Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.sessionId}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {session.userId.slice(-2)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {session.userId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Session: {session.sessionId.slice(0, 8)}...
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Started: {format(new Date(session.startedAt), 'PP')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Duration: {formatDistanceToNow(new Date(session.startedAt))}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={2}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Chat fontSize="small" />
                      <Typography variant="body2">
                        {session.totalInteractions}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Search fontSize="small" />
                      <Typography variant="body2">
                        {session.totalSearches}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.engagementLevel}
                    size="small"
                    color={getEngagementColor(session.engagementLevel) as any}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {isActiveSession(session.lastActivity) && (
                      <Chip
                        icon={<AccessTime />}
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="caption">
                      {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="View User Details">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/users/${session.userId}`)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Sessions;