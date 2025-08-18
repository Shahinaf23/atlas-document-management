# Deploy Atlas to Oracle Cloud Always Free

## Why Oracle Cloud is Perfect

✅ **Guaranteed permanent** - Oracle's legal commitment  
✅ **2 VM instances FREE forever** (1GB RAM each)  
✅ **Oracle Database FREE forever** (20GB)  
✅ **Always running** - No sleep limitations  
✅ **Full server control** - Install anything  
✅ **Enterprise grade** - Handles your Excel processing perfectly  

## Step-by-Step Setup (30 minutes)

### Step 1: Create Oracle Cloud Account
1. Go to [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Click "Start for free"
3. Fill in details (no credit card required)
4. Verify email and phone
5. Sign in to Oracle Cloud Console

### Step 2: Create VM Instance
1. In Oracle Cloud Console, click **"Create a VM instance"**
2. Choose these settings:
   - **Name**: `atlas-server`
   - **Image**: Ubuntu 22.04
   - **Shape**: VM.Standard.E2.1.Micro (Always Free)
   - **Network**: Create new VCN (default settings)
   - **SSH Keys**: Generate new key pair (download private key)
3. Click **"Create"**

### Step 3: Configure Firewall
1. Go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. Click **"Add Ingress Rules"**:
   - **Source CIDR**: 0.0.0.0/0
   - **Destination Port Range**: 3000,5000
   - **Description**: Atlas app ports
4. **Save**

### Step 4: Connect to Your Server
1. Note your VM's **Public IP Address**
2. Open terminal/command prompt
3. Connect via SSH:
   ```bash
   ssh -i /path/to/private-key ubuntu@YOUR_PUBLIC_IP
   ```

### Step 5: Install Node.js and Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install git
sudo apt install git -y
```

### Step 6: Deploy Your Atlas App
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
npm install

# Build the application
npm run build

# Start with PM2 (keeps running forever)
pm2 start npm --name "atlas-app" -- start
pm2 startup
pm2 save
```

### Step 7: Setup Oracle Database (Free)
1. In Oracle Cloud Console, go to **Database** → **Autonomous Database**
2. Click **"Create Autonomous Database"**
3. Choose:
   - **Always Free**: YES
   - **Database name**: atlasdb
   - **Admin password**: (create secure password)
4. Click **"Create Autonomous Database"**

### Step 8: Connect Database
1. Download **Wallet** from your database page
2. Upload to your VM server
3. Update your app's DATABASE_URL environment variable

### Step 9: Configure Environment
```bash
# Create environment file
nano .env
```

Add these variables:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_oracle_connection_string
```

### Step 10: Access Your App
Your Atlas app will be available at:
`http://YOUR_PUBLIC_IP:5000`

### Step 11: Setup Domain (Optional)
1. Buy domain from any registrar
2. Point A record to your VM's public IP
3. Install nginx for SSL:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Management Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs atlas-app

# Restart app
pm2 restart atlas-app

# Update app
git pull
npm run build
pm2 restart atlas-app
```

## Benefits

✅ **Your own dedicated server** - 1GB RAM, always running  
✅ **Oracle Enterprise Database** - Handles Excel data perfectly  
✅ **No time limits** - Runs forever  
✅ **Full control** - Install anything you need  
✅ **Professional setup** - Production ready  
✅ **Free SSL certificate** - Secure HTTPS  

## Backup Strategy

```bash
# Setup automatic backups
crontab -e
```

Add this line for daily backups:
```
0 2 * * * cd /home/ubuntu/YOUR_REPO && git add . && git commit -m "Auto backup $(date)" && git push
```

Your Atlas Document Management System will run permanently on enterprise-grade infrastructure - completely free!

Ready to deploy? Follow these steps and your app will be live in 30 minutes.