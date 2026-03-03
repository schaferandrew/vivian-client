FROM node:22.16.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (includes dev dependencies for development)
RUN npm ci

# Copy all source files
COPY . .

# Expose port
EXPOSE 3000

# Default to development mode, switch to production build & start if NODE_ENV is production
CMD ["/bin/sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm run build && npm run start; else npm run dev; fi"]
