# Quick Start - Run Atlas App Locally

## 🚀 5-Minute Setup

Your Atlas Document Management System is already running in this Replit environment. Here's how to run it on your local computer:

### Step 1: Download the Code (2 minutes)
```bash
# Option 1: Clone from GitHub (if you have the repository)
git clone https://github.com/YOUR_USERNAME/atlas-document-management.git
cd atlas-document-management

# Option 2: Download as ZIP from Replit
# Click "Download as ZIP" from the Files menu in Replit
# Extract the ZIP file to your desired folder
```

### Step 2: Install Requirements (2 minutes)
```bash
# Install Node.js 18+ from https://nodejs.org
# Then run in your project folder:

npm install
```

### Step 3: Start the App (30 seconds)
```bash
# Development mode (auto-reloads on changes)
npm run dev

# Production mode
npm run build
npm start
```

### Step 4: Access Your App (10 seconds)
Open your browser to: **http://localhost:5000**

✅ **Your Atlas app is now running locally!**

---

## 📁 Required Files

Make sure your local folder contains these files:
```
atlas-app/
├── client/          # Frontend React app
├── server/          # Backend Node.js server
├── shared/          # Shared types and schemas
├── attached_assets/ # Excel files and data
├── package.json     # Dependencies
├── .env.example     # Environment template
└── README.md
```

---

## 🔧 Environment Setup

### Create .env file:
```bash
# Copy the example file
cp .env.example .env

# Edit with your settings
NODE_ENV=development
PORT=5000
```

### Optional - Database Setup:
Your app works with in-memory storage by default. For persistent data:

**Option 1: SQLite (Simple)**
```bash
# No additional setup needed
# Data saved to local file
```

**Option 2: PostgreSQL (Advanced)**
```bash
# Install PostgreSQL locally
# Create database
createdb atlas_db

# Add to .env:
DATABASE_URL=postgresql://username:password@localhost:5432/atlas_db
```

---

## 🎯 What You Get

**✅ Full Document Management System**
- Login page with authentication
- Dashboard with real-time analytics
- Excel file upload and processing
- Document and shop drawing tracking
- Status distribution charts

**✅ All Current Data**
- South Terminal-Jeddah: 111 documents, 1279 shop drawings
- EMCT Cargo-ZIA: 131 documents, 359 shop drawings
- Real-time Excel processing
- CODE4 integration for EMCT

**✅ Production Ready**
- Built-in security
- File upload handling
- Responsive design
- Error handling

---

## 🛠️ Development Commands

```bash
# Start development server (auto-reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Update database schema
npm run db:push

# Check for issues
npm run check

# Install new packages
npm install package-name
```

---

## 📊 System Requirements

**Minimum:**
- Node.js 18+
- 4GB RAM
- 2GB free disk space
- Any modern browser

**Recommended:**
- Node.js 18 LTS
- 8GB RAM
- SSD storage
- Chrome/Firefox/Safari latest

---

## 🔍 Troubleshooting

### App Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
# Change PORT in .env if 5000 is used
```

### Excel Files Not Loading
```bash
# Ensure attached_assets folder exists
# Check file permissions
# Verify Excel files are in correct format
```

### Database Issues
```bash
# Reset database
npm run db:push

# Check database connection
# Verify DATABASE_URL in .env
```

---

## 🌐 Network Access

**Local Network Access:**
Your app runs on `http://localhost:5000` by default.

**Share with Team:**
```bash
# Find your IP address
ipconfig      # Windows
ifconfig      # Mac/Linux

# Access from other devices:
# http://YOUR_IP_ADDRESS:5000
```

**Make it Public:**
- Use ngrok: `npx ngrok http 5000`
- Use CloudFlare Tunnel
- Deploy to cloud (see deployment guides)

---

## 💡 Quick Tips

1. **Keep Excel Files Updated**: Place your latest Excel files in `attached_assets/`
2. **Check Logs**: Watch the console for any errors during startup
3. **Development Mode**: Use `npm run dev` for development with auto-reload
4. **Production Mode**: Use `npm start` for final testing before deployment

Your Atlas Document Management System will work exactly the same locally as it does here in Replit!