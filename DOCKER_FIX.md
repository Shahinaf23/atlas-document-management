# Docker Build Fix - Atlas Document Management

## Issue: "sh: vite not found" Error

This error occurs when Docker tries to build the application but can't find the `vite` build tool.

## 🚀 **Quick Fix Options**

### **Option 1: Use Simple Dockerfile (Recommended)**

I've created `Dockerfile.simple` that should work immediately:

```bash
# Clean previous attempts
docker-compose down
docker system prune -f

# Build with simple Dockerfile
docker build -f Dockerfile.simple -t atlas-app . --no-cache

# Test the build
docker run --rm -p 5000:5000 atlas-app
```

### **Option 2: Use Development Mode in Docker**

Update your `docker-compose.yml` to use development mode:

```yaml
services:
  atlas-app:
    build:
      context: .
      dockerfile: Dockerfile.simple
    environment:
      - NODE_ENV=development  # This ensures dev dependencies are available
    # ... rest of your config
```

### **Option 3: Run Automated Test**

```bash
# Run the automated Docker build test
./docker-build-test.sh
```

This script will:
- Test both Dockerfile versions
- Automatically switch to the working one
- Update your docker-compose.yml if needed

## 🔧 **Manual Troubleshooting Steps**

### **Step 1: Verify Local Build Works**
```bash
# Test build locally first
npm install
npm run build

# If this fails, the issue is with your build setup, not Docker
```

### **Step 2: Check Dependencies**
```bash
# Ensure build tools are installed
npm list vite esbuild --depth=0

# If missing, install them
npm install --save-dev vite esbuild
```

### **Step 3: Test Docker Build Manually**
```bash
# Build with detailed output
docker build . --no-cache --progress=plain

# Look for the exact error in the build logs
```

## 📝 **Root Cause Analysis**

The error happens because:

1. **Original Dockerfile** installs only production dependencies first
2. **Build step** requires development dependencies (vite, esbuild)
3. **Mismatch** between what's installed and what's needed for building

## ✅ **Recommended Solution**

**Use the simplified Dockerfile.simple:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./
RUN npm install  # Installs ALL dependencies
COPY . .
RUN NODE_ENV=development npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

**Update docker-compose.yml:**

```yaml
services:
  atlas-app:
    build:
      context: .
      dockerfile: Dockerfile.simple
    # ... rest of your configuration
```

## 🚀 **Deploy Commands**

```bash
# Clean start
docker-compose down
docker system prune -f

# Build and run with simple Dockerfile
docker-compose up --build

# Check logs if issues persist
docker-compose logs atlas-app
```

This approach ensures all dependencies are available during the build process and should resolve the "vite not found" error.