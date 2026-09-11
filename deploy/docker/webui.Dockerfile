# =============================================================================
# ResolveAgent WebUI - React Frontend Docker Build
# =============================================================================
# React + TypeScript frontend with Vite build, served via Nginx.
# =============================================================================

# ---------------------
# Stage 1: Build
# ---------------------
FROM node:25-alpine AS builder

RUN npm install -g pnpm@10 && pnpm config set registry https://registry.npmmirror.com

WORKDIR /build

# Cache dependencies
COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build application
COPY web/ .
RUN pnpm build

# ---------------------
# Stage 2: Nginx Runtime (non-root, unprivileged)
# ---------------------
FROM nginxinc/nginx-unprivileged:1.29-alpine

LABEL maintainer="AI Guru Global <dev@resolveagent.io>"
LABEL org.opencontainers.image.title="ResolveAgent WebUI"
LABEL org.opencontainers.image.description="ResolveAgent Web Dashboard"
LABEL org.opencontainers.image.source="https://github.com/ai-guru-global/resolve-agent"

# 配置/静态资源替换需要 root（unprivileged 镜像默认 USER 101）；替换完立即降权运行
USER root
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy build output and custom nginx config
COPY --from=builder /build/dist /usr/share/nginx/html
COPY deploy/docker/nginx/default.conf /etc/nginx/conf.d/default.conf
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
