FROM node:20-slim AS builder
WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm install

# Copy source
COPY server/src ./src
COPY stories ../stories

# Build
RUN npm run build

# Production image
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/stories ./stories

WORKDIR /app/server
EXPOSE 8080

CMD ["node", "dist/index.js"]
