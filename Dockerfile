FROM node:25.2.1-bookworm-slim

# Install necessary packages and clean up to reduce image size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        dumb-init \
        apt-utils \
        curl && \
    ln -s /usr/bin/curl /usr/local/bin/curl && \
    apt-get clean && \
    rm -rf /var/library/apt/lists/*

# Set workspace for this image
WORKDIR /app

# Install dependencies
COPY --chown=node:node package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy source code
COPY . /app

EXPOSE 3000

# Default to demo environment
ENV NODE_ENV=production

# Entrypoint script handles startup tasks
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "index.js"]
