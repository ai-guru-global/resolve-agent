# =============================================================================
# ResolveAgent WebUI - React Frontend Docker Build
# =============================================================================
# React + TypeScript frontend with Vite build, served via Nginx.
# =============================================================================

# ---------------------
# Stage 1: Build
# ---------------------
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /build

# Cache dependencies
COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Build application
COPY web/ .
RUN pnpm build

# ---------------------
# Stage 2: Nginx Runtime
# ---------------------
FROM nginx:1.29-alpine

LABEL maintainer="AI Guru Global <dev@resolveagent.io>"
LABEL org.opencontainers.image.title="ResolveAgent WebUI"
LABEL org.opencontainers.image.description="ResolveAgent Web Dashboard"
LABEL org.opencontainers.image.source="https://github.com/ai-guru-global/resolve-agent"

# Remove default nginx config
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy build output and custom nginx config
COPY --from=builder /build/dist /usr/share/nginx/html
COPY deploy/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
