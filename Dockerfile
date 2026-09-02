# Multi-stage Dockerfile for ReachInbox Email Scheduler
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache redis make gcc g++ python3

# Copy root and package manifests
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (skipping postinstall scripts for fast, reliable compilation)
RUN npm install --prefix backend --ignore-scripts
RUN npm install --prefix frontend

# Copy all source files
COPY backend ./backend
COPY frontend ./frontend

# Generate Prisma Client & Build
RUN cd backend && npx prisma generate
RUN cd frontend && npm run build
RUN cd backend && npx tsc

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install native Redis server in production image
RUN apk add --no-cache redis

ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_URL=*

# Copy built artifacts and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose HTTP port
EXPOSE 5000

# Start native Redis daemon, sync database, and start Express server
CMD ["sh", "-c", "redis-server --daemonize yes && cd backend && npx prisma db push --accept-data-loss && node dist/server.js"]
