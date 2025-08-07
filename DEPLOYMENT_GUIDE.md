# Atlas Document Management System - Deployment Guide

## 🚀 Free Cloud Deployment Options

Your Atlas Document Management System can be deployed to several free cloud platforms. Here are the best options:

### 1. **Render** (Recommended) ⭐

**Why Render?**
- Free tier: 100GB bandwidth, 500 build minutes
- Native PostgreSQL support
- Automatic SSL certificates
- Git-based deployment
- Perfect for full-stack Node.js apps

**Steps to deploy:**

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create Render account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Deploy using render.yaml**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy

4. **Environment Variables** (Auto-configured by render.yaml)
   - `NODE_ENV`: production
   - `DATABASE_URL`: Automatically provided by PostgreSQL service
   - `PORT`: 10000 (Render default)

5. **Access your app**
   - URL: `https://atlas-document-management.onrender.com`
   - First deployment takes 5-10 minutes

### 2. **Railway** 💰

**Why Railway?**
- Excellent developer experience
- Built-in PostgreSQL
- Docker support
- Great for databases

**Steps to deploy:**

1. **Create Railway account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "Deploy from GitHub"
   - Select your repository
   - Railway will detect the `railway.toml` config

3. **Add PostgreSQL database**
   - In your project, click "Add Service"
   - Select "PostgreSQL"
   - Connect the DATABASE_URL variable

4. **Environment Variables**
   - `NODE_ENV`: production
   - `DATABASE_URL`: (from PostgreSQL service)

### 3. **Vercel** (Frontend-focused)

**Why Vercel?**
- Excellent for React/Next.js
- Global CDN
- Free SSL

**Note:** Your app uses server-side Excel processing, which might need adjustments for serverless.

**Steps to deploy:**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **External Database Required**
   - Use [Neon](https://neon.tech) (free PostgreSQL)
   - Or [Supabase](https://supabase.com) (free PostgreSQL)

### 4. **DigitalOcean App Platform** ($4/month minimum)

**Why DigitalOcean?**
- More control
- Better for production
- Managed databases

## 🔧 Pre-Deployment Checklist

✅ **Files Created:**
- `render.yaml` - Render deployment config
- `vercel.json` - Vercel deployment config  
- `railway.toml` - Railway deployment config
- `Dockerfile` - Docker container config

✅ **Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`
- `PORT` - Server port (varies by platform)

✅ **Database Setup:**
- PostgreSQL database required
- Tables auto-created via Drizzle migrations
- Session storage configured

## 📊 Platform Comparison

| Platform | Cost | Database | Ease | Best For |
|----------|------|----------|------|----------|
| **Render** | Free | ✅ Included | ⭐⭐⭐ | Full-stack apps |
| **Railway** | Trial/$5+ | ✅ Included | ⭐⭐⭐ | Developer experience |
| **Vercel** | Free | ❌ External needed | ⭐⭐ | Frontend + serverless |
| **DigitalOcean** | $4+ | ✅ Available | ⭐⭐ | Production apps |

## 🎯 Recommended Deployment Flow

1. **Start with Render** (completely free)
2. **If you need more performance** → upgrade to Railway ($5/month)
3. **For production use** → consider DigitalOcean ($4/month)

## 📁 File Upload Considerations

Your app handles Excel file uploads. On free platforms:
- **Render**: Files stored temporarily (24h retention)
- **Railway**: Persistent disk volumes available
- **Vercel**: Consider serverless file handling

For persistent file storage, consider:
- **AWS S3** (free tier)
- **Cloudinary** (free tier)
- **Upload directly to database** (for small files)

## 🔐 Security Notes

- All platforms provide HTTPS automatically
- Environment variables are encrypted
- Database connections are secured
- Consider adding rate limiting for production

## 🚨 Common Issues & Solutions

**Build fails on Render:**
- Check build logs in Render dashboard
- Ensure all dependencies in package.json

**Database connection fails:**
- Verify DATABASE_URL format
- Check if database service is running
- Run `npm run db:push` to create tables

**Excel processing fails:**
- Python dependencies might not install
- Consider switching to pure JavaScript libraries
- Upload smaller test files first

**App sleeps on free tiers:**
- Free services "sleep" after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to paid plans for always-on service

## 📞 Support

- **Render**: [docs.render.com](https://docs.render.com)
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

Choose Render for the easiest free deployment with database included!