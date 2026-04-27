# =============================================================================
# ResolveAgent WebUI - Development Dockerfile (Vite Dev Server)
# =============================================================================
FROM node:25-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
