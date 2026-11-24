# --- STAGE 1: Build & Obfuscate ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native compilation
RUN apk add --no-cache git python3 make g++

# Copy package configs
COPY package*.json ./

# Install ALL dependencies (including devDependencies like javascript-obfuscator)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Run the build script to create the obfuscated /dist folder
RUN npm run build

# --- STAGE 2: Production Runner (Non-Root) ---
FROM node:20-alpine

WORKDIR /app

# Install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy the obfuscated output from the builder stage
COPY --from=builder /app/dist/ ./

# Prepare writable directories owned by non-root user
RUN mkdir -p /app/data /app/auth_info && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV DASHBOARD_HOST=0.0.0.0

# Expose the dashboard port
EXPOSE 3000

# Start Application using the obfuscated entry point
CMD ["node", "index.js"]
