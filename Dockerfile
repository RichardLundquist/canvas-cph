# Stage 1: Build the frontend
FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the frontend
RUN pnpm run build

# Stage 2: Serve with Node.js
FROM node:20-alpine

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server file
COPY backend.js ./

# Expose the port the app runs on
EXPOSE 8000

# Start the server
CMD ["node", "backend.js"]
