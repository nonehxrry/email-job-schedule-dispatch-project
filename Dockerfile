# Multi-stage Dockerfile for ReachInbox Email Scheduler
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy all source files
COPY backend ./backend
COPY frontend ./frontend

# Generate Prisma Client & Build
RUN cd backend && npx prisma generate
RUN cd frontend && npm run build
RUN cd backend && npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_URL=http://localhost:5000

# Copy built artifacts and production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose HTTP port
EXPOSE 5000

# Push db schema & start server
CMD ["sh", "-c", "cd backend && npx prisma db push && node dist/server.js"]
