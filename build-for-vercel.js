#!/usr/bin/env node

// Atlas Document Management - Vercel Build Script
// This script builds both frontend and backend for Vercel deployment

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building Atlas Document Management for Vercel...');

try {
  // Step 1: Build the React frontend
  console.log('📦 Building React frontend...');
  execSync('vite build', { stdio: 'inherit', cwd: '.' });
  
  // Step 2: Build the Node.js backend  
  console.log('⚙️ Building Node.js backend...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  // Step 3: Ensure client/dist directory structure is correct
  if (fs.existsSync('client/dist')) {
    console.log('✅ Frontend built successfully in client/dist/');
    
    // List built files
    const files = fs.readdirSync('client/dist');
    console.log('📄 Built files:', files.join(', '));
  } else {
    throw new Error('Frontend build failed - client/dist directory not found');
  }
  
  // Step 4: Verify backend build
  if (fs.existsSync('dist/index.js')) {
    console.log('✅ Backend built successfully in dist/index.js');
  } else {
    throw new Error('Backend build failed - dist/index.js not found');
  }
  
  console.log('🎉 Build completed successfully!');
  console.log('📂 Frontend: client/dist/');
  console.log('📂 Backend: dist/index.js');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}