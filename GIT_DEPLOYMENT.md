# Git-Based Deployment to Linux VM

## Complete Git Deployment Workflow

### Step 1: Prepare Git Repository

**Option A: Push to GitHub (Recommended)**
```bash
# From your local development machine
cd atlas-document-management

# Initialize git (if not already done)
git init
git add .
git commit -m "Atlas Document Management System - Production Ready"

# Add remote repository
git remote add origin https://github.com/yourusername/atlas-document-management.git
git push -u origin main
```

**Option B: Push to GitLab/Bitbucket**
```bash
# Same process, just different remote URL
git remote add origin https://gitlab.com/yourusername/atlas-document-management.git
git push -u origin main
```

### Step 2: Clone to Linux VM

**SSH into your VM and clone:**
```bash
# Connect to your Linux VM
ssh user@your-vm-ip

# Clone the repository
git clone https://github.com/yourusername/atlas-document-management.git
cd atlas-document-management

# Verify files are present
ls -la
```

### Step 3: Install Dependencies on VM

**Install Node.js and Docker:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Logout and login for docker group
exit
ssh user@your-vm-ip
cd atlas-document-management
```

### Step 4: Deploy with Docker

**Using Docker Compose (Recommended):**
```bash
# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f atlas-app
```

**Or Deploy Directly with Node.js:**
```bash
# Install dependencies
npm install

# Create production environment file
cp .env.example .env
nano .env
# Edit: NODE_ENV=production, PORT=5000, etc.

# Build application
npm run build

# Start with PM2 (recommended for production)
sudo npm install -g pm2
pm2 start npm --name "atlas-app" -- start
pm2 startup
pm2 save
```

### Step 5: Configure Environment

**Create production .env file:**
```bash
# Create environment file
nano .env
```

**Add production settings:**
```
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-super-secure-session-secret-here

# Optional: Database (if using PostgreSQL)
DATABASE_URL=postgresql://atlas_user:password@localhost:5432/atlas_db

# Security settings
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
```

### Step 6: Setup Firewall and Network Access

**Configure UFW firewall:**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 5000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**Configure Nginx reverse proxy (optional):**
```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/atlas
```

**Nginx config content:**
```nginx
server {
    listen 80;
    server_name your-domain.com your-vm-ip;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable Nginx site:**
```bash
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Future Updates Workflow

### Easy Git-Based Updates

**Update from Git repository:**
```bash
# SSH into VM
ssh user@your-vm-ip
cd atlas-document-management

# Pull latest changes
git pull origin main

# If using Docker
docker-compose down
docker-compose up -d --build

# If using PM2
npm install  # If package.json changed
npm run build
pm2 restart atlas-app
```

### Automated Deployment Script

**Create update script (update-atlas.sh):**
```bash
#!/bin/bash
echo "Updating Atlas Document Management System..."

# Pull latest code
git pull origin main

# Check if package.json changed
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo "Dependencies changed, reinstalling..."
    npm install
fi

# Rebuild and restart
npm run build

# Restart based on deployment method
if command -v docker-compose &> /dev/null; then
    echo "Restarting Docker containers..."
    docker-compose down
    docker-compose up -d --build
elif command -v pm2 &> /dev/null; then
    echo "Restarting PM2 process..."
    pm2 restart atlas-app
else
    echo "Manual restart required"
fi

echo "Update complete!"
```

**Make script executable:**
```bash
chmod +x update-atlas.sh

# Run updates
./update-atlas.sh
```

## Access Your Deployed Application

**Your Atlas app will be accessible at:**
- **Direct access**: `http://your-vm-ip:5000`
- **Through Nginx**: `http://your-vm-ip` (port 80)
- **With domain**: `http://your-domain.com`

## Monitoring and Maintenance

### Health Checks
```bash
# Check application status
curl http://localhost:5000/api/health

# Check Docker containers
docker-compose ps

# Check PM2 processes
pm2 status

# Check system resources
htop
df -h
```

### Backup Strategy
```bash
# Backup application data
tar -czf atlas-backup-$(date +%Y%m%d).tar.gz attached_assets/

# If using PostgreSQL
docker-compose exec atlas-db pg_dump -U atlas_user atlas_db > atlas-db-backup-$(date +%Y%m%d).sql

# Or with local PostgreSQL
sudo -u postgres pg_dump atlas_db > atlas-db-backup-$(date +%Y%m%d).sql
```

### Log Management
```bash
# View application logs
docker-compose logs -f atlas-app  # Docker
pm2 logs atlas-app               # PM2

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Best Practices

### SSL Certificate (Production)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### System Security
```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Benefits of Git-Based Deployment

✅ **Version control** - Track all changes and rollback if needed  
✅ **Easy updates** - Simple `git pull` to get latest version  
✅ **Team collaboration** - Multiple developers can contribute  
✅ **Backup** - Code is safely stored in Git repository  
✅ **Deployment history** - See exactly what changed when  
✅ **Branch management** - Test features before production  

Your Atlas Document Management System with all 490+ documents and Excel processing will be deployed professionally with easy update capabilities and full version control.