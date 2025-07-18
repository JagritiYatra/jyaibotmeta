# JY Alumni WhatsApp Bot Admin Dashboard - Quick Guide

## Your System is Ready! 🎉

### Current Status:
- ✅ Backend Server: Running on port 3000
- ✅ MongoDB: Connected with 479 users in database
- ✅ Admin Dashboard: Running on port 3002

### Access the Dashboard:
Open your browser and go to: **http://localhost:3002**

## What You'll See:

### 1. Dashboard Overview
- Total Users: 479
- Verified Users: 0 (email verification not enabled yet)
- Completed Profiles: 11 (2.3%)
- Active Users: 11

### 2. User Management
- View all 479 users
- Search by name, email, or WhatsApp number
- Edit user profiles
- Delete users
- Export to CSV

### 3. Session Management
- View active sessions
- Monitor user engagement
- Track conversation flows

### 4. Analytics
- Search pattern analysis
- User behavior insights
- Top search terms

## Key Features:
1. **No Login Required** - Direct access as requested
2. **Real-time Data** - Connected to your MongoDB database
3. **Professional UI** - Modern design with smooth animations
4. **Responsive** - Works on all screen sizes

## Common Tasks:

### View User Details:
1. Go to Users tab
2. Click on any user row
3. View complete profile, sessions, and conversations

### Edit User Profile:
1. In Users tab, click the edit icon
2. Modify any fields
3. Click Save

### Export Users:
1. In Users tab, click "Export CSV" button
2. Downloads all user data

### Search Users:
1. Use the search box in Users tab
2. Search by name, email, or phone

## MongoDB Connection:
```
URI: mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/
Database: jagriti_yatra_community
Collection: users
```

## API Endpoints:
- Stats: http://localhost:3000/api/admin/stats
- Users: http://localhost:3000/api/admin/users
- Sessions: http://localhost:3000/api/admin/sessions
- Analytics: http://localhost:3000/api/admin/analytics/searches

## Troubleshooting:

### If Dashboard Shows No Data:
1. Check backend is running: `lsof -i :3000`
2. Check MongoDB connection in backend logs
3. Refresh the dashboard page

### If Can't Access Dashboard:
1. Make sure it's running on port 3002
2. Try: http://localhost:3002
3. Check for any firewall issues

## Stop Services:
```bash
# Stop dashboard
lsof -ti:3002 | xargs kill -9

# Stop backend
pkill -f "node.*server.js"
```

## Restart Services:
```bash
# Start backend
node server.js &

# Start dashboard
cd admin-dashboard && PORT=3002 npm start &
```

Enjoy your professional admin dashboard! 🚀