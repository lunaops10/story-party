FROM node:20-slim AS builder
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy source, config, and stories
COPY tsconfig.json ./
COPY src ./src
COPY stories ./stories

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/stories ./stories

EXPOSE 8080

CMD ["node", "dist/index.js"]
