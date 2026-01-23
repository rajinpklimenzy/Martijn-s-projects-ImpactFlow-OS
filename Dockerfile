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

# Install gettext for envsubst (to replace environment variables in nginx config)
RUN apk add --no-cache gettext

# Copy built files to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run sets PORT=8080 automatically
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start nginx with environment variable substitution
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
