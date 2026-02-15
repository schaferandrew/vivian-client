FROM node:22.16.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (includes dev dependencies for development)
RUN npm ci

# Expose port
EXPOSE 3000

# Development mode: watch for changes with hot module replacement
CMD ["npm", "run", "dev"]
