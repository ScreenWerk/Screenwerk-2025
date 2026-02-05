# Static site - no build needed
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only files needed for build script
COPY scripts/build.js ./scripts/
COPY package.json ./

# Generate build info
RUN node scripts/build.js

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy only required folders and files for player and dashboard
COPY player/ /usr/share/nginx/html/player/
COPY dashboard/ /usr/share/nginx/html/dashboard/
COPY shared/ /usr/share/nginx/html/shared/
COPY public/images/ /usr/share/nginx/html/public/images/
COPY index.html /usr/share/nginx/html/index.html
COPY index.md /usr/share/nginx/html/index.md

# Copy generated build info from builder
COPY --from=builder /app/build-info.js /usr/share/nginx/html/build-info.js

# Configure for non-root nginx user
RUN sed -i 's|/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
