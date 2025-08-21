# Ubuntu Server Deployment Guide - Atlas Document Management System

## Complete Standalone Ubuntu Server Setup

### System Requirements
- **Ubuntu Server 20.04 LTS or newer**
- **Minimum**: 4GB RAM, 2 CPU cores, 20GB storage
- **Recommended**: 8GB RAM, 4 CPU cores, 50GB SSD
- **Network**: Static IP or DHCP reservation
- **Ports**: 22 (SSH), 5000 (Atlas app), 80/443 (HTTP/HTTPS)

### Step 1: Initial Server Setup (10 minutes)

**Update system and install essentials:**
```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install build tools for Node.js native modules
sudo apt install -y build-essential python3 python3-pip

# Configure timezone (optional)
sudo timedatectl set-timezone America/New_York  # Change as needed
```

**Create dedicated user for Atlas:**
```bash
# Create atlas user
sudo adduser atlas
sudo usermod -aG sudo atlas

# Switch to atlas user
sudo su - atlas
cd ~
```

### Step 2: Install Node.js 18 LTS (5 minutes)

```bash
# Install Node.js 18 LTS using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Install PM2 globally for process management
sudo npm install -g pm2
```

### Step 3: Install and Configure PostgreSQL (10 minutes)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE atlas_documents;
CREATE USER atlas_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE atlas_documents TO atlas_user;
ALTER USER atlas_user CREATEDB;
\q
EOF

# Configure PostgreSQL for local connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf

# Add authentication for atlas_user
echo "local   atlas_documents   atlas_user   md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 4: Deploy Atlas Application (15 minutes)

**Clone repository and setup:**
```bash
# Navigate to home directory
cd /home/atlas

# Clone your Atlas repository
git clone https://github.com/yourusername/atlas-document-management.git
cd atlas-document-management

# Install dependencies
npm install

# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://atlas_user:SecurePassword123!@localhost:5432/atlas_documents
SESSION_SECRET=$(openssl rand -base64 32)

# Security settings
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
EOF

# Set proper permissions
chmod 600 .env
```

**Build and initialize:**
```bash
# Build the application
npm run build

# Initialize database schema
npm run db:push

# Test the application
npm start &
sleep 5
curl http://localhost:5000/api/health
# Should return health status

# Stop test instance
pkill -f "node dist/index.js"
```

### Step 5: Configure PM2 Process Management (5 minutes)

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'atlas-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/atlas/atlas-document-management',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/atlas/logs/atlas-error.log',
    out_file: '/home/atlas/logs/atlas-out.log',
    log_file: '/home/atlas/logs/atlas-combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p /home/atlas/logs

# Start Atlas with PM2
pm2 start ecosystem.config.js

# Configure PM2 to start on boot
pm2 startup
# Follow the command it outputs (run as sudo)

# Save PM2 configuration
pm2 save

# Verify Atlas is running
pm2 status
pm2 logs atlas-app
```

### Step 6: Install and Configure Nginx (10 minutes)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration for Atlas
sudo tee /etc/nginx/sites-available/atlas << EOF
server {
    listen 80;
    server_name $(hostname -I | awk '{print $1}') localhost;

    client_max_body_size 100M;
    client_body_timeout 120s;
    proxy_read_timeout 120s;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Security headers
        proxy_set_header X-Frame-Options DENY;
        proxy_set_header X-Content-Type-Options nosniff;
        proxy_set_header X-XSS-Protection "1; mode=block";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 7: Configure Firewall Security (5 minutes)

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential services
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (for future SSL)

# Enable firewall
sudo ufw --force enable

# Check firewall status
sudo ufw status verbose
```

### Step 8: SSL Certificate Setup (Optional - 10 minutes)

**For domain-based access:**
```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Step 9: System Monitoring Setup (5 minutes)

```bash
# Install htop for system monitoring
sudo apt install -y htop iotop netstat-nat

# Create monitoring script
cat > /home/atlas/monitor.sh << 'EOF'
#!/bin/bash
echo "=== Atlas System Status ==="
echo "Date: $(date)"
echo ""
echo "=== System Resources ==="
free -h
echo ""
df -h /
echo ""
echo "=== PM2 Process Status ==="
pm2 status
echo ""
echo "=== Application Health ==="
curl -s http://localhost:5000/api/health || echo "Health check failed"
echo ""
echo "=== Recent Logs ==="
pm2 logs atlas-app --lines 5 --nostream
EOF

chmod +x /home/atlas/monitor.sh

# Test monitoring script
./monitor.sh
```

### Step 10: Backup Configuration (10 minutes)

```bash
# Create backup directory
sudo mkdir -p /backup/atlas
sudo chown atlas:atlas /backup/atlas

# Create backup script
cat > /home/atlas/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/atlas"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting Atlas backup - $DATE"

# Backup database
sudo -u postgres pg_dump atlas_documents > "$BACKUP_DIR/atlas_db_$DATE.sql"

# Backup application files
tar -czf "$BACKUP_DIR/atlas_app_$DATE.tar.gz" \
    /home/atlas/atlas-document-management \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git

# Backup configuration
cp /etc/nginx/sites-available/atlas "$BACKUP_DIR/nginx_config_$DATE"
cp /home/atlas/atlas-document-management/.env "$BACKUP_DIR/env_config_$DATE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed - $DATE"
EOF

chmod +x /home/atlas/backup.sh

# Test backup
./backup.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /home/atlas/backup.sh >> /home/atlas/logs/backup.log 2>&1") | crontab -
```

## Access Your Atlas Application

**Your Atlas Document Management System is now accessible at:**
- **HTTP**: `http://your-server-ip`
- **Direct**: `http://your-server-ip:5000` (if firewall allows)
- **HTTPS**: `https://your-domain.com` (if SSL configured)

## Management Commands

### Application Management
```bash
# View application status
pm2 status

# View logs
pm2 logs atlas-app
tail -f /home/atlas/logs/atlas-combined.log

# Restart application
pm2 restart atlas-app

# Stop application
pm2 stop atlas-app

# View real-time monitoring
pm2 monit
```

### System Management
```bash
# Check system resources
htop
./monitor.sh

# View Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check database status
sudo systemctl status postgresql
sudo -u postgres psql atlas_documents -c "\dt"
```

### Updates and Maintenance
```bash
# Update Atlas application
cd /home/atlas/atlas-document-management
git pull origin main
npm install
npm run build
pm2 restart atlas-app

# System updates
sudo apt update && sudo apt upgrade -y

# View system logs
sudo journalctl -u nginx
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Performance Tuning
```bash
# Optimize PostgreSQL for Atlas workload
sudo tee -a /etc/postgresql/*/main/postgresql.conf << EOF

# Atlas optimizations
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
EOF

sudo systemctl restart postgresql
```

## Troubleshooting

### Common Issues
```bash
# Application won't start
pm2 logs atlas-app
sudo netstat -tulnp | grep :5000

# Database connection issues
sudo -u postgres psql atlas_documents
systemctl status postgresql

# Nginx issues
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Permission issues
sudo chown -R atlas:atlas /home/atlas/atlas-document-management
chmod 600 /home/atlas/atlas-document-management/.env
```

### Performance Monitoring
```bash
# System resources
htop
iotop
df -h

# Application performance
pm2 monit
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/

# Database performance
sudo -u postgres psql atlas_documents -c "SELECT * FROM pg_stat_activity;"
```

Your Atlas Document Management System is now running on a production Ubuntu server with enterprise-grade security, monitoring, and backup capabilities. The system will automatically handle 490+ documents with real-time Excel processing and analytics dashboards accessible to your entire network.