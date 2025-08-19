# Docker Deployment - Atlas Document Management System

## Complete Docker Deployment for Linux VM

### Prerequisites
- Linux VM with SSH access
- Docker and Docker Compose installed
- At least 2GB RAM, 1GB disk space
- Network access on desired port (default: 5000)

### Step 1: Prepare Your Local Files

**Create deployment package:**
```bash
# Create deployment directory
mkdir atlas-docker-deploy
cd atlas-docker-deploy

# Copy your Atlas project files
cp -r /path/to/your/atlas-app/* .
```

### Step 2: Docker Configuration Files

**Dockerfile (optimized for production):**
```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S atlas -u 1001 -G nodejs

# Change ownership
RUN chown -R atlas:nodejs /app

# Switch to non-root user
USER atlas

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  atlas-app:
    build: .
    container_name: atlas-document-management
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - SESSION_SECRET=atlas-production-secret-change-this
    volumes:
      - ./attached_assets:/app/attached_assets:ro
      - ./logs:/app/logs
      - atlas-data:/app/data
    networks:
      - atlas-network
    
  # Optional: Add PostgreSQL database
  atlas-db:
    image: postgres:13-alpine
    container_name: atlas-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=atlas_db
      - POSTGRES_USER=atlas_user
      - POSTGRES_PASSWORD=secure_password_change_this
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - atlas-network
    ports:
      - "5432:5432"

  # Optional: Add Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: atlas-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - atlas-app
    networks:
      - atlas-network

volumes:
  atlas-data:
  postgres-data:

networks:
  atlas-network:
    driver: bridge
```

**.dockerignore:**
```
node_modules
dist
.git
.env
*.log
npm-debug.log*
.DS_Store
README.md
.gitignore
```

### Step 3: Nginx Configuration (Optional)

**nginx.conf:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream atlas-app {
        server atlas-app:5000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        client_max_body_size 100M;

        location / {
            proxy_pass http://atlas-app;
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
}
```

### Step 4: Environment Configuration

**production.env:**
```bash
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-super-secure-session-secret-here
DATABASE_URL=postgresql://atlas_user:secure_password_change_this@atlas-db:5432/atlas_db

# Optional: External database
# DATABASE_URL=postgresql://user:password@external-host:5432/atlas_db

# Security settings
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
```

## Deployment Commands

### Step 5: Transfer Files to VM

```bash
# Copy files to your Linux VM
scp -r atlas-docker-deploy user@your-vm-ip:/home/user/

# Or use rsync for better performance
rsync -avz --progress atlas-docker-deploy/ user@your-vm-ip:/home/user/atlas-app/
```

### Step 6: SSH into VM and Deploy

```bash
# Connect to VM
ssh user@your-vm-ip

# Navigate to app directory
cd atlas-app

# Install Docker (if not installed)
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Logout and login again for docker group to take effect
exit
ssh user@your-vm-ip
cd atlas-app

# Build and start the application
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f atlas-app
```

### Step 7: Access Your Application

Your Atlas app will be available at:
- **Direct access:** `http://your-vm-ip:5000`
- **With Nginx:** `http://your-vm-ip` (port 80)
- **With SSL:** `https://your-domain.com` (if configured)

## Management Commands

### Container Management
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f atlas-app

# Restart services
docker-compose restart

# Update application
docker-compose down
docker-compose up -d --build

# Stop everything
docker-compose down

# Remove everything (including volumes)
docker-compose down -v
```

### Backup Commands
```bash
# Backup database
docker-compose exec atlas-db pg_dump -U atlas_user atlas_db > backup_$(date +%Y%m%d).sql

# Backup application data
docker-compose exec atlas-app tar -czf /tmp/atlas-backup.tar.gz /app/attached_assets
docker cp atlas-document-management:/tmp/atlas-backup.tar.gz ./backup_$(date +%Y%m%d).tar.gz
```

### Monitoring
```bash
# Resource usage
docker stats

# Container health
docker-compose exec atlas-app curl http://localhost:5000/api/health

# System resources
htop
df -h
```

## Security Hardening

### Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 5000
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL Certificate (with Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Optimization

### Resource Limits (docker-compose.yml)
```yaml
services:
  atlas-app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Production Environment Variables
```bash
# Add to production.env
NODE_OPTIONS=--max-old-space-size=1024
LOG_LEVEL=warn
COMPRESSION_ENABLED=true
```

Your Atlas Document Management System will now run in a production Docker environment with:
- All 490+ documents and shop drawings
- Real-time Excel processing
- Professional deployment with health checks
- Automatic restarts and logging
- Database persistence
- SSL-ready configuration
- Scalable architecture

The containerized deployment ensures consistent performance across different Linux distributions and simplifies maintenance and updates.