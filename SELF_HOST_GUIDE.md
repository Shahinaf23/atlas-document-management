# Self-Host Atlas on Your Own Computer

## Why Self-Hosting is Perfect

✅ **100% free forever** - Your own hardware  
✅ **Complete control** - No platform limitations  
✅ **Always available** - Runs on your schedule  
✅ **No data limits** - Store as much as you want  
✅ **Maximum performance** - Dedicated resources  
✅ **Ultimate privacy** - Data never leaves your control  

## Quick Setup (15 minutes)

### Step 1: Install Node.js
**Windows:**
1. Download from [nodejs.org](https://nodejs.org)
2. Run installer (choose LTS version)
3. Open Command Prompt

**Mac:**
1. Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. Run: `brew install node`

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Download Your Atlas App
1. Download your repository as ZIP from GitHub
2. Extract to folder like `C:\atlas-app` or `~/atlas-app`
3. Open terminal in that folder

### Step 3: Install and Run
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm start
```

Your Atlas app is now running at: `http://localhost:5000`

### Step 4: Access from Other Devices (Optional)

**Find your computer's IP address:**

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address"

**Mac/Linux:**
```bash
ifconfig | grep inet
```

**Then access from other devices:**
`http://YOUR_IP_ADDRESS:5000`

### Step 5: Make it Public (Optional)

**Using ngrok (easiest):**
1. Download ngrok from [ngrok.com](https://ngrok.com)
2. Run: `ngrok http 5000`
3. Share the https URL ngrok provides

**Using your router:**
1. Forward port 5000 to your computer's IP
2. Access via your public IP address

## Advanced Setup

### Auto-Start with Computer

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Set to run: `node C:\path\to\atlas-app\dist\index.js`
4. Set to run at startup

**Mac (launchd):**
Create file `~/Library/LaunchAgents/atlas.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>atlas.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>node</string>
        <string>/path/to/atlas-app/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

**Linux (systemd):**
Create `/etc/systemd/system/atlas.service`:
```ini
[Unit]
Description=Atlas Document Management
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/atlas-app
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable: `sudo systemctl enable atlas.service`

### Database Setup

**Option 1: SQLite (Simplest)**
- No installation needed
- File-based database
- Perfect for single-user

**Option 2: PostgreSQL (Recommended)**
```bash
# Install PostgreSQL
# Windows: Download from postgresql.org
# Mac: brew install postgresql
# Linux: sudo apt install postgresql

# Create database
createdb atlas_db
```

### Backup Strategy

**Automatic Git Backup:**
```bash
# In your atlas-app folder
git init
git add .
git commit -m "Initial commit"

# Push to private GitHub repo for backup
git remote add origin https://github.com/yourusername/atlas-backup.git
git push -u origin main
```

**Scheduled Backup Script:**
```bash
#!/bin/bash
cd /path/to/atlas-app
git add .
git commit -m "Auto backup $(date)"
git push
```

## Benefits of Self-Hosting

1. **No monthly costs** - Only electricity
2. **No service shutdowns** - You control everything
3. **Maximum privacy** - Data stays local
4. **Unlimited storage** - Use your hard drive
5. **Custom modifications** - Change anything
6. **Learning experience** - Understand how it works

## Performance Tips

1. **Use SSD storage** - Faster Excel processing
2. **Add more RAM** - Better for large Excel files
3. **Use dedicated computer** - Old laptop works great
4. **Wired internet** - More stable than WiFi
5. **UPS backup** - Prevents data loss from power outages

## Security Considerations

1. **Use strong passwords** - For admin accounts
2. **Enable firewall** - Block unnecessary ports
3. **Keep system updated** - Install security patches
4. **Backup regularly** - Multiple locations
5. **Use HTTPS** - With Let's Encrypt certificates

Your Atlas Document Management System running on your own hardware - completely free, completely yours!

Ready to self-host? Start with Step 1 and you'll be running in 15 minutes.