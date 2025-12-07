FROM node:20-alpine
# Force rebuild: 2025-12-07T11:23:00

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production --no-audit --no-fund

# Copy application code
COPY . .

# Verify build does not include legacy files
RUN node scripts/check-legacy.js

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
