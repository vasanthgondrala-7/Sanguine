#!/bin/bash
set -e

echo "Starting Sanguine AI EC2 Production Deployment..."

# 1. System Packages Update & Installation
sudo apt-get update
sudo apt-get install -y git python3-pip python3-venv nodejs npm nginx

# 2. Process Management (PM2)
sudo npm install -g pm2

# 3. Pull latest codebase
# Assumes this script is running from the application root directory
git pull origin main

# 4. Initialize Python Virtual Environment & Install Dependencies
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install fastapi uvicorn pandas sqlalchemy psycopg2-binary

# 5. Build Production React Frontend
npm install
npm run build

# 6. PM2 Process Initialization (Optional fallback if user wants PM2 over systemd)
# pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "sanguine-backend" || pm2 restart sanguine-backend
# pm2 save
# sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 7. Systemd Service Configuration
echo "Configuring sanguine.service..."
cat <<EOF | sudo tee /etc/systemd/system/sanguine.service
[Unit]
Description=Sanguine AI Command Center FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
EnvironmentFile=$(pwd)/.env.production
ExecStart=$(pwd)/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable sanguine.service
sudo systemctl restart sanguine.service

# 8. Nginx Reverse Proxy Setup
echo "Configuring Nginx..."
cat <<EOF | sudo tee /etc/nginx/sites-available/sanguine
server {
    listen 80;
    server_name _;

    # Serve React Static Build
    location / {
        root $(pwd)/dist;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API Requests to FastAPI Backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/sanguine /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "Deployment completed successfully!"
