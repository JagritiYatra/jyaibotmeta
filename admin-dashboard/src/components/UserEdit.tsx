// User Edit Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Save,
  Cancel,
  ArrowBack,
  Add,
  Delete
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetails, updateUser } from '../services/api';
import { User } from '../types';

const UserEdit: React.FC = () => {
  const { whatsappNumber } = useParams<{ whatsappNumber: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (whatsappNumber) {
      fetchUserData();
    }
  }, [whatsappNumber]);

  const fetchUserData = async () => {
    try {
      const data = await getUserDetails(whatsappNumber!);
      setUser(data.user);
      setFormData({
        basicProfile: data.user.basicProfile || {},
        enhancedProfile: data.user.enhancedProfile || {}
      });
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayAdd = (section: string, field: string, value: string) => {
    if (!value.trim()) return;
    
    const currentArray = formData[section][field] || [];
    handleInputChange(section, field, [...currentArray, value]);
  };

  const handleArrayRemove = (section: string, field: string, index: number) => {
    const currentArray = formData[section][field] || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    handleInputChange(section, field, newArray);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await updateUser(whatsappNumber!, formData);
      setSuccess('User updated successfully');
      setTimeout(() => navigate(`/users/${whatsappNumber}`), 1500);
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Typography>User not found</Typography>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(`/users/${whatsappNumber}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Edit User: {user.enhancedProfile?.fullName || user.basicProfile?.name || 'Unknown'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Cancel />}
          onClick={() => navigate(`/users/${whatsappNumber}`)}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Form */}
      <Grid container spacing={3}>
        {/* Basic Profile */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.basicProfile?.name || ''}
                  onChange={(e) => handleInputChange('basicProfile', 'name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.basicProfile?.email || ''}
                  onChange={(e) => handleInputChange('basicProfile', 'email', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Enhanced Profile */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Enhanced Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.enhancedProfile?.fullName || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'fullName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={formData.enhancedProfile?.gender || ''}
                    onChange={(e) => handleInputChange('enhancedProfile', 'gender', e.target.value)}
                    label="Gender"
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Professional Role"
                  value={formData.enhancedProfile?.professionalRole || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'professionalRole', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  value={formData.enhancedProfile?.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'dateOfBirth', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.enhancedProfile?.country || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'country', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.enhancedProfile?.address || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'address', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.enhancedProfile?.phone || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  value={formData.enhancedProfile?.domain || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'domain', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={formData.enhancedProfile?.linkedin || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'linkedin', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Instagram"
                  value={formData.enhancedProfile?.instagram || ''}
                  onChange={(e) => handleInputChange('enhancedProfile', 'instagram', e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Array Fields */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Community Information
            </Typography>
            
            {/* Yatra Impact */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Yatra Impact
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                {(formData.enhancedProfile?.yatraImpact || []).map((impact: string, index: number) => (
                  <Chip
                    key={index}
                    label={impact}
                    onDelete={() => handleArrayRemove('enhancedProfile', 'yatraImpact', index)}
                  />
                ))}
              </Box>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Add impact..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleArrayAdd('enhancedProfile', 'yatraImpact', (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Community Asks */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Community Asks
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                {(formData.enhancedProfile?.communityAsks || []).map((ask: string, index: number) => (
                  <Chip
                    key={index}
                    label={ask}
                    onDelete={() => handleArrayRemove('enhancedProfile', 'communityAsks', index)}
                  />
                ))}
              </Box>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Add community ask..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleArrayAdd('enhancedProfile', 'communityAsks', (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Community Gives */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Community Gives
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                {(formData.enhancedProfile?.communityGives || []).map((give: string, index: number) => (
                  <Chip
                    key={index}
                    label={give}
                    onDelete={() => handleArrayRemove('enhancedProfile', 'communityGives', index)}
                  />
                ))}
              </Box>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Add community give..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleArrayAdd('enhancedProfile', 'communityGives', (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserEdit;