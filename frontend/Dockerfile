# ══════════════════════════════════════════════════════════
# Frontend Dockerfile — River Station IoT Dashboard
# Multi-stage: node builder → nginx runtime
# ══════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# ── Nginx runtime stage ───────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
