#!/bin/bash

# Initial deployment script for AI Market Segmentation app
# Run this on your VPS for first-time setup

set -e

echo "=== AI Market Segmentation - Initial Deployment Script ==="
echo "This script will set up your VPS for the first deployment"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}Warning: Running as root. It's recommended to run as a regular user with sudo privileges.${NC}"
   read -p "Continue anyway? (y/n) " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       exit 1
   fi
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update system packages
echo "Updating system packages..."
sudo apt update

# Install Docker if not present
if ! command_exists docker; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        sudo usermod -aG docker $USER
        echo -e "${YELLOW}Added $USER to docker group. You may need to log out and back in.${NC}"
    fi
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    rm get-docker.sh
else
    echo -e "${GREEN}Docker is already installed${NC}"
fi

# Install Docker Compose if not present
if ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    sudo apt install -y docker-compose
else
    echo -e "${GREEN}Docker Compose is already installed${NC}"
fi

# Create application directory
APP_DIR="$HOME/apps/ai-market-seg"
echo "Creating application directory at $APP_DIR..."
mkdir -p "$APP_DIR"

# Create .env.production file if it doesn't exist
if [ ! -f "$APP_DIR/.env.production" ]; then
    echo
    echo -e "${YELLOW}Creating .env.production file...${NC}"
    echo "You need to provide your API keys:"
    
    read -p "Enter your ANTHROPIC_API_KEY: " ANTHROPIC_KEY
    read -p "Enter your SERPER_API_KEY: " SERPER_KEY
    
    cat > "$APP_DIR/.env.production" << EOF
# Production Environment Variables
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
SERPER_API_KEY=$SERPER_KEY

# Application Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF
    
    chmod 600 "$APP_DIR/.env.production"
    echo -e "${GREEN}.env.production created successfully${NC}"
else
    echo -e "${GREEN}.env.production already exists${NC}"
fi

# Set up GitHub SSH key for deployment
echo
echo "=== GitHub Deployment Setup ==="
echo "For automatic deployment from GitHub Actions, you need to:"
echo
echo "1. Generate an SSH key (if you haven't already):"
echo "   ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/github_deploy_key"
echo
echo "2. Add the public key to authorized_keys:"
echo "   cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys"
echo
echo "3. In your GitHub repository settings, add these secrets:"
echo "   - VPS_HOST: $(curl -s ifconfig.me || echo "YOUR_VPS_IP")"
echo "   - VPS_USER: $USER"
echo "   - VPS_SSH_KEY: (contents of ~/.ssh/github_deploy_key)"
echo "   - VPS_PORT: 22 (or your custom SSH port)"
echo

read -p "Have you set up the GitHub secrets? (y/n) " -n 1 -r
echo

# Check firewall
echo
echo "=== Firewall Configuration ==="
if command_exists ufw; then
    echo "Checking UFW firewall status..."
    sudo ufw status
    
    echo
    echo "Opening port 8080 for the application..."
    sudo ufw allow 8080/tcp
    
    # Make sure SSH is allowed
    sudo ufw allow OpenSSH
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        echo "Enabling UFW firewall..."
        echo "y" | sudo ufw enable
    fi
else
    echo -e "${YELLOW}UFW not installed. Make sure port 8080 is open in your firewall.${NC}"
fi

# Create health check endpoint script
echo
echo "Creating health check endpoint..."
cat > "$APP_DIR/create-health-check.js" << 'EOF'
// This script creates a health check API route
const fs = require('fs');
const path = require('path');

const healthCheckContent = `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-market-segmentation'
  });
}
`;

const apiDir = path.join(process.cwd(), 'app', 'api', 'health');
const routeFile = path.join(apiDir, 'route.ts');

if (!fs.existsSync(routeFile)) {
  fs.mkdirSync(apiDir, { recursive: true });
  fs.writeFileSync(routeFile, healthCheckContent);
  console.log('Health check endpoint created at /api/health');
} else {
  console.log('Health check endpoint already exists');
}
EOF

# Final summary
echo
echo "=== Setup Summary ==="
echo -e "${GREEN}✓${NC} Docker installed and running"
echo -e "${GREEN}✓${NC} Docker Compose installed"
echo -e "${GREEN}✓${NC} Application directory created at $APP_DIR"
echo -e "${GREEN}✓${NC} Environment variables configured"
echo -e "${GREEN}✓${NC} Firewall configured (port 8080 open)"
echo

echo "=== Next Steps ==="
echo "1. Push your code to GitHub (including the Docker files)"
echo "2. The GitHub Action will automatically deploy to this VPS"
echo "3. Run the Nginx setup script for password protection:"
echo "   sudo bash scripts/setup-nginx-site.sh"
echo
echo "4. After deployment, access your app at:"
echo "   http://$(curl -s ifconfig.me || echo "YOUR_VPS_IP"):8080"
echo
echo "=== Manual Deployment (if needed) ==="
echo "cd $APP_DIR"
echo "docker-compose up -d"
echo
echo -e "${GREEN}Initial setup complete!${NC}"