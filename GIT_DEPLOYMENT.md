# Git Deployment Guide - Atlas Document Management System

## Pulling Changes to Local Development

### Scenario 1: First Time Setup (Clone Repository)

**If you haven't cloned the repository yet:**

```bash
# Clone the repository to your local machine
git clone https://github.com/yourusername/atlas-document-management.git
cd atlas-document-management

# Install dependencies
npm install

# Create local environment file
cp .env.example .env

# Edit .env with your local settings
nano .env
```

**Example local .env file:**
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/atlas_local
SESSION_SECRET=your-local-secret-key

# Optional: Use in-memory storage for development
USE_MEMORY_STORAGE=true
```

### Scenario 2: Update Existing Local Repository

**If you already have the repository locally:**

```bash
# Navigate to your project directory
cd atlas-document-management

# Check current status
git status

# Pull latest changes from main branch
git pull origin main

# Update dependencies (if package.json changed)
npm install

# Restart your development server
npm run dev
```

### Scenario 3: Handle Merge Conflicts

**If you have local changes that conflict:**

```bash
# Check what files have conflicts
git status

# Option A: Stash your changes temporarily
git stash
git pull origin main
git stash pop  # Reapply your changes

# Option B: Commit your changes first
git add .
git commit -m "My local changes"
git pull origin main

# If conflicts occur, resolve them manually:
# 1. Edit conflicted files
# 2. Remove conflict markers (<<<<<<< ======= >>>>>>>)
# 3. Stage resolved files
git add resolved-file.js
git commit -m "Resolved merge conflicts"
```

### Scenario 4: Reset to Latest Remote Version

**If you want to discard all local changes:**

```bash
# WARNING: This will delete all your local changes
git fetch origin
git reset --hard origin/main

# Clean untracked files
git clean -fd

# Update dependencies
npm install
```

## Development Workflow

### Daily Development Process

```bash
# 1. Start your day by pulling latest changes
git pull origin main

# 2. Create a new branch for your feature
git checkout -b feature/new-dashboard

# 3. Make your changes and test locally
npm run dev

# 4. Stage and commit your changes
git add .
git commit -m "Add new dashboard component"

# 5. Push your branch to remote
git push origin feature/new-dashboard

# 6. Create pull request on GitHub/GitLab
# 7. After review, merge to main branch
```

### Keeping Your Fork Updated

**If you forked the repository:**

```bash
# Add upstream remote (original repository)
git remote add upstream https://github.com/original-owner/atlas-document-management.git

# Fetch latest changes from upstream
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push updated main to your fork
git push origin main
```

## Environment-Specific Configurations

### Local Development Setup

```bash
# After pulling changes, ensure your local environment is configured:

# 1. Check Node.js version
node --version  # Should be 18.x or higher

# 2. Install/update dependencies
npm install

# 3. Set up local database (if using PostgreSQL)
createdb atlas_local
npm run db:push

# 4. Start development server
npm run dev
```

### Production Server Update

**Updating Atlas on your Ubuntu server:**

```bash
# SSH into your server
ssh username@your-server-ip

# Navigate to application directory
cd atlas-document-management

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild application
npm run build

# Update database schema (if needed)
npm run db:push

# Restart application with PM2
pm2 restart atlas-app

# Check application status
pm2 status
pm2 logs atlas-app
```

## Git Commands Reference

### Basic Operations
```bash
# Check repository status
git status

# View commit history
git log --oneline

# See what changed in files
git diff

# View remote repositories
git remote -v

# Check current branch
git branch
```

### Branch Management
```bash
# Create and switch to new branch
git checkout -b new-feature

# Switch between branches
git checkout main
git checkout feature-branch

# List all branches
git branch -a

# Delete local branch
git branch -d feature-branch

# Delete remote branch
git push origin --delete feature-branch
```

### Undo Changes
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo specific file changes
git checkout -- filename.js

# Revert a specific commit
git revert commit-hash
```

## Troubleshooting Common Issues

### Issue 1: Permission Denied
```bash
# If you get permission denied errors:
# Check your SSH key setup
ssh -T git@github.com

# Or use HTTPS instead of SSH
git remote set-url origin https://github.com/username/repo.git
```

### Issue 2: Merge Conflicts
```bash
# When you see conflict markers like:
# <<<<<<< HEAD
# Your changes
# =======
# Incoming changes
# >>>>>>> branch-name

# 1. Edit the file to resolve conflicts
# 2. Remove the conflict markers
# 3. Stage the resolved file
git add resolved-file.js
git commit -m "Resolved merge conflict"
```

### Issue 3: Outdated Dependencies
```bash
# After pulling changes, if app won't start:
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Clear npm cache if needed
npm cache clean --force
```

### Issue 4: Database Schema Changes
```bash
# If database errors occur after pulling:
# Apply schema migrations
npm run db:push

# Or reset database (development only)
npm run db:reset
npm run db:push
```

## Automated Update Script

**Create an update script for easy deployment:**

```bash
# Create update.sh in your project root
cat > update.sh << 'EOF'
#!/bin/bash
echo "Updating Atlas Document Management System..."

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild application
npm run build

# Apply database changes
npm run db:push

# Restart PM2 (if in production)
if command -v pm2 &> /dev/null; then
    pm2 restart atlas-app
    echo "Application restarted with PM2"
else
    echo "Restart your development server with: npm run dev"
fi

echo "Update completed successfully!"
EOF

chmod +x update.sh

# Use the script
./update.sh
```

## Best Practices

### Before Pulling Changes
1. **Commit or stash** your local changes
2. **Check current branch** - ensure you're on the right branch
3. **Backup important work** - especially before major updates

### After Pulling Changes
1. **Review changes** - check what was updated
2. **Update dependencies** - run `npm install`
3. **Test locally** - ensure everything works
4. **Update environment** - check if .env needs updates

### For Production Updates
1. **Test in development** first
2. **Backup database** before updating
3. **Use zero-downtime deployment** strategies
4. **Monitor logs** after deployment

This workflow ensures your local Atlas development environment stays synchronized with the latest changes while maintaining a stable development process.