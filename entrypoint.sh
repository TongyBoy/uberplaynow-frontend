#!/bin/sh
# Script to inject API key into JavaScript at runtime

# Replace placeholder with actual API key from environment
if [ -n "$API_KEY" ]; then
    echo "🔑 Injecting API key into frontend..."
    sed -i "s|{{API_KEY_PLACEHOLDER}}|$API_KEY|g" /usr/share/nginx/html/js/arcade-api.js
    echo "✓ API key injected"
else
    echo "⚠️  Warning: API_KEY not set, using placeholder"
fi

# Start nginx
nginx -g 'daemon off;'

