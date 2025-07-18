// Analytics Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
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
  Search,
  TrendingUp,
  QueryStats,
  Tag
} from '@mui/icons-material';
import { getSearchAnalytics } from '../services/api';
import { SearchAnalytics } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899'];

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const data = await getSearchAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  if (!analytics) {
    return <Typography>Failed to load analytics</Typography>;
  }

  // Prepare data for charts
  const topSearchData = analytics.topSearches.slice(0, 10).map(item => ({
    term: item.term.length > 20 ? item.term.substring(0, 20) + '...' : item.term,
    count: item.count
  }));


  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Search Analytics
      </Typography>

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
                    Total Searches
                  </Typography>
                  <Typography variant="h4">
                    {analytics.totalSearches?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <Search fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
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
                    Unique Terms
                  </Typography>
                  <Typography variant="h4">
                    {analytics.totalUniqueSearches}
                  </Typography>
                </Box>
                <Tag fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
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
                    Top Search
                  </Typography>
                  <Typography variant="h6" noWrap>
                    {analytics.topSearches[0]?.term || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {analytics.topSearches[0]?.count || 0} times
                  </Typography>
                </Box>
                <TrendingUp fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                    Categories
                  </Typography>
                  <Typography variant="h4">
                    {analytics.searchCategories?.length || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    search types
                  </Typography>
                </Box>
                <QueryStats fontSize="large" sx={{ color: 'rgba(255,255,255,0.8)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Top Searches Bar Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top 10 Search Terms
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topSearchData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Search Categories */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Search Categories
            </Typography>
            <Box sx={{ mt: 2 }}>
              {analytics.searchCategories?.map((category, index) => (
                <Box key={category.category} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{category.category}</Typography>
                    <Chip 
                      label={category.count} 
                      size="small" 
                      style={{ backgroundColor: COLORS[index % COLORS.length], color: 'white' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Daily Search Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Search Trend (Last 7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Search Terms Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              All Search Terms
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Search Term</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.topSearches.map((search, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{search.term}</TableCell>
                      <TableCell align="right">{search.count}</TableCell>
                      <TableCell>
                        <Chip
                          label={getSearchCategory(search.term)}
                          size="small"
                          color={getCategoryColor(getSearchCategory(search.term)) as any}
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

// Helper functions


function getSearchCategory(term: string): string {
  const lowerTerm = term.toLowerCase();
  
  if (lowerTerm.includes('developer') || lowerTerm.includes('engineer') || lowerTerm.includes('programmer')) {
    return 'Technical';
  }
  if (lowerTerm.includes('marketing') || lowerTerm.includes('sales') || lowerTerm.includes('business')) {
    return 'Business';
  }
  if (lowerTerm.includes('designer') || lowerTerm.includes('ux') || lowerTerm.includes('ui')) {
    return 'Design';
  }
  if (lowerTerm.includes('founder') || lowerTerm.includes('entrepreneur') || lowerTerm.includes('startup')) {
    return 'Entrepreneurship';
  }
  if (lowerTerm.includes('mentor') || lowerTerm.includes('advisor') || lowerTerm.includes('coach')) {
    return 'Mentorship';
  }
  if (lowerTerm.includes('mumbai') || lowerTerm.includes('delhi') || lowerTerm.includes('bangalore')) {
    return 'Location-based';
  }
  
  return 'Other';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Technical': 'primary',
    'Business': 'success',
    'Design': 'secondary',
    'Entrepreneurship': 'warning',
    'Mentorship': 'info',
    'Location-based': 'default',
    'Other': 'default'
  };
  
  return colors[category] || 'default';
}

export default Analytics;