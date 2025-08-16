# JY Alumni Bot - Project Structure

## Overview
This is a comprehensive alumni network bot with AI-powered profile management and search capabilities.

## Directory Structure

```
/
├── src/                        # Main application source code
│   ├── config/                 # Configuration files
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Express middleware
│   ├── models/                 # Data models
│   ├── routes/                 # API route definitions
│   ├── services/               # Business logic services
│   └── utils/                  # Utility functions
├── admin-dashboard/            # React-based admin dashboard
│   ├── src/                    # React source code
│   ├── public/                 # Static assets
│   └── build/                  # Production build
├── web/                        # Web frontend components
│   ├── public/                 # Static web files
│   ├── data/                   # Geo-location data
│   ├── routes/                 # Web-specific routes
│   └── scripts/                # Frontend utility scripts
├── tools/                      # Development and utility tools
│   ├── scripts/                # Automation scripts
│   ├── verification/           # System verification tools
│   ├── testing/                # Debug and testing utilities
│   └── user-management/        # User creation and management
├── data/                       # Persistent data storage
│   └── sessions/               # User session data
├── logs/                       # Application logs
└── docs/                       # Project documentation
```

## Key Files

- `index.js` - Vercel serverless entry point
- `server.js` - Local development server
- `package.json` - Project dependencies and scripts
- `vercel.json` - Deployment configuration

## Environment Configuration

- `.env` - Development environment variables
- `.env.production` - Production environment variables
- `.env.example` - Environment template

## Getting Started

1. Install dependencies: `npm install`
2. Configure environment: Copy `.env.example` to `.env`
3. Start development: `npm run dev`
4. Access admin dashboard: `cd admin-dashboard && npm start`

## Development Tools

- **Verification**: `tools/verification/` - System health checks
- **Testing**: `tools/testing/` - Debug interfaces and testing tools
- **User Management**: `tools/user-management/` - User creation and management scripts