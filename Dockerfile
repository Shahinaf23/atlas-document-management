# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install Python for Excel preprocessing
RUN apk add --no-cache python3 py3-pip python3-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Install Python dependencies
RUN pip3 install pandas openpyxl numpy

# Build the application
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads excel-data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]