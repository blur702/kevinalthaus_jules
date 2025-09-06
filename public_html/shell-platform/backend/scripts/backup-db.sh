#!/bin/bash

# PostgreSQL Backup Script for Shell Platform
# This script creates automated backups with retention policy

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-shellplatform}"
DB_USER="${DB_USER:-shellplatform}"
DB_PASSWORD="${DB_PASSWORD:-shellplatform123}"

# Backup configuration
BACKUP_DIR="/var/backups/postgresql/shellplatform"
RETENTION_DAYS=30
MAX_BACKUPS=50

# Create backup directory if it doesn't exist
sudo mkdir -p "$BACKUP_DIR"
sudo chown "$USER:$USER" "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/shellplatform_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

echo "Starting database backup for $DB_NAME..."
echo "Backup file: $BACKUP_FILE_COMPRESSED"

# Create the backup
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

# Verify backup was created and is not empty
if [[ -f "$BACKUP_FILE_COMPRESSED" && -s "$BACKUP_FILE_COMPRESSED" ]]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_COMPRESSED" | cut -f1)
    echo "Backup completed successfully: $BACKUP_FILE_COMPRESSED ($BACKUP_SIZE)"
else
    echo "ERROR: Backup file was not created or is empty"
    exit 1
fi

# Clean up old backups based on retention policy
echo "Cleaning up old backups (keeping last $RETENTION_DAYS days, max $MAX_BACKUPS files)..."

# Remove backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# If we still have too many backups, keep only the most recent MAX_BACKUPS
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f | wc -l)
if [[ $BACKUP_COUNT -gt $MAX_BACKUPS ]]; then
    EXCESS_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f -printf '%T@ %p\n' \
        | sort -n \
        | head -n $EXCESS_COUNT \
        | cut -d' ' -f2- \
        | xargs rm -f
    echo "Removed $EXCESS_COUNT old backup files"
fi

# Create a latest backup symlink
ln -sf "$(basename "$BACKUP_FILE_COMPRESSED")" "$BACKUP_DIR/latest.sql.gz"

# Log backup completion
echo "$(date): Backup completed - $BACKUP_FILE_COMPRESSED" >> "$BACKUP_DIR/backup.log"

# Show final status
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f | wc -l)
echo "Backup process completed. Remaining backups: $REMAINING_BACKUPS"

# Test backup integrity (optional - uncomments to enable)
# echo "Testing backup integrity..."
# export PGPASSWORD="$DB_PASSWORD"
# gzip -t "$BACKUP_FILE_COMPRESSED" && echo "Backup file integrity: OK"

echo "Backup script finished successfully at $(date)"