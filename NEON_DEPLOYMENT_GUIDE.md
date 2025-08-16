# Atlas Document Management System - Free Deployment Guide
## Neon (PostgreSQL) + Vercel (Hosting)

This guide will help you deploy your Atlas Document Management System completely free using Neon database and Vercel hosting.

## Step 1: Set Up Neon Database (Free PostgreSQL)

1. **Sign up at [Neon](https://neon.tech)**
   - Free tier: 3GB storage, unlimited connections
   - Always running (no sleep mode)
   - No credit card required

2. **Create a new database**
   - Choose your region (closest to your users)
   - Database name: `atlas-documents`
   - Copy the connection string (starts with `postgresql://`)

3. **Set up your database schema**
   ```bash
   # Use the connection string from Neon
   export DATABASE_URL="postgresql://username:password@host/database"
   npm run db:push
   ```

## Step 2: Deploy to Vercel (Free Hosting)

1. **Sign up at [Vercel](https://vercel.com)**
   - Free tier: Unlimited deployments, 100GB bandwidth
   - Always running (no sleep mode)
   - Connect with GitHub

2. **Connect your repository**
   - Import your Atlas project from GitHub
   - Vercel will auto-detect it's a Node.js project

3. **Configure environment variables in Vercel**
   ```
   DATABASE_URL=postgresql://your-neon-connection-string
   NODE_ENV=production
   SESSION_SECRET=your-secure-random-string
   ```

4. **Deploy**
   - Click "Deploy" - Vercel will build and deploy automatically
   - Your app will be live at `https://your-app-name.vercel.app`

## Step 3: Upload Your Excel Files

1. **Access your deployed app**
2. **Go to Admin Upload section**
3. **Upload your Excel files**:
   - Document Submittal Log-RAQ.xlsx
   - Shop Drawing Log-RAQ.xlsx

## Benefits of This Setup

✅ **Completely Free Forever**
- Neon: 3GB database storage (more than enough)
- Vercel: 100GB bandwidth per month
- No credit card required for either service

✅ **Always Running**
- No sleep mode on either platform
- 24/7 availability for your users

✅ **Automatic Deployments**
- Push to GitHub → Auto-deploy to Vercel
- Zero downtime deployments

✅ **Scalable**
- Can handle thousands of users
- Upgrade paths available when needed

## Migration from Render

1. **Export your current data**:
   ```bash
   pg_dump $CURRENT_DATABASE_URL > atlas_backup.sql
   ```

2. **Import to Neon**:
   ```bash
   psql $NEON_DATABASE_URL < atlas_backup.sql
   ```

3. **Update environment variables in Vercel**

4. **Test your deployment**

## Troubleshooting

- **Build errors**: Check the build logs in Vercel dashboard
- **Database connection**: Verify the DATABASE_URL in Vercel settings
- **Excel upload issues**: Ensure the upload directory is writable

## Support

Your Atlas Document Management System will now run completely free with:
- 131 EMCT documents + 359 shop drawings
- 111 Jeddah documents + 1279 shop drawings
- Real-time analytics and status tracking
- All existing functionality preserved