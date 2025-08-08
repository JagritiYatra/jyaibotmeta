import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  LinearProgress,
  Paper,
  Button,
  Stack,
  Skeleton,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Grow,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Message,
  Speed,
  Memory,
  Storage,
  CloudQueue,
  Refresh,
  Download,
  FilterList,
  Timeline,
  Analytics,
  AutoGraph,
  Insights,
  BubbleChart,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import ApexCharts from 'react-apexcharts';
import { analyticsAPI, systemAPI } from '../services/enhancedApi';
import { useRealtimeMetrics } from '../hooks/useRealtimeData';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  prefix = '',
  suffix = '',
  loading = false,
}) => {
  const theme = useTheme();
  const isPositive = change && change > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
          border: `1px solid ${alpha(color, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(color, 0.2)}, transparent)`,
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {title}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={120} height={40} />
              ) : (
                <Typography variant="h4" component="div" fontWeight="bold">
                  {prefix}
                  {typeof value === 'number' ? (
                    <CountUp end={value} duration={2} separator="," />
                  ) : (
                    value
                  )}
                  {suffix}
                </Typography>
              )}
              {change !== undefined && !loading && (
                <Box display="flex" alignItems="center" mt={1}>
                  {isPositive ? (
                    <TrendingUp sx={{ color: theme.palette.success.main, mr: 0.5, fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ color: theme.palette.error.main, mr: 0.5, fontSize: 16 }} />
                  )}
                  <Typography
                    variant="body2"
                    color={isPositive ? 'success.main' : 'error.main'}
                  >
                    {Math.abs(change)}% from last period
                  </Typography>
                </Box>
              )}
            </Box>
            <Avatar
              sx={{
                bgcolor: alpha(color, 0.1),
                color: color,
                width: 56,
                height: 56,
              }}
            >
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const FuturisticDashboard: React.FC = () => {
  const theme = useTheme();
  const { metrics: realtimeMetrics, isConnected } = useRealtimeMetrics();
  const [timeframe, setTimeframe] = useState('24h');

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-enhanced', timeframe],
    queryFn: async () => {
      const [
        realtime,
        userGrowth,
        engagement,
        geographic,
        messageVolume,
        aiPerformance,
        systemHealth,
      ] = await Promise.all([
        analyticsAPI.getRealtimeMetrics(),
        analyticsAPI.getUserGrowth(timeframe),
        analyticsAPI.getUserEngagement(timeframe),
        analyticsAPI.getGeographicDistribution(),
        analyticsAPI.getMessageVolume(timeframe),
        analyticsAPI.getAIPerformance(),
        analyticsAPI.getSystemHealth(),
      ]);

      return {
        realtime: realtime.data,
        userGrowth: userGrowth.data,
        engagement: engagement.data,
        geographic: geographic.data,
        messageVolume: messageVolume.data,
        aiPerformance: aiPerformance.data,
        systemHealth: systemHealth.data,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // User growth chart configuration
  const userGrowthChart = useMemo(() => ({
    options: {
      chart: {
        type: 'area' as const,
        toolbar: { show: false },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth' as const,
        width: 3,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.2,
        },
      },
      xaxis: {
        categories: dashboardData?.userGrowth?.labels || [],
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      colors: [theme.palette.primary.main, theme.palette.secondary.main],
      theme: { mode: theme.palette.mode },
      grid: {
        borderColor: alpha(theme.palette.divider, 0.1),
      },
    },
    series: [
      {
        name: 'Total Users',
        data: dashboardData?.userGrowth?.totalUsers || [],
      },
      {
        name: 'Active Users',
        data: dashboardData?.userGrowth?.activeUsers || [],
      },
    ],
  }), [dashboardData, theme]);

  // Message volume heatmap
  const messageHeatmap = useMemo(() => ({
    options: {
      chart: {
        type: 'heatmap' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      dataLabels: { enabled: false },
      colors: [theme.palette.primary.main],
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
        categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      theme: { mode: theme.palette.mode },
      grid: { show: false },
    },
    series: dashboardData?.messageVolume?.heatmap || [],
  }), [dashboardData, theme]);

  // AI Performance Radar Chart
  const aiPerformanceRadar = useMemo(() => ({
    data: {
      labels: ['Intent Accuracy', 'Response Time', 'User Satisfaction', 'Search Relevance', 'Context Understanding'],
      datasets: [
        {
          label: 'Current',
          data: dashboardData?.aiPerformance?.current || [0, 0, 0, 0, 0],
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.2),
          pointBackgroundColor: theme.palette.primary.main,
        },
        {
          label: 'Target',
          data: [95, 90, 90, 85, 88],
          borderColor: theme.palette.secondary.main,
          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
          pointBackgroundColor: theme.palette.secondary.main,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { color: theme.palette.text.primary },
        },
      },
      scales: {
        r: {
          grid: { color: alpha(theme.palette.divider, 0.1) },
          pointLabels: { color: theme.palette.text.secondary },
          ticks: { display: false },
          min: 0,
          max: 100,
        },
      },
    },
  }), [dashboardData, theme]);

  // Geographic distribution map
  const geoDistribution = useMemo(() => ({
    options: {
      chart: {
        type: 'treemap' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px' },
      },
      plotOptions: {
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          reverseNegativeShade: true,
          colorScale: {
            ranges: [
              { from: 0, to: 100, color: alpha(theme.palette.info.main, 0.3) },
              { from: 101, to: 500, color: alpha(theme.palette.info.main, 0.5) },
              { from: 501, to: 1000, color: alpha(theme.palette.info.main, 0.7) },
              { from: 1001, to: 5000, color: theme.palette.info.main },
            ],
          },
        },
      },
      theme: { mode: theme.palette.mode },
    },
    series: [
      {
        data: dashboardData?.geographic?.distribution || [],
      },
    ],
  }), [dashboardData, theme]);

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast.success('Dashboard refreshed', { icon: '🔄', duration: 2000 });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Control Center
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={<CloudQueue />}
              label={isConnected ? 'Live' : 'Offline'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              sx={{ animation: isConnected ? 'pulse 2s infinite' : 'none' }}
            />
            <Typography variant="body2" color="textSecondary">
              Real-time data streaming {isConnected ? 'active' : 'inactive'}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {}}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {}}
          >
            Export
          </Button>
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Users"
            value={dashboardData?.realtime?.totalUsers || 0}
            change={12.5}
            icon={<People />}
            color={theme.palette.primary.main}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Sessions"
            value={realtimeMetrics.activeUsers || 0}
            change={8.3}
            icon={<Timeline />}
            color={theme.palette.success.main}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Messages Today"
            value={dashboardData?.realtime?.messagesToday || 0}
            change={-2.1}
            icon={<Message />}
            color={theme.palette.info.main}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="AI Performance"
            value={dashboardData?.aiPerformance?.score || 0}
            suffix="%"
            change={5.7}
            icon={<AutoGraph />}
            color={theme.palette.secondary.main}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Growth & Engagement
              </Typography>
              <Box sx={{ height: 320 }}>
                <ApexCharts
                  options={userGrowthChart.options}
                  series={userGrowthChart.series}
                  type="area"
                  height="100%"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Performance Metrics
              </Typography>
              <Box sx={{ height: 320, position: 'relative' }}>
                <Radar data={aiPerformanceRadar.data} options={aiPerformanceRadar.options} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Activity Heatmap
              </Typography>
              <Box sx={{ height: 320 }}>
                <ApexCharts
                  options={messageHeatmap.options}
                  series={messageHeatmap.series}
                  type="heatmap"
                  height="100%"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geographic Distribution
              </Typography>
              <Box sx={{ height: 320 }}>
                <ApexCharts
                  options={geoDistribution.options}
                  series={geoDistribution.series}
                  type="treemap"
                  height="100%"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      API Latency
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {realtimeMetrics.apiLatency || 0}ms
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((realtimeMetrics.apiLatency || 0) / 10, 100)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      CPU Usage
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {realtimeMetrics.cpuUsage || 0}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={realtimeMetrics.cpuUsage || 0}
                      color={realtimeMetrics.cpuUsage > 80 ? 'error' : 'primary'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Memory Usage
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {realtimeMetrics.memoryUsage || 0}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={realtimeMetrics.memoryUsage || 0}
                      color={realtimeMetrics.memoryUsage > 80 ? 'warning' : 'primary'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      DB Connections
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {realtimeMetrics.dbConnections || 0}/100
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(realtimeMetrics.dbConnections || 0)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FuturisticDashboard;