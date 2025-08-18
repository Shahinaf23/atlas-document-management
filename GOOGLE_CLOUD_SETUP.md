# Deploy Atlas to Google Cloud Run - Free Forever

## Why Google Cloud Run is Perfect

✅ **2 million requests/month FREE** - Effectively unlimited for most apps  
✅ **Always free tier** - Never expires  
✅ **Auto-scaling** - Scales to zero (no idle costs)  
✅ **Full Node.js support** - Perfect for your Atlas backend  
✅ **File uploads supported** - Excel processing works  
✅ **Professional infrastructure** - Google's global network  
✅ **Custom domains** - Your own URL supported  

## 30-Minute Deployment Guide

### Step 1: Setup Google Cloud Account (5 minutes)
1. Go to **[cloud.google.com](https://cloud.google.com)**
2. Click **"Get started for free"**
3. Sign in with Google account
4. **Skip credit card** - Choose "Individual" and country
5. Accept terms and create project

### Step 2: Enable APIs (3 minutes)
1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Cloud Run API**
   - **Cloud Build API**
   - **Container Registry API**
3. Click **"Enable"** for each

### Step 3: Install Google Cloud CLI (5 minutes)

**Windows:**
```cmd
# Download and install from: https://cloud.google.com/sdk/docs/install
# Or use PowerShell:
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

**Mac:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 4: Authenticate and Setup (3 minutes)
```bash
# Login to Google Cloud
gcloud auth login

# Set your project (replace PROJECT_ID with your actual project ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required services
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Step 5: Create Dockerfile for Atlas (2 minutes)
```dockerfile
# Create Dockerfile in your project root
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
```

### Step 6: Update package.json (1 minute)
Ensure your start script uses PORT environment variable:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### Step 7: Update server/index.ts (2 minutes)
```typescript
// Use Cloud Run's PORT environment variable
const port = parseInt(process.env.PORT || '8080', 10);

server.listen(port, "0.0.0.0", async () => {
  console.log(`Server running on port ${port}`);
});
```

### Step 8: Deploy to Cloud Run (5 minutes)
```bash
# Build and deploy in one command
gcloud run deploy atlas-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10

# Follow prompts:
# - Confirm service name: atlas-app
# - Confirm region: us-central1
# - Allow unauthenticated: Y
```

### Step 9: Your App is Live! (1 minute)
Cloud Run provides a URL like:
**`https://atlas-app-[hash]-uc.a.run.app`**

### Step 10: Add Database (Optional - 3 minutes)

**Option 1: Firebase Firestore (Free)**
```bash
# Enable Firestore
gcloud services enable firestore.googleapis.com

# Create Firestore database
gcloud firestore databases create --region=us-central
```

**Option 2: External PostgreSQL**
- Use ElephantSQL (20MB free)
- Use Supabase (500MB free)
- Use Neon (512MB free)

## Environment Variables
```bash
# Set environment variables for your app
gcloud run services update atlas-app \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=your_db_url"
```

## Custom Domain Setup
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service atlas-app \
  --domain yourdomain.com \
  --region us-central1
```

## Cost Breakdown (Free Tier)

**Cloud Run Free Tier:**
- 2 million requests/month
- 400k GB-seconds compute time
- 1GB memory per instance
- Network egress: 1GB/month to Americas/EMEA

**Your Atlas app usage estimate:**
- ~1000 requests/day = 30k/month (well under limit)
- Each request ~0.5 seconds = 15k GB-seconds/month
- **Total cost: $0/month**

## Monitoring and Logs
```bash
# View logs
gcloud run logs tail atlas-app --region us-central1

# View service details
gcloud run services describe atlas-app --region us-central1
```

## Benefits You Get

✅ **Professional hosting** - Google's infrastructure  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **Zero downtime** - No server management needed  
✅ **Global CDN** - Fast worldwide performance  
✅ **HTTPS included** - SSL certificate automatic  
✅ **Monitoring** - Built-in logging and metrics  
✅ **Custom domains** - Professional appearance  

## Troubleshooting

**Build Errors:**
- Check Dockerfile syntax
- Ensure all files are included
- Verify Node.js version compatibility

**Memory Issues:**
- Increase memory: `--memory 2Gi`
- Optimize your Excel processing

**Timeout Issues:**
- Increase timeout: `--timeout 900` (15 minutes max)

Your Atlas Document Management System will run on Google's infrastructure with enterprise-grade reliability - completely free within the generous limits!

Ready to deploy? Start with Step 1 and your app will be live in 30 minutes.