# Multi-stage Dockerfile for BiteShare Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY server/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules and code
COPY --from=builder /app/node_modules ./node_modules
COPY server/ ./server
COPY *.html *.css api.js ./

# Non-root security user
USER node

EXPOSE 5000

CMD ["node", "server/server.js"]
