# --- STAGE 1: Build & Obfuscate ---
FROM node:18-alpine AS builder

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

# --- STAGE 2: Production Runner ---
FROM node:18-alpine

WORKDIR /app

# Install ONLY production dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy the obfuscated output from the builder stage
# We copy the contents of the dist folder to the root of our app
COPY --from=builder /app/dist/ ./

# Expose the dashboard port
EXPOSE 3000

# Start Application using the obfuscated entry point
CMD ["node", "index.js"]
