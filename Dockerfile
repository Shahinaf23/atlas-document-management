FROM node:18-alpine

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files for dependency installation
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --silent

# Verify build tools are installed
RUN npx vite --version || npm install -g vite@5.4.19
RUN npx esbuild --version || npm install -g esbuild@0.25.0

# Copy application source code
COPY . .

# Set NODE_ENV to development for build process
ENV NODE_ENV=development

# Build the application with verbose output
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Reset NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S atlas -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R atlas:nodejs /app
USER atlas

# Expose port (configurable via environment)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]