# JY WhatsApp Bot Admin Dashboard

A comprehensive admin dashboard for managing the JY WhatsApp Bot system.

## Features

### 1. Dashboard Overview
- Total users, verified users, completed profiles
- Profile completion statistics
- Growth metrics (daily/weekly)
- Real-time statistics

### 2. User Management
- View all users with search and filters
- Profile completion tracking
- Edit user profiles
- Delete users
- Export users to CSV
- Detailed user view with:
  - Profile information
  - Session data
  - Conversation history
  - Search analytics

### 3. Session Management
- View active sessions
- Track user engagement
- Monitor interactions and searches
- Session analytics

### 4. Analytics
- Search term analytics
- Top searches visualization
- Search categorization
- User behavior insights

## Setup Instructions

### 1. Install Dependencies
```bash
cd admin-dashboard
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_API_URL=http://localhost:3000/api/admin
REACT_APP_ADMIN_TOKEN=your-secure-admin-token
```

### 3. Update Backend
Add admin token to your backend `.env`:
```
ADMIN_TOKEN=your-secure-admin-token
```

### 4. Run Development Server
```bash
npm start
```

The dashboard will be available at `http://localhost:3001`

### 5. Build for Production
```bash
npm run build
```

The build files will be in the `build` directory.

## Usage

### Login
1. Navigate to `/login`
2. Enter your admin token
3. Click Login

### Navigation
- **Dashboard**: Overview statistics and charts
- **Users**: Manage all users, search, filter, edit
- **Sessions**: View active sessions and engagement
- **Analytics**: Search analytics and insights

### User Management
1. **View Users**: Navigate to Users section
2. **Search**: Use search bar to find users by name, email, or phone
3. **Filter**: Filter by profile status (completed, incomplete, verified)
4. **Edit**: Click edit icon to modify user details
5. **Delete**: Click delete icon (requires confirmation)
6. **Export**: Click "Export CSV" to download all users

### Session Monitoring
1. Navigate to Sessions
2. View active sessions (within 24h)
3. Check engagement levels
4. Click user to view full details

### Analytics
1. Navigate to Analytics
2. View top search terms
3. Analyze search categories
4. Export data for further analysis

## Security

- Admin token required for all API access
- Token stored in localStorage
- Automatic logout on invalid token
- All API requests authenticated

## Tech Stack

- React with TypeScript
- Material-UI for components
- React Router for navigation
- Recharts for data visualization
- Axios for API calls
- date-fns for date formatting

## API Endpoints

All endpoints require `x-admin-token` header.

- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List users (paginated)
- `GET /api/admin/users/:whatsappNumber` - User details
- `PUT /api/admin/users/:whatsappNumber` - Update user
- `DELETE /api/admin/users/:whatsappNumber` - Delete user
- `GET /api/admin/sessions` - List sessions
- `GET /api/admin/conversations/:whatsappNumber` - User conversations
- `GET /api/admin/analytics/searches` - Search analytics

## Troubleshooting

### Cannot connect to API
- Ensure backend is running on correct port
- Check REACT_APP_API_URL in .env
- Verify CORS is enabled on backend

### Authentication fails
- Verify admin token matches backend
- Check token in both .env files
- Clear localStorage and retry

### Build errors
- Delete node_modules and reinstall
- Check TypeScript errors
- Ensure all dependencies installed

## Future Enhancements

1. Real-time updates with WebSocket
2. Advanced filtering and sorting
3. Bulk operations on users
4. Email notifications
5. Audit logs
6. Role-based access control
7. Data export scheduling
8. Custom analytics dashboards