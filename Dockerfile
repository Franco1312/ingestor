# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Install CA certificates and update them
RUN apk add --no-cache ca-certificates && \
    update-ca-certificates

# Create app directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create directory for certificates
RUN mkdir -p /app/certs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
