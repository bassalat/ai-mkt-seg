#!/bin/bash

# Nginx site setup script for AI Market Segmentation app
# Run this on your VPS to configure Nginx with password protection

set -e

echo "=== AI Market Segmentation - Nginx Setup Script ==="
echo

# Variables
APP_NAME="ai-market-seg"
NGINX_SITE_CONFIG="/etc/nginx/sites-available/$APP_NAME"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"
HTPASSWD_FILE="/etc/nginx/.htpasswd-$APP_NAME"
APP_PORT="8080"
DOCKER_PORT="8080"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run this script with sudo or as root"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Nginx is not installed. Please install it first:"
    echo "sudo apt update && sudo apt install nginx"
    exit 1
fi

# Create password for HTTP Basic Auth
echo "Setting up HTTP Basic Authentication..."
read -p "Enter username for password protection: " AUTH_USER
echo

# Install apache2-utils if not present (for htpasswd command)
if ! command -v htpasswd &> /dev/null; then
    echo "Installing apache2-utils for htpasswd..."
    apt update
    apt install -y apache2-utils
fi

# Create htpasswd file
htpasswd -c "$HTPASSWD_FILE" "$AUTH_USER"
chmod 644 "$HTPASSWD_FILE"

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > "$NGINX_SITE_CONFIG" << EOF
# AI Market Segmentation App - Nginx Configuration
server {
    listen $APP_PORT;
    listen [::]:$APP_PORT;
    server_name _;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Basic authentication
    auth_basic "AI Market Segmentation - Restricted Access";
    auth_basic_user_file $HTPASSWD_FILE;

    # Proxy settings
    location / {
        proxy_pass http://localhost:$DOCKER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # File upload limits (for potential future features)
        client_max_body_size 10M;
    }

    # Health check endpoint (no auth)
    location /api/health {
        auth_basic off;
        proxy_pass http://localhost:$DOCKER_PORT/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        auth_basic off;
    }

    # Logs
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;
}
EOF

# Enable the site
echo "Enabling Nginx site..."
ln -sf "$NGINX_SITE_CONFIG" "$NGINX_SITE_ENABLED"

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx

# Show status
echo
echo "=== Setup Complete ==="
echo "Nginx site configured successfully!"
echo
echo "Details:"
echo "- Site config: $NGINX_SITE_CONFIG"
echo "- Auth file: $HTPASSWD_FILE"
echo "- App URL: http://YOUR_VPS_IP:$APP_PORT"
echo "- Username: $AUTH_USER"
echo
echo "Next steps:"
echo "1. Ensure Docker container is running on port $DOCKER_PORT"
echo "2. Access your app at http://YOUR_VPS_IP:$APP_PORT"
echo "3. Log in with the username and password you just created"
echo
echo "To add more users:"
echo "sudo htpasswd $HTPASSWD_FILE newusername"
echo
echo "To remove this site:"
echo "sudo rm $NGINX_SITE_ENABLED $NGINX_SITE_CONFIG $HTPASSWD_FILE"
echo "sudo systemctl reload nginx"