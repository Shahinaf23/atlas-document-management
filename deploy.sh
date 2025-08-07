#!/bin/bash

# Atlas Document Management System - Deployment Script
# This script prepares your app for deployment to various cloud platforms

echo "🚀 Preparing Atlas Document Management for Cloud Deployment"
echo "============================================================"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from your project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo ""
echo "✅ Build successful! Your app is ready for deployment."
echo ""
echo "🌐 Available deployment options:"
echo ""
echo "1. Render (Recommended - Free with Database)"
echo "   → Push to GitHub, then create Blueprint with render.yaml"
echo "   → Visit: https://render.com"
echo ""
echo "2. Railway (Free trial, then paid)"
echo "   → Push to GitHub, then connect repository"
echo "   → Visit: https://railway.app"
echo ""
echo "3. Vercel (Frontend-focused)"
echo "   → Run: npx vercel"
echo "   → Visit: https://vercel.com"
echo ""
echo "4. DigitalOcean App Platform ($4/month minimum)"
echo "   → Create app from GitHub repository"
echo "   → Visit: https://cloud.digitalocean.com/apps"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🔑 Don't forget to set these environment variables:"
echo "   - DATABASE_URL (PostgreSQL connection string)"
echo "   - NODE_ENV=production"
echo ""
echo "Happy deploying! 🎉"