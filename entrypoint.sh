#!/bin/sh
# Script to inject API configuration into JavaScript at runtime

# Replace placeholder with actual API key from environment
if [ -n "$API_KEY" ]; then
    echo "🔑 Injecting API key into frontend..."
    sed -i "s|{{API_KEY_PLACEHOLDER}}|$API_KEY|g" /usr/share/nginx/html/js/arcade-api.js
    echo "✓ API key injected"
else
    echo "⚠️  Warning: API_KEY not set, using placeholder"
fi

# Replace placeholder with actual API base URL from environment
if [ -n "$API_BASE_URL" ]; then
    echo "🌐 Injecting API base URL into frontend..."
    sed -i "s|{{API_BASE_URL_PLACEHOLDER}}|$API_BASE_URL|g" /usr/share/nginx/html/js/arcade-api.js
    echo "✓ API base URL injected: $API_BASE_URL"
else
    echo "ℹ️  API_BASE_URL not set, using default (window.location.origin + '/api')"
fi

# Start nginx
nginx -g 'daemon off;'

