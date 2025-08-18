# Production Deployment Guide - Local Server

## Quick Setup for Local Production Server

### Step 1: Server Preparation (15 minutes)

**For Ubuntu/Debian Server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install essential tools
sudo apt install git nginx certbot python3-certbot-nginx ufw

# Install PM2 for process management
sudo npm install -g pm2

# Create atlas user
sudo adduser atlas
sudo usermod -aG sudo atlas
```

**For Windows Server:**
```powershell
# Install Node.js from https://nodejs.org (18.x LTS)
# Install PostgreSQL from https://www.postgresql.org
# Install Git from https://git-scm.com

# Open PowerShell as Administrator
npm install -g pm2
npm install -g pm2-windows-service
```

### Step 2: Database Setup (10 minutes)

**PostgreSQL Configuration:**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE atlas_db;
CREATE USER atlas_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE atlas_db TO atlas_user;
\q

# Configure PostgreSQL for connections
sudo nano /etc/postgresql/*/main/postgresql.conf
# Add: listen_addresses = 'localhost'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: local   atlas_db   atlas_user   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 3: Deploy Atlas Application (15 minutes)

```bash
# Switch to atlas user
sudo su - atlas

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git atlas-app
cd atlas-app

# Install dependencies
npm install

# Build the application
npm run build

# Create environment file
nano .env
```

**Environment Configuration (.env):**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://atlas_user:your_secure_password@localhost:5432/atlas_db

# Optional: Add these for enhanced features
SESSION_SECRET=your_very_long_random_string_here
UPLOAD_MAX_SIZE=100000000
LOG_LEVEL=info
```

### Step 4: Setup Process Management (5 minutes)

```bash
# Start Atlas with PM2
pm2 start npm --name "atlas-app" -- start

# Configure PM2 startup
pm2 startup
# Follow the command it provides (run as root)

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs atlas-app
```

### Step 5: Configure Reverse Proxy (10 minutes)

**Nginx Configuration:**
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/atlas
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

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
        
        # File upload size limit
        client_max_body_size 500M;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Setup SSL Certificate (5 minutes)

```bash
# Get free SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 7: Configure Firewall (3 minutes)

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 8: Database Migration (2 minutes)

```bash
# Run database migrations
cd ~/atlas-app
npm run db:push

# Verify database connection
npm run check
```

## Your Atlas App is Now Live!

**Access URL:** `https://your-domain.com` or `http://your-server-ip`

## Management Commands

### Application Management
```bash
# Check app status
pm2 status

# View logs
pm2 logs atlas-app

# Restart app
pm2 restart atlas-app

# Update application
cd ~/atlas-app
git pull
npm install
npm run build
pm2 restart atlas-app
```

### Database Management
```bash
# Backup database
pg_dump -U atlas_user -h localhost atlas_db > atlas_backup_$(date +%Y%m%d).sql

# Restore database
psql -U atlas_user -h localhost atlas_db < atlas_backup_file.sql

# Database status
sudo systemctl status postgresql
```

### System Monitoring
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
ss -tulnp | grep :5000
```

## Production Maintenance

### Daily Tasks
- Monitor system resources (CPU, RAM, disk)
- Check application logs for errors
- Verify backup completion

### Weekly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review application performance
- Check SSL certificate status

### Monthly Tasks
- Update Node.js and npm if needed
- Review and rotate logs
- Test backup restoration
- Security audit

## Troubleshooting

### App Won't Start
```bash
# Check PM2 logs
pm2 logs atlas-app

# Check if port is in use
sudo lsof -i :5000

# Restart everything
pm2 restart atlas-app
sudo systemctl restart nginx
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection manually
psql -U atlas_user -h localhost atlas_db

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Performance Issues
```bash
# Monitor system resources
top
iostat
netstat -i

# Check application performance
pm2 monit

# Optimize database
sudo -u postgres psql atlas_db -c "VACUUM ANALYZE;"
```

## Security Hardening

### System Security
```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Setup fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### Application Security
- Change default database passwords
- Use strong session secrets
- Keep Node.js and dependencies updated
- Regular security audits: `npm audit`

Your Atlas Document Management System is now running in production with enterprise-grade security and reliability!