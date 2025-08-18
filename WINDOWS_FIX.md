# Windows Setup Fix - Atlas App

## The Issue
Windows Command Prompt doesn't recognize `NODE_ENV=development` syntax. This is a common issue when running Node.js apps on Windows.

## 🚀 Quick Solutions

### Solution 1: Use PowerShell (Recommended)
Open **PowerShell** instead of Command Prompt and run:
```powershell
npm run dev
```

### Solution 2: Use Windows-Specific Commands
```cmd
# Set environment variable first, then run
set NODE_ENV=development && tsx server/index.ts

# Or for production
set NODE_ENV=production && node dist/index.js
```

### Solution 3: Install cross-env (Best Long-term)
```cmd
npm install --save-dev cross-env
```

Then modify your package.json scripts to use cross-env:
```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

### Solution 4: Create .env File (Simplest)
Create a `.env` file in your project root:
```
NODE_ENV=development
PORT=5000
```

Then your scripts don't need to set NODE_ENV at all.

## ✅ Immediate Fix

**Right now, use this command:**
```cmd
# Windows Command Prompt
set NODE_ENV=development && npx tsx server/index.ts

# Or use PowerShell
$env:NODE_ENV="development"; npx tsx server/index.ts
```

## 🔧 Complete Windows Setup

### Step 1: Install Dependencies
```cmd
npm install
```

### Step 2: Create .env File
Create `.env` in your project root:
```
NODE_ENV=development
PORT=5000
```

### Step 3: Run the App
```cmd
# This will now work because .env handles NODE_ENV
npx tsx server/index.ts
```

### Step 4: Access Your App
Open browser to: **http://localhost:5000**

## 💡 Why This Happens

- **Linux/Mac**: `NODE_ENV=development command` syntax works
- **Windows CMD**: Doesn't understand this syntax
- **PowerShell**: Has different syntax for environment variables
- **Solution**: Use cross-env or .env files for cross-platform compatibility

## 🎯 Final Working Commands for Windows

```cmd
# Development
npx tsx server/index.ts

# Production (after building)
npm run build
node dist/index.js
```

Your Atlas Document Management System will now run perfectly on Windows!