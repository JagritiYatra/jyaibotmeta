# Admin Dashboard Setup Guide

This guide will help you set up and run the admin dashboard for the JY WhatsApp Bot system.

## Overview

The admin dashboard provides a comprehensive interface for:
- Managing users and their profiles
- Monitoring sessions and conversations
- Analyzing search patterns and user behavior
- Exporting data for reporting

## Prerequisites

- Node.js 14+ installed
- MongoDB running
- Backend server running on port 3000
- Admin token configured

## Quick Start

### 1. Backend Setup

First, ensure your backend has the admin routes enabled:

1. Add to your `.env` file:
```
ADMIN_TOKEN=your-secure-admin-token
```

2. Verify admin routes are loaded in `server.js`

### 2. Frontend Setup

1. Navigate to admin dashboard:
```bash
cd admin-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env`:
```
REACT_APP_API_URL=http://localhost:3000/api/admin
REACT_APP_ADMIN_TOKEN=your-secure-admin-token
```

5. Start the dashboard:
```bash
npm start
```

The dashboard will open at `http://localhost:3001`

## Features Guide

### Dashboard
- View total users, verified users, completed profiles
- Monitor active users and growth metrics
- Visual charts for profile completion and verification status

### User Management
- **Search**: Find users by name, email, or phone number
- **Filter**: Show only completed, incomplete, or verified users
- **Edit**: Modify any user field including arrays (community asks/gives)
- **Delete**: Remove users and their session data
- **Export**: Download all user data as CSV

### Session Monitoring
- View all active sessions
- Track user engagement levels
- Monitor interaction counts and search frequency
- Identify highly engaged users

### Analytics
- Top search terms with frequency
- Search categorization (Technical, Business, Design, etc.)
- Average search length and patterns
- Export analytics data

## Security

### Authentication
- Admin token required for all operations
- Token validated on each API request
- Automatic logout on invalid token

### Best Practices
1. Use a strong, unique admin token
2. Never commit `.env` files to git
3. Rotate admin token periodically
4. Monitor access logs

## Deployment

### Building for Production

1. Build the React app:
```bash
npm run build
```

2. The build files will be in `admin-dashboard/build/`

3. Configure your backend to serve these files:
```javascript
// In server.js
app.use('/admin', express.static('admin-dashboard/build'));
```

### Environment Variables

For production, set these environment variables:
- `REACT_APP_API_URL`: Your production API URL
- `REACT_APP_ADMIN_TOKEN`: Production admin token

## Troubleshooting

### Common Issues

1. **Cannot connect to API**
   - Check backend is running
   - Verify CORS is enabled
   - Check API URL in .env

2. **Authentication fails**
   - Verify admin token matches
   - Clear browser localStorage
   - Check console for errors

3. **Data not loading**
   - Check MongoDB connection
   - Verify user has data
   - Check browser console

### Debug Mode

Enable debug mode in `.env`:
```
REACT_APP_DEBUG=true
```

This will log API calls and responses to console.

## API Reference

All endpoints require `x-admin-token` header.

### Dashboard Stats
```
GET /api/admin/stats
```

### User Management
```
GET    /api/admin/users?page=1&limit=20&search=john&filter=completed
GET    /api/admin/users/:whatsappNumber
PUT    /api/admin/users/:whatsappNumber
DELETE /api/admin/users/:whatsappNumber
```

### Sessions
```
GET /api/admin/sessions
```

### Conversations
```
GET /api/admin/conversations/:whatsappNumber?limit=50&offset=0
```

### Analytics
```
GET /api/admin/analytics/searches
```

## Development

### Adding New Features

1. Create new component in `src/components/`
2. Add route in `App.tsx`
3. Add navigation item in `Layout.tsx`
4. Create API endpoint in backend
5. Update types in `src/types/index.ts`

### Code Structure
```
admin-dashboard/
├── src/
│   ├── components/     # React components
│   ├── services/       # API service
│   ├── types/          # TypeScript types
│   └── App.tsx         # Main app with routing
├── public/             # Static files
└── package.json        # Dependencies
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API logs
3. Contact system administrator