FROM node:20-bookworm-slim

WORKDIR /app

# Install native dependencies and OpenSSL for Prisma and bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Default environment configuration
ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy dependency specifications and Prisma schema first for layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code and scripts
COPY tsconfig.json nest-cli.json ./
COPY src ./src/
COPY scripts ./scripts/

# Build NestJS application
RUN npm run build

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose backend port
EXPOSE 3000

# Execute migrations and launch server
ENTRYPOINT ["./docker-entrypoint.sh"]
