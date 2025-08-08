import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ShowChart,
  PieChart,
  BarChart,
  BubbleChart,
  TrendingUp,
  Psychology,
  LocationOn,
  Group,
  Speed,
  QueryStats,
  Download,
  Share,
  Fullscreen,
  FilterList,
  AccessTime,
  Language,
  School,
  Work,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import ApexCharts from 'react-apexcharts';
// Removed unused Nivo imports to simplify build
import { analyticsAPI } from '../services/enhancedApi';
import CountUp from 'react-countup';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const AdvancedAnalytics: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeframe, setTimeframe] = useState('7d');
  const [metric, setMetric] = useState('engagement');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['advanced-analytics', timeframe, metric],
    queryFn: async () => {
      const [
        userEngagement,
        geographic,
        professional,
        queries,
        retention,
        networkData,
        skillsData,
        growthForecast,
      ] = await Promise.all([
        analyticsAPI.getUserEngagement(timeframe),
        analyticsAPI.getGeographicDistribution(),
        analyticsAPI.getProfessionalDomains(),
        analyticsAPI.getPopularQueries(50),
        analyticsAPI.getUserRetention(),
        analyticsAPI.getNetworkGraph(),
        analyticsAPI.getSkillsDistribution(),
        analyticsAPI.getGrowthForecast(),
      ]);

      return {
        engagement: userEngagement.data,
        geographic: geographic.data,
        professional: professional.data,
        queries: queries.data,
        retention: retention.data,
        network: networkData.data,
        skills: skillsData.data,
        forecast: growthForecast.data,
      };
    },
  });

  // User engagement funnel
  const engagementFunnel = useMemo(() => ({
    options: {
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          borderRadius: 0,
          horizontal: true,
          distributed: true,
          barHeight: '80%',
          isFunnel: true,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opt: any) => {
          return opt.w.globals.labels[opt.dataPointIndex] + ': ' + val;
        },
        dropShadow: { enabled: false },
      },
      xaxis: {
        categories: ['Profile Views', 'Searches', 'Messages', 'Connections', 'Active'],
      },
      legend: { show: false },
      theme: { mode: theme.palette.mode },
      colors: [
        theme.palette.info.main,
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
      ],
    },
    series: [{
      data: analyticsData?.engagement?.funnel || [1000, 800, 600, 400, 200],
    }],
  }), [analyticsData, theme]);

  // User retention cohort analysis
  const retentionCohort = useMemo(() => ({
    options: {
      chart: {
        type: 'heatmap' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px' },
      },
      colors: [theme.palette.success.main],
      xaxis: {
        categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
        categories: analyticsData?.retention?.cohorts || ['Jan 2024', 'Feb 2024', 'Mar 2024'],
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      theme: { mode: theme.palette.mode },
      tooltip: {
        custom: ({ dataPointIndex, seriesIndex }: any) => {
          const value = analyticsData?.retention?.data?.[seriesIndex]?.[dataPointIndex] || 0;
          return `<div class="p-2">${value}% retention</div>`;
        },
      },
    },
    series: analyticsData?.retention?.data || [],
  }), [analyticsData, theme]);

  // Professional domain distribution
  const domainDistribution = useMemo(() => ({
    options: {
      chart: {
        type: 'polarArea' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      labels: analyticsData?.professional?.domains?.map((d: any) => d.name) || [],
      fill: { opacity: 0.8 },
      stroke: {
        width: 1,
        colors: [theme.palette.divider],
      },
      yaxis: {
        show: false,
      },
      legend: {
        position: 'bottom' as const,
        labels: { colors: theme.palette.text.primary },
      },
      theme: { mode: theme.palette.mode },
      plotOptions: {
        polarArea: {
          rings: {
            strokeWidth: 1,
            strokeColor: alpha(theme.palette.divider, 0.2),
          },
          spokes: {
            strokeWidth: 1,
            connectorColors: alpha(theme.palette.divider, 0.2),
          },
        },
      },
    },
    series: analyticsData?.professional?.domains?.map((d: any) => d.value) || [],
  }), [analyticsData, theme]);

  // Skills bubble chart
  const skillsBubble = useMemo(() => ({
    options: {
      chart: {
        type: 'bubble' as const,
        toolbar: { show: false },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: any, opts: any) => {
          return analyticsData?.skills?.data?.[opts.seriesIndex]?.name || '';
        },
      },
      fill: { opacity: 0.8 },
      xaxis: {
        title: { text: 'Demand', style: { color: theme.palette.text.secondary } },
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
        title: { text: 'Supply', style: { color: theme.palette.text.secondary } },
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      theme: { mode: theme.palette.mode },
      colors: [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.info.main,
      ],
    },
    series: analyticsData?.skills?.series || [],
  }), [analyticsData, theme]);

  // Growth forecast
  const growthForecast = useMemo(() => ({
    options: {
      chart: {
        type: 'line' as const,
        toolbar: { show: false },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
        },
      },
      stroke: {
        curve: 'smooth' as const,
        width: [3, 3, 2],
        dashArray: [0, 0, 5],
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: analyticsData?.forecast?.labels || [],
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      yaxis: {
        labels: { style: { colors: theme.palette.text.secondary } },
      },
      legend: {
        position: 'top' as const,
        labels: { colors: theme.palette.text.primary },
      },
      theme: { mode: theme.palette.mode },
      colors: [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
        },
      },
      annotations: {
        xaxis: [
          {
            x: 'Today',
            borderColor: theme.palette.error.main,
            strokeDashArray: 0,
            label: {
              text: 'Current',
              style: {
                color: theme.palette.background.paper,
                background: theme.palette.error.main,
              },
            },
          },
        ],
      },
    },
    series: [
      {
        name: 'Actual Users',
        data: analyticsData?.forecast?.actual || [],
      },
      {
        name: 'Predicted Users',
        data: analyticsData?.forecast?.predicted || [],
      },
      {
        name: 'Confidence Interval',
        data: analyticsData?.forecast?.confidence || [],
      },
    ],
  }), [analyticsData, theme]);

  // Query patterns word cloud (simulated with treemap)
  const queryPatterns = useMemo(() => ({
    options: {
      chart: {
        type: 'treemap' as const,
        toolbar: { show: false },
        background: 'transparent',
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 600,
        },
      },
      plotOptions: {
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          colorScale: {
            ranges: [
              { from: 0, to: 10, color: alpha(theme.palette.info.light, 0.7) },
              { from: 11, to: 50, color: theme.palette.info.main },
              { from: 51, to: 100, color: theme.palette.info.dark },
              { from: 101, to: 500, color: theme.palette.primary.main },
            ],
          },
        },
      },
      theme: { mode: theme.palette.mode },
    },
    series: [{
      data: analyticsData?.queries?.patterns?.map((q: any) => ({
        x: q.query,
        y: q.count,
      })) || [],
    }],
  }), [analyticsData, theme]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Advanced Analytics
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="24h">24 Hours</MenuItem>
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
              <MenuItem value="90d">90 Days</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<Download />} variant="outlined">
            Export Report
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<TrendingUp />} label="Engagement" />
        <Tab icon={<LocationOn />} label="Geographic" />
        <Tab icon={<Work />} label="Professional" />
        <Tab icon={<QueryStats />} label="Search Insights" />
        <Tab icon={<Psychology />} label="AI Performance" />
        <Tab icon={<Speed />} label="Predictions" />
      </Tabs>

      {/* Engagement Analytics */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Engagement Funnel
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ApexCharts
                    options={engagementFunnel.options}
                    series={engagementFunnel.series}
                    type="bar"
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
                  Retention Cohort Analysis
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ApexCharts
                    options={retentionCohort.options}
                    series={retentionCohort.series}
                    type="heatmap"
                    height="100%"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Engagement Metrics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary.main">
                        <CountUp end={analyticsData?.engagement?.dau || 0} duration={2} />
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Daily Active Users
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="secondary.main">
                        <CountUp end={analyticsData?.engagement?.sessionLength || 0} duration={2} />m
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Avg Session Length
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="success.main">
                        <CountUp end={analyticsData?.engagement?.stickiness || 0} duration={2} />%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Stickiness (DAU/MAU)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="warning.main">
                        <CountUp end={analyticsData?.engagement?.churnRate || 0} duration={2} decimals={1} />%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Churn Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Geographic Analytics */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ height: 500 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Global User Distribution
                </Typography>
                <Box sx={{ height: 420 }}>
                  {/* Geographic visualization would go here - using placeholder for now */}
                  <Typography color="textSecondary" align="center" sx={{ mt: 10 }}>
                    Geographic heat map visualization
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Countries
                </Typography>
                <List>
                  {analyticsData?.geographic?.topCountries?.slice(0, 5).map((country: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={country.name}
                        secondary={`${country.users} users (${country.percentage}%)`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Cities
                </Typography>
                <List>
                  {analyticsData?.geographic?.topCities?.slice(0, 5).map((city: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                          <LocationOn />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={city.name}
                        secondary={`${city.users} users - ${city.country}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Professional Analytics */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Professional Domain Distribution
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ApexCharts
                    options={domainDistribution.options}
                    series={domainDistribution.series}
                    type="polarArea"
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
                  Skills Supply vs Demand
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ApexCharts
                    options={skillsBubble.options}
                    series={skillsBubble.series}
                    type="bubble"
                    height="100%"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Search Insights */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Query Patterns
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ApexCharts
                    options={queryPatterns.options}
                    series={queryPatterns.series}
                    type="treemap"
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
                  Top Searches
                </Typography>
                <List dense>
                  {analyticsData?.queries?.top?.slice(0, 10).map((query: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={query.text}
                        secondary={`${query.count} searches`}
                      />
                      <Chip
                        label={`${query.successRate}%`}
                        size="small"
                        color={query.successRate > 70 ? 'success' : 'warning'}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Predictions */}
      <TabPanel value={activeTab} index={5}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Growth Forecast (Next 90 Days)
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ApexCharts
                    options={growthForecast.options}
                    series={growthForecast.series}
                    type="line"
                    height="100%"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default AdvancedAnalytics;