# ============================================================================
# Mining Protocol - Production Dockerfile (Simplified)
# ============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install bun and dependencies
RUN npm install -g bun && bun install

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# ============================================================================
# Production stage
# ============================================================================

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Prisma CLI v6 (matches the project's @prisma/client version)
# Also install curl for health checks
RUN apk add --no-cache curl && \
    npm install -g prisma@6

# Copy entire app from builder
COPY --from=builder /app ./

# Make start.sh executable
RUN chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
