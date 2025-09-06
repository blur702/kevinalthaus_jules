# Shell Platform - Secure Configuration Files

## ⚠️ SECURITY NOTICE

This directory contains sensitive configuration files and secrets that must NEVER be exposed to the web or committed to version control.

## Directory Structure

```
/var/www/secrets/
├── shell-platform.env.production    # Production environment variables
├── shell-platform.env.example       # Template for environment setup  
├── ssl/                             # SSL certificates and keys
├── api-keys/                        # Third-party API keys
├── database/                        # Database credentials
└── backup-keys/                     # Encryption keys for backups
```

## Security Requirements

1. **Access Control**
   - Directory permissions: 700 (owner only)
   - File permissions: 600 (owner read/write only)
   - Owner: deployment user or root

2. **Never Expose**
   - Never symlink to public directories
   - Never serve via web server
   - Never commit to Git

3. **Backup Security**
   - Encrypt all backups of this directory
   - Store backup encryption keys separately
   - Test restore procedures regularly

## Environment Variables

The production environment file contains:
- Database passwords
- JWT secrets
- API keys
- SMTP credentials
- Encryption keys
- Monitoring tokens

## Rotation Schedule

- **Passwords**: Every 90 days
- **JWT Secrets**: Every 6 months
- **API Keys**: Per provider requirements
- **SSL Certificates**: Before expiry (auto-renewed)

## Emergency Procedures

In case of suspected compromise:
1. Immediately rotate all secrets
2. Review audit logs
3. Notify security team
4. Document incident

## Access Log

All access to these files should be logged and monitored.

---

Last Updated: 2025-09-03
Classification: CONFIDENTIAL