# Use Debian (glibc) with Node 20 for better compatibility
FROM node:20-bookworm-slim

ENV CI=1 npm_config_ignore_optional=false

WORKDIR /app

# Use corepack to get pnpm reliably
RUN corepack enable

# Copy manifests first for caching
COPY package.docker.json package.json
COPY pnpm-lock.yaml ./

# Install deps inside the image (so binaries like "jest" exist in node_modules/.bin)
# Using Docker-specific package.json that excludes Playwright dependencies
RUN pnpm install --no-frozen-lockfile

# Copy the rest
COPY . .

# Copy Jest config for Docker (exclude Vitest tests)
COPY jest.config.js jest.config.docker.js

# Expose port
EXPOSE 3000

# Run tests via pnpm (matches the install)
CMD ["pnpm", "test:ci"]
