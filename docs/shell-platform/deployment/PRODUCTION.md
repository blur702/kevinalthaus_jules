# Production Deployment Guide - Shell Platform

## Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04 LTS or RHEL 8+
- **CPU**: Minimum 4 cores, recommended 8 cores
- **RAM**: Minimum 16GB, recommended 32GB
- **Storage**: 100GB SSD minimum
- **Network**: 1Gbps connection
- **Ports**: 80, 443, 22 (SSH)

### Software Requirements
- Docker 24.0+
- Docker Compose 2.23+
- Git 2.34+
- Node.js 18+ (for builds)
- Certbot (for SSL certificates)

## Step 1: Server Preparation

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop net-tools
```

### 1.2 Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 1.3 Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1.4 Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 2: SSL Certificate Setup

### 2.1 Install Certbot
```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2.2 Generate SSL Certificate
```bash
# Replace with your domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 2.3 Setup Auto-renewal
```bash
sudo crontab -e
# Add this line:
0 0 * * * /usr/bin/certbot renew --quiet
```

## Step 3: Application Deployment

### 3.1 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-org/shell-platform.git
cd shell-platform
```

### 3.2 Environment Configuration
```bash
# Copy production environment file
cp .env.production .env

# Edit with secure values
sudo vim .env
```

**Critical Environment Variables to Update:**
```env
# Database
DB_PASSWORD=<generate-secure-password>

# Redis
REDIS_PASSWORD=<generate-secure-password>

# JWT
JWT_SECRET=<generate-256-bit-random-string>
JWT_REFRESH_SECRET=<generate-256-bit-random-string>

# AWS S3 (if using)
S3_ACCESS_KEY=<your-aws-access-key>
S3_SECRET_KEY=<your-aws-secret-key>

# Email
SMTP_PASSWORD=<your-smtp-password>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
NEW_RELIC_LICENSE_KEY=<your-new-relic-key>
```

### 3.3 Update SSL Certificate Paths
```bash
# Edit nginx configuration
sudo vim infrastructure/nginx/conf.d/default.conf

# Update these lines with your cert paths:
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### 3.4 Build and Start Services
```bash
# Build all containers
sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
sudo docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
sudo docker-compose ps
```

## Step 4: Database Initialization

### 4.1 Run Migrations
```bash
sudo docker-compose exec api-gateway npm run db:migrate
```

### 4.2 Create Admin User
```bash
sudo docker-compose exec api-gateway npm run create:admin
```

## Step 5: Health Checks

### 5.1 Service Health
```bash
# Check all services are running
sudo docker-compose ps

# Check service logs
sudo docker-compose logs -f api-gateway
sudo docker-compose logs -f auth-service
sudo docker-compose logs -f nginx
```

### 5.2 API Health Check
```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/api/health
```

### 5.3 Database Connection
```bash
sudo docker-compose exec postgres psql -U shellplatform_prod -d shellplatform_production -c "SELECT 1;"
```

## Step 6: Monitoring Setup

### 6.1 Prometheus Configuration
```bash
# Create prometheus config
sudo vim /opt/shell-platform/monitoring/prometheus.yml
```

### 6.2 Grafana Dashboards
```bash
# Access Grafana at http://yourdomain.com:3000
# Default credentials: admin/admin
# Import dashboards from /monitoring/grafana-dashboards/
```

### 6.3 Log Aggregation
```bash
# Setup ELK stack
sudo docker-compose -f docker-compose.monitoring.yml up -d
```

## Step 7: Backup Configuration

### 7.1 Database Backup Script
```bash
sudo vim /opt/shell-platform/scripts/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="shellplatform_production"

mkdir -p $BACKUP_DIR
docker exec shell-postgres pg_dump -U shellplatform_prod $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 7.2 Schedule Backups
```bash
sudo crontab -e
# Add:
0 2 * * * /opt/shell-platform/scripts/backup.sh
```

## Step 8: Security Hardening

### 8.1 Fail2ban Setup
```bash
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 8.2 Security Headers Test
```bash
# Test security headers
curl -I https://yourdomain.com

# Should see:
# Strict-Transport-Security
# X-Frame-Options
# X-Content-Type-Options
# Content-Security-Policy
```

## Step 9: Performance Optimization

### 9.1 Enable Swap
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 9.2 Kernel Parameters
```bash
sudo vim /etc/sysctl.conf
# Add:
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_slow_start_after_idle = 0
fs.file-max = 2097152
```

### 9.3 Apply Settings
```bash
sudo sysctl -p
```

## Step 10: Post-Deployment Verification

### 10.1 Run E2E Tests
```bash
cd /opt/shell-platform
npm run test:e2e:production
```

### 10.2 Security Scan
```bash
npm run test:security
```

### 10.3 Performance Test
```bash
npm run test:performance
```

## Rollback Procedure

If deployment fails:

```bash
# Stop current deployment
sudo docker-compose down

# Restore previous version
cd /opt/shell-platform
git checkout previous-tag

# Restore database
gunzip < /backups/postgres/last-known-good.sql.gz | docker exec -i shell-postgres psql -U shellplatform_prod

# Restart services
sudo docker-compose up -d
```

## Maintenance Mode

To enable maintenance mode:

```bash
# Enable maintenance mode
sudo docker-compose exec nginx touch /usr/share/nginx/html/maintenance.enable

# Disable maintenance mode
sudo docker-compose exec nginx rm /usr/share/nginx/html/maintenance.enable
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   sudo docker-compose logs [service-name]
   sudo docker-compose exec [service-name] sh
   ```

2. **Database connection errors**
   ```bash
   sudo docker-compose exec postgres psql -U shellplatform_prod
   \l  # List databases
   \dt # List tables
   ```

3. **High memory usage**
   ```bash
   sudo docker stats
   sudo docker system prune -a
   ```

4. **SSL certificate issues**
   ```bash
   sudo certbot renew --force-renewal
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Support Contacts

- **DevOps Team**: devops@shellplatform.com
- **On-call**: See PagerDuty
- **Escalation**: CTO - cto@shellplatform.com

---

**Document Version**: 1.0.0
**Last Updated**: 2025-09-03
**Next Review**: 2025-12-03