// User Management Component

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
  TablePagination,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  Search,
  FilterList,
  Download,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { getUsers, deleteUser, getUserDetails } from '../services/api';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';

const Users: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null
  });

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, search, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        filter: filter === 'all' ? undefined : filter
      });
      setUsers(response.users);
      setTotalUsers(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await deleteUser(deleteDialog.user.whatsappNumber);
      fetchUsers();
      setDeleteDialog({ open: false, user: null });
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return 'success';
    if (percentage >= 70) return 'warning';
    if (percentage >= 40) return 'info';
    return 'error';
  };

  const exportUsers = async () => {
    try {
      const allUsers = await getUsers({ limit: 10000 });
      const csvContent = convertToCSV(allUsers.users);
      downloadCSV(csvContent, 'users-export.csv');
    } catch (error) {
      console.error('Failed to export users:', error);
      alert('Failed to export users');
    }
  };

  const convertToCSV = (users: User[]) => {
    const headers = [
      'WhatsApp Number',
      'Name',
      'Email',
      'Verified',
      'Profile Complete',
      'Completion %',
      'Professional Role',
      'Domain',
      'Location',
      'Last Active',
      'Total Searches'
    ];
    
    const rows = users.map(user => [
      user.whatsappNumber,
      user.enhancedProfile?.fullName || user.basicProfile?.name || '',
      user.basicProfile?.email || '',
      user.basicProfile?.emailVerified ? 'Yes' : 'No',
      user.enhancedProfile?.completed ? 'Yes' : 'No',
      user.completionPercentage || 0,
      user.enhancedProfile?.professionalRole || '',
      user.enhancedProfile?.domain || '',
      user.enhancedProfile?.address || '',
      user.lastActiveFormatted || '',
      user.searchCount || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={exportUsers}
        >
          Export CSV
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                label="Filter"
              >
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="completed">Completed Profiles</MenuItem>
                <MenuItem value="incomplete">Incomplete Profiles</MenuItem>
                <MenuItem value="verified">Verified Users</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Total: {totalUsers} users
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Completion</TableCell>
              <TableCell>Professional Info</TableCell>
              <TableCell>Last Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <Typography variant="subtitle2">
                    {user.enhancedProfile?.fullName || user.basicProfile?.name || 'Unknown'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {user._id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{user.whatsappNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.basicProfile?.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {user.basicProfile?.emailVerified ? (
                      <Chip icon={<CheckCircle />} label="Verified" size="small" color="success" />
                    ) : (
                      <Chip icon={<Cancel />} label="Unverified" size="small" color="error" />
                    )}
                    {user.enhancedProfile?.completed && (
                      <Chip label="Complete" size="small" color="info" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={user.completionPercentage || 0}
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                      color={getCompletionColor(user.completionPercentage || 0) as any}
                    />
                    <Typography variant="caption">
                      {user.completionPercentage || 0}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.enhancedProfile?.professionalRole || '-'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.enhancedProfile?.domain || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {user.lastActiveFormatted || 'Never'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => navigate(`/users/${user.whatsappNumber}`)}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => navigate(`/users/${user.whatsappNumber}/edit`)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, user })}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user {deleteDialog.user?.basicProfile?.name || deleteDialog.user?.whatsappNumber}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;