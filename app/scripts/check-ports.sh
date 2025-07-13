#!/bin/bash

# Port checking script for VPS
# Helps identify available ports and existing services

echo "=== Port and Service Check Script ==="
echo "This script helps identify available ports on your VPS"
echo

# Function to check if a port is in use
check_port() {
    local port=$1
    if ss -tuln | grep -q ":$port "; then
        echo "Port $port: IN USE"
        # Try to identify the service
        local service=$(ss -tulnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'"' -f2 | head -1)
        if [ -n "$service" ]; then
            echo "  Service: $service"
        fi
    else
        echo "Port $port: AVAILABLE"
    fi
}

# Check common web ports
echo "=== Checking Common Web Ports ==="
for port in 80 443 3000 3001 5000 8000 8080 8081 8090 9000; do
    check_port $port
done

echo
echo "=== Nginx Sites ==="
# Check if Nginx is installed
if command -v nginx &> /dev/null; then
    echo "Nginx sites enabled:"
    if [ -d /etc/nginx/sites-enabled ]; then
        ls -la /etc/nginx/sites-enabled/ | grep -v "^total\|^d"
    else
        echo "No sites-enabled directory found"
    fi
    
    echo
    echo "Nginx is listening on:"
    ss -tuln | grep nginx || ss -tuln | grep ":80\|:443" | head -5
else
    echo "Nginx is not installed"
fi

echo
echo "=== Docker Containers ==="
# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "Running Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" 2>/dev/null || echo "Docker is installed but no containers running or permission denied"
else
    echo "Docker is not installed"
fi

echo
echo "=== Firewall Status ==="
# Check UFW status
if command -v ufw &> /dev/null; then
    sudo ufw status numbered 2>/dev/null || echo "UFW is installed but status check failed (need sudo)"
else
    echo "UFW is not installed"
fi

# Check iptables
if command -v iptables &> /dev/null; then
    echo
    echo "Open ports in iptables:"
    sudo iptables -L INPUT -n -v | grep ACCEPT | grep dpt: 2>/dev/null | head -10 || echo "Cannot check iptables (need sudo)"
fi

echo
echo "=== Recommendations ==="
echo "Based on the scan, here are available ports for your app:"
echo

# Suggest ports
suggested_ports=""
for port in 8080 8081 8090 3000 3001 5000 8000 9000; do
    if ! ss -tuln | grep -q ":$port "; then
        suggested_ports="$suggested_ports $port"
    fi
done

if [ -n "$suggested_ports" ]; then
    echo "Available ports:$suggested_ports"
    echo
    echo "Recommended: Use port 8080 (if available) for your AI Market Segmentation app"
else
    echo "All common ports seem to be in use. You may need to:"
    echo "1. Stop unused services"
    echo "2. Use a higher port number (e.g., 9090, 9091)"
    echo "3. Configure your app to use a subdomain with existing Nginx"
fi

echo
echo "=== Next Steps ==="
echo "1. Choose an available port for your app"
echo "2. Update docker-compose.yml if needed (currently set to 8080)"
echo "3. Make sure to open the port in your firewall:"
echo "   sudo ufw allow 8080/tcp"
echo "4. Run the Nginx setup script to configure password protection"