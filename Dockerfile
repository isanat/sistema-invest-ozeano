FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@164.68.126.14:5436/actioncash"
RUN node scripts/prisma-provider.js
RUN npx prisma generate
RUN npm run build
ENV DATABASE_URL="postgres://actioncash:Rlb8TaB3hI6yz4s7egXqgBg5ieDO4jkzHmy209wzMGBGlccD2B3kABy9jtaH4Uen@im5bgzdog99g2xbxnl7rx2x5:5432/actioncash"
ENV JWT_SECRET="a7f3e9b1c4d6f8a2e5b7c9d1f3a5e7b9c2d4f6a8e1b3c5d7f9a2e4b6c8d1f3a5"
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["npm", "run", "start"]
