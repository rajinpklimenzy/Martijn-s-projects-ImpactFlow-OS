# Build stage
FROM node:22 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the React app
RUN npm run build

# Verify build output
RUN test -d dist && echo "Build successful" || (echo "Build failed - dist folder not found" && exit 1)

# Production stage - using nginx to serve static files
FROM nginx:alpine

# Copy built files to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
