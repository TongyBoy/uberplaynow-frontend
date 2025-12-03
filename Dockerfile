# Uber Arcade Frontend - Dockerfile
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script and fix line endings
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    sed -i 's/\r$//' /entrypoint.sh

# Copy all static files to nginx html directory
COPY . /usr/share/nginx/html

# Remove files that shouldn't be in production
RUN rm -f /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/docker-compose.yml \
    /usr/share/nginx/html/*.md \
    /usr/share/nginx/html/*.ps1 \
    /usr/share/nginx/html/*.yml \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/entrypoint.sh \
    /usr/share/nginx/html/.gitignore

# Expose port 80
EXPOSE 80

# Use entrypoint script to inject API key at runtime
ENTRYPOINT ["/entrypoint.sh"]

