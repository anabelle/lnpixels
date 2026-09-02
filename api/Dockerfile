FROM node:22-alpine

WORKDIR /app

# Toolchain fallback si better-sqlite3 no tiene prebuild para la plataforma
RUN apk add --no-cache python3 make g++

# Lock exacto: npm ci con package-lock (reproducible, sin drift de registry)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Slim: sin devDeps en runtime
RUN npm prune --omit=dev

# Non-root (compose usa user 1000:1000)
EXPOSE 3000

CMD ["node", "dist/server.js"]
