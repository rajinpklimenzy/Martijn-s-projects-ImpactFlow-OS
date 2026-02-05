# Build stage: install deps with legacy-peer-deps and build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files and .npmrc so install uses legacy-peer-deps
COPY package.json package-lock.json .npmrc* ./

# Install with legacy-peer-deps to satisfy react-quill peer dependency
RUN npm install --legacy-peer-deps

COPY . .

# Build the app (output goes to build/)
RUN npm run build

# Production stage: serve static build
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/build ./build

# Install serve to host static files (lightweight)
RUN npm install -g serve

# Cloud Run sets PORT; default 8080
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "serve -s build -l ${PORT}"]
