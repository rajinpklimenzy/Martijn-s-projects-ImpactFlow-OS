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

# Stage 2: Production server (minimal static file server)
FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including tsx for running TypeScript)
RUN npm ci

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy minimal server file
COPY server.ts ./
COPY tsconfig.json ./

# Cloud Run will set PORT env variable
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
