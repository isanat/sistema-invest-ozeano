# ============================================================================
# ActionCash - PLATAFORMA ROI - Production Dockerfile for Coolify
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Increase Node memory for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Override NODE_ENV to ensure devDependencies are installed
ARG NODE_ENV=development
ENV NODE_ENV=development

# Copy ALL source code FIRST
COPY . .

# Remove any stale .next cache
RUN rm -rf .next

# Install ALL dependencies
RUN npm install

# Run prisma provider switch and generate client
RUN node scripts/prisma-provider.js && npx prisma generate

# Build the Next.js application
# IMPORTANT: Use --webpack to avoid Turbopack bugs
# IMPORTANT: Use --experimental-build-mode compile to skip prerendering
# (the global-error page has a useContext bug during static generation)
RUN npx next build --webpack --experimental-build-mode compile

# Verify build output
RUN ls -la .next/ && echo "Build output verified"

# ============================================================================
# Production stage
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chmod +x /app/start.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check - test a simple API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
