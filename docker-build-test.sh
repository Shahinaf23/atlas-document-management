#!/bin/bash

# Docker build test script for Atlas Document Management
echo "Testing Docker build for Atlas..."

# Stop any running containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null

# Clean Docker system
echo "Cleaning Docker system..."
docker system prune -f

# Test 1: Try the main Dockerfile
echo "=== Test 1: Building with main Dockerfile ==="
docker build -t atlas-test:main . --no-cache --progress=plain

if [ $? -eq 0 ]; then
    echo "✅ Main Dockerfile build successful!"
    docker run --rm -p 5000:5000 -d --name atlas-main-test atlas-test:main
    sleep 5
    if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
        echo "✅ Main Dockerfile container running successfully!"
        docker stop atlas-main-test
    else
        echo "❌ Main Dockerfile container failed health check"
        docker logs atlas-main-test
        docker stop atlas-main-test 2>/dev/null
    fi
else
    echo "❌ Main Dockerfile build failed, trying simple version..."
    
    # Test 2: Try the simple Dockerfile
    echo "=== Test 2: Building with simple Dockerfile ==="
    docker build -f Dockerfile.simple -t atlas-test:simple . --no-cache --progress=plain
    
    if [ $? -eq 0 ]; then
        echo "✅ Simple Dockerfile build successful!"
        echo "Consider using Dockerfile.simple for your deployment"
        
        # Update docker-compose.yml to use simple dockerfile
        sed -i.bak 's/build: \./build:\n      context: .\n      dockerfile: Dockerfile.simple/' docker-compose.yml
        echo "Updated docker-compose.yml to use Dockerfile.simple"
        
    else
        echo "❌ Both Dockerfile builds failed"
        echo "Checking package.json and dependencies..."
        
        # Show package.json scripts
        echo "Build script in package.json:"
        grep -A 1 -B 1 '"build"' package.json
        
        # Check if vite and esbuild are installed
        echo "Checking for build dependencies:"
        npm list vite esbuild --depth=0 2>/dev/null || echo "Build dependencies not found"
        
        echo "Try running: npm install && npm run build locally first"
    fi
fi

# Cleanup
docker rmi atlas-test:main atlas-test:simple 2>/dev/null
echo "Test complete!"