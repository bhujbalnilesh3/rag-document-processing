# Base Image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Install necessary build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source files
COPY src ./src

# Copy .env file
COPY .env ./

# Expose port (optional, since this is a background worker)
EXPOSE 3000

# Start the worker
CMD ["npm", "start"]
