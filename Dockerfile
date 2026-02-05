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

# Create cache directories and set permissions for non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run \
    && chmod -R 755 /usr/share/nginx/html \
    && mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
       /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
       /var/cache/nginx/scgi_temp \
    && chown -R nginx:nginx /var/cache/nginx

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
