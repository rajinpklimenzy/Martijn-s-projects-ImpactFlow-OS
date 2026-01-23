# Stage 1: Build the frontend
FROM node:22 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the Vite app
RUN npm run build

# Stage 2: Production server
FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for tsx and TypeScript compilation)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.ts ./
COPY firebaseAdmin.ts ./
COPY emailService.ts ./
COPY tsconfig.json ./

# Cloud Run will set PORT env variable
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
