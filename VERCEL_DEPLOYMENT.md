# Vercel Deployment Guide for JyAibot Profile Form

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm i -g vercel
   ```

## Step 1: Prepare for Deployment

1. **Ensure all dependencies are in package.json**:
   ```bash
   npm install --save express mongoose dotenv axios
   ```

2. **Create/Update `.env.example`** with required variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   CSC_API_KEY=your_country_state_city_api_key
   BASE_URL=https://your-app.vercel.app
   ```

## Step 2: Configure Vercel Environment Variables

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Link your project**:
   ```bash
   vercel link
   ```

3. **Set environment variables**:
   ```bash
   # Set MongoDB URI
   vercel env add MONGODB_URI production
   # Paste your MongoDB connection string when prompted

   # Set CSC API Key
   vercel env add CSC_API_KEY production
   # Paste: d1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==

   # Set Base URL (update after first deployment)
   vercel env add BASE_URL production
   # Paste: https://your-project-name.vercel.app
   ```

## Step 3: Deploy to Vercel

1. **Deploy to production**:
   ```bash
   vercel --prod
   ```

2. **Get your deployment URL** from the output

3. **Update BASE_URL**:
   ```bash
   vercel env rm BASE_URL production
   vercel env add BASE_URL production
   # Paste your actual Vercel URL
   ```

4. **Redeploy** to use correct BASE_URL:
   ```bash
   vercel --prod
   ```

## Step 4: Update WhatsApp Bot Configuration

1. **Update your main bot's `.env`**:
   ```
   BASE_URL=https://your-jyaibot.vercel.app
   ```

2. **Update profile form controller** if needed to use correct URL

## Step 5: Test the Deployment

1. **Test profile form directly**:
   - Visit: `https://your-app.vercel.app/profile-setup?token=test123&wa=+919876543210`
   - Should see the profile form

2. **Test through WhatsApp**:
   - Send "hi" to your WhatsApp bot
   - Click the profile form link
   - Verify form loads with pre-filled data

## Monitoring & Logs

1. **View logs**:
   ```bash
   vercel logs
   ```

2. **View in dashboard**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your project
   - View Functions tab for API logs

## Troubleshooting

### Issue: Form not loading
- Check Vercel logs for errors
- Verify all environment variables are set
- Check MongoDB connection

### Issue: API endpoints 404
- Ensure `vercel.json` routes are correct
- Check that index.js exports the Express app

### Issue: Location dropdowns not working
- Verify CSC_API_KEY is set correctly
- Check API rate limits

### Issue: Form submission fails
- Check MongoDB connection
- Verify user exists in database
- Check Vercel function logs

## Custom Domain (Optional)

1. **Add custom domain** in Vercel dashboard:
   - Project Settings → Domains
   - Add your domain
   - Follow DNS instructions

2. **Update BASE_URL** environment variable to use custom domain

## Important Notes

- **Free Tier Limits**: 
  - 100GB bandwidth/month
  - 100 hours function execution/month
  - Sufficient for ~8000 form submissions

- **Security**:
  - Token validation is timestamp-based
  - Consider adding rate limiting for production
  - MongoDB connection uses SSL by default

- **Performance**:
  - Form loads fast from Vercel CDN
  - API calls run as serverless functions
  - Mumbai region (bom1) for lowest latency