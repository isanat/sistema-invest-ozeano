FROM node:20-alpine

# Install openssl for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set DATABASE_URL for build time (external URL)
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@164.68.126.14:5436/actioncash"

# Switch to PostgreSQL provider and generate Prisma client
RUN node scripts/prisma-provider.js && npx prisma generate

# Build Next.js
RUN npx next build

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start with next start (not standalone)
CMD ["npx", "next", "start"]
