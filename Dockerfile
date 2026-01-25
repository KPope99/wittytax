FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci --legacy-peer-deps --omit=dev
RUN npm install -g ts-node typescript

# Generate Prisma client
RUN npx prisma generate

# Copy server files
COPY server ./server/
COPY tsconfig.server.json ./tsconfig.json

# Expose port
EXPOSE 5002

# Start server
CMD ["ts-node", "--transpile-only", "server/index.ts"]
