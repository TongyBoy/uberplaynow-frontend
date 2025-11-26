# Uber Arcade Frontend - Dockerfile
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all static files to nginx html directory
COPY . /usr/share/nginx/html

# Remove files that shouldn't be in production
RUN rm -f /usr/share/nginx/html/Dockerfile \
    /usr/share/nginx/html/docker-compose.yml \
    /usr/share/nginx/html/*.md \
    /usr/share/nginx/html/*.ps1 \
    /usr/share/nginx/html/*.yml \
    /usr/share/nginx/html/nginx.conf \
    /usr/share/nginx/html/.gitignore

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

