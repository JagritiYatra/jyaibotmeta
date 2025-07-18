// User Detail Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  CircularProgress,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Person,
  Email,
  Phone,
  LinkedIn,
  Instagram,
  Work,
  LocationOn,
  CalendarToday,
  Domain,
  Psychology,
  Chat,
  Timeline,
  Search,
  ArrowBack,
  Edit,
  ContentCopy
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetails, getConversations } from '../services/api';
import { format } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserDetail: React.FC = () => {
  const { whatsappNumber } = useParams<{ whatsappNumber: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (whatsappNumber) {
      fetchUserData();
      fetchConversations();
    }
  }, [whatsappNumber]);

  const fetchUserData = async () => {
    try {
      const data = await getUserDetails(whatsappNumber!);
      setUserData(data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const data = await getConversations(whatsappNumber!, { limit: 50 });
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!userData) {
    return <Typography>User not found</Typography>;
  }

  const { user, session, analytics } = userData;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/users')}>
          <ArrowBack />
        </IconButton>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
          <Person />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h4">
            {user.enhancedProfile?.fullName || user.basicProfile?.name || 'Unknown User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.whatsappNumber}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate(`/users/${whatsappNumber}/edit`)}
        >
          Edit Profile
        </Button>
      </Box>

      {/* Status Chips */}
      <Box display="flex" gap={1} sx={{ mb: 3 }}>
        {user.basicProfile?.emailVerified && (
          <Chip label="Email Verified" color="success" />
        )}
        {user.enhancedProfile?.completed && (
          <Chip label="Profile Complete" color="info" />
        )}
        <Chip 
          label={`${user.completionPercentage || 0}% Complete`} 
          color={user.completionPercentage === 100 ? 'success' : 'warning'} 
        />
        <Chip 
          label={`${analytics?.engagementLevel || 'new_user'}`} 
          color="primary" 
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Profile" />
          <Tab label="Session & Analytics" />
          <Tab label="Conversations" />
          <Tab label="Search History" />
        </Tabs>
      </Paper>

      {/* Profile Tab */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><Email sx={{ mr: 1 }} /> Email</TableCell>
                      <TableCell>
                        {user.basicProfile?.email || '-'}
                        <IconButton size="small" onClick={() => copyToClipboard(user.basicProfile?.email)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Phone sx={{ mr: 1 }} /> Phone</TableCell>
                      <TableCell>{user.enhancedProfile?.phone || user.whatsappNumber}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><LocationOn sx={{ mr: 1 }} /> Location</TableCell>
                      <TableCell>{user.enhancedProfile?.address || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><CalendarToday sx={{ mr: 1 }} /> Date of Birth</TableCell>
                      <TableCell>{user.enhancedProfile?.dateOfBirth || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gender</TableCell>
                      <TableCell>{user.enhancedProfile?.gender || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Professional Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Professional Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><Work sx={{ mr: 1 }} /> Role</TableCell>
                      <TableCell>{user.enhancedProfile?.professionalRole || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Domain sx={{ mr: 1 }} /> Domain</TableCell>
                      <TableCell>{user.enhancedProfile?.domain || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><LinkedIn sx={{ mr: 1 }} /> LinkedIn</TableCell>
                      <TableCell>
                        {user.enhancedProfile?.linkedin ? (
                          <a href={user.enhancedProfile.linkedin} target="_blank" rel="noopener noreferrer">
                            View Profile
                          </a>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Instagram sx={{ mr: 1 }} /> Instagram</TableCell>
                      <TableCell>{user.enhancedProfile?.instagram || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Community Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Community Engagement
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Yatra Impact
                    </Typography>
                    <List dense>
                      {user.enhancedProfile?.yatraImpact?.map((impact: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText primary={impact} />
                        </ListItem>
                      )) || <ListItem><ListItemText primary="Not specified" /></ListItem>}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Community Asks
                    </Typography>
                    <List dense>
                      {user.enhancedProfile?.communityAsks?.map((ask: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText primary={ask} />
                        </ListItem>
                      )) || <ListItem><ListItemText primary="Not specified" /></ListItem>}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Community Gives
                    </Typography>
                    <List dense>
                      {user.enhancedProfile?.communityGives?.map((give: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText primary={give} />
                        </ListItem>
                      )) || <ListItem><ListItemText primary="Not specified" /></ListItem>}
                    </List>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Session & Analytics Tab */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Session ID</TableCell>
                      <TableCell>{session?.sessionId || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Started At</TableCell>
                      <TableCell>
                        {session?.startedAt ? format(new Date(session.startedAt), 'PPp') : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Last Activity</TableCell>
                      <TableCell>
                        {session?.lastActivity ? format(new Date(session.lastActivity), 'PPp') : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Interactions</TableCell>
                      <TableCell>{analytics?.totalInteractions || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Searches</TableCell>
                      <TableCell>{analytics?.totalSearches || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Follow-up Rate</TableCell>
                      <TableCell>{analytics?.followUpRate || '0%'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Interests
                </Typography>
                {analytics?.topInterests ? (
                  Object.entries(analytics.topInterests).map(([category, items]: [string, any]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {items.map((item: any) => (
                          <Chip
                            key={item.item}
                            label={`${item.item} (${item.count})`}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No interest data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Conversations Tab */}
      <TabPanel value={tab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Conversations ({conversations.length})
            </Typography>
            <List>
              {conversations.map((conv, index) => (
                <React.Fragment key={conv.id}>
                  {index > 0 && <Divider />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            User: {conv.userMessage}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(conv.timestamp), 'PPp')}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Bot: {conv.botResponse.substring(0, 200)}...
                          </Typography>
                          <Box display="flex" gap={1} sx={{ mt: 1 }}>
                            <Chip label={`Intent: ${conv.context.intent}`} size="small" />
                            {conv.context.isFollowUp && (
                              <Chip label="Follow-up" size="small" color="info" />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Search History Tab */}
      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Search Patterns
            </Typography>
            {analytics?.searchPatterns?.length > 0 ? (
              <List>
                {analytics.searchPatterns.map((pattern: any, index: number) => (
                  <ListItem key={index}>
                    <Search sx={{ mr: 2 }} />
                    <ListItemText
                      primary={pattern.query}
                      secondary={`${pattern.resultsCount} results • ${format(new Date(pattern.timestamp), 'PPp')}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No search history available
              </Typography>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default UserDetail;