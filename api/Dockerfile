FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./

# Install dependencies (ensure better-sqlite3 is installed)
RUN npm install
RUN npm install better-sqlite3

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
