#!/bin/bash

# Atlas Document Management System - Ubuntu Quick Deploy Script
# Run this script on a fresh Ubuntu server to deploy Atlas

set -e

echo "=========================================="
echo "Atlas Document Management System"
echo "Ubuntu Server Deployment Script"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Get server IP for configuration
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Detected server IP: $SERVER_IP"
echo ""

# Step 1: Update system
echo "Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip software-properties-common build-essential python3

# Step 2: Install Node.js 18
echo "Step 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Step 3: Install PostgreSQL
echo "Step 3: Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Step 4: Configure PostgreSQL
echo "Step 4: Configuring database..."
DB_PASSWORD=$(openssl rand -base64 12)
sudo -u postgres psql << EOF
CREATE DATABASE atlas_documents;
CREATE USER atlas_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE atlas_documents TO atlas_user;
ALTER USER atlas_user CREATEDB;
\q
EOF

# Configure PostgreSQL for connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
echo "local   atlas_documents   atlas_user   md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql

# Step 5: Clone and setup Atlas
echo "Step 5: Setting up Atlas application..."
cd ~

# Prompt for Git repository URL
echo "Enter your Atlas Git repository URL (e.g., https://github.com/username/atlas-app.git):"
read -r REPO_URL

if [[ -z "$REPO_URL" ]]; then
    echo "Error: Repository URL cannot be empty"
    exit 1
fi

git clone "$REPO_URL" atlas-document-management
cd atlas-document-management

# Install dependencies
npm install

# Create environment file
SESSION_SECRET=$(openssl rand -base64 32)
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://atlas_user:$DB_PASSWORD@localhost:5432/atlas_documents
SESSION_SECRET=$SESSION_SECRET
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
LOG_LEVEL=info
EOF

chmod 600 .env

# Build application
npm run build

# Initialize database
npm run db:push

# Step 6: Configure PM2
echo "Step 6: Configuring PM2..."
mkdir -p ~/logs

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'atlas-app',
    script: 'npm',
    args: 'start',
    cwd: '$HOME/atlas-document-management',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '$HOME/logs/atlas-error.log',
    out_file: '$HOME/logs/atlas-out.log',
    log_file: '$HOME/logs/atlas-combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save

# Configure PM2 startup
PM2_STARTUP_CMD=$(pm2 startup | tail -n 1)
sudo bash -c "$PM2_STARTUP_CMD"

# Step 7: Install and configure Nginx
echo "Step 7: Installing Nginx..."
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/atlas << EOF
server {
    listen 80;
    server_name $SERVER_IP localhost;

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
    }
    
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx

# Step 8: Configure firewall
echo "Step 8: Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Step 9: Create monitoring script
echo "Step 9: Setting up monitoring..."
cat > ~/monitor.sh << 'EOF'
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

chmod +x ~/monitor.sh

# Step 10: Create backup script
echo "Step 10: Setting up backups..."
sudo mkdir -p /backup/atlas
sudo chown $USER:$USER /backup/atlas

cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/atlas"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting Atlas backup - $DATE"

# Backup database
pg_dump -h localhost -U atlas_user atlas_documents > "$BACKUP_DIR/atlas_db_$DATE.sql"

# Backup application files
tar -czf "$BACKUP_DIR/atlas_app_$DATE.tar.gz" \
    ~/atlas-document-management \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed - $DATE"
EOF

chmod +x ~/backup.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup.sh >> $HOME/logs/backup.log 2>&1") | crontab -

# Final verification
echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Atlas Document Management System is now running:"
echo "  - Local access: http://localhost:5000"
echo "  - Network access: http://$SERVER_IP"
echo ""
echo "Management commands:"
echo "  - Check status: pm2 status"
echo "  - View logs: pm2 logs atlas-app"
echo "  - Monitor system: ./monitor.sh"
echo "  - Create backup: ./backup.sh"
echo ""
echo "Database credentials saved in ~/.env file"
echo "PostgreSQL database: atlas_documents"
echo "Database user: atlas_user"
echo ""

# Test application
echo "Testing application..."
sleep 5
if curl -s http://localhost:5000/api/health >/dev/null; then
    echo "✅ Application is responding correctly"
else
    echo "❌ Application may not be responding. Check logs with: pm2 logs atlas-app"
fi

echo ""
echo "🚀 Atlas Document Management System deployment complete!"
echo "Access your application at: http://$SERVER_IP"