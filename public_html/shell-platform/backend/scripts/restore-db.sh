#!/bin/bash

# PostgreSQL Restore Script for Shell Platform
# This script restores database from backup files

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-shellplatform}"
DB_USER="${DB_USER:-shellplatform}"
DB_PASSWORD="${DB_PASSWORD:-shellplatform123}"
BACKUP_DIR="/var/backups/postgresql/shellplatform"

# Function to show usage
show_usage() {
    echo "Usage: $0 [backup_file|latest]"
    echo ""
    echo "Arguments:"
    echo "  backup_file  Path to the backup file (.sql or .sql.gz)"
    echo "  latest       Use the latest available backup"
    echo ""
    echo "Examples:"
    echo "  $0 latest"
    echo "  $0 /path/to/backup.sql.gz"
    echo "  $0 shellplatform_20240904_120000.sql.gz"
}

# Function to list available backups
list_backups() {
    echo "Available backups in $BACKUP_DIR:"
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f -printf '%T@ %TY-%Tm-%Td %TH:%TM %s %f\n' \
            | sort -nr \
            | head -10 \
            | awk '{printf "  %s %s  %8.1fMB  %s\n", $2, $3, $4/1024/1024, $5}'
    else
        echo "  No backup directory found: $BACKUP_DIR"
    fi
}

# Check if argument provided
if [[ $# -eq 0 ]]; then
    echo "ERROR: No backup file specified"
    echo ""
    show_usage
    echo ""
    list_backups
    exit 1
fi

BACKUP_ARG="$1"

# Determine backup file to restore
if [[ "$BACKUP_ARG" == "latest" ]]; then
    if [[ -f "$BACKUP_DIR/latest.sql.gz" ]]; then
        BACKUP_FILE="$BACKUP_DIR/latest.sql.gz"
    else
        # Find the most recent backup
        BACKUP_FILE=$(find "$BACKUP_DIR" -name "shellplatform_*.sql.gz" -type f -printf '%T@ %p\n' \
            | sort -nr | head -1 | cut -d' ' -f2-)
        if [[ -z "$BACKUP_FILE" ]]; then
            echo "ERROR: No backup files found in $BACKUP_DIR"
            exit 1
        fi
    fi
elif [[ -f "$BACKUP_ARG" ]]; then
    BACKUP_FILE="$BACKUP_ARG"
elif [[ -f "$BACKUP_DIR/$BACKUP_ARG" ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_ARG"
else
    echo "ERROR: Backup file not found: $BACKUP_ARG"
    echo ""
    list_backups
    exit 1
fi

# Verify backup file exists and is readable
if [[ ! -f "$BACKUP_FILE" || ! -r "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup file is not readable: $BACKUP_FILE"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Selected backup file: $BACKUP_FILE ($BACKUP_SIZE)"

# Confirmation prompt
read -p "This will REPLACE the current database '$DB_NAME'. Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting database restore..."

# Test backup file integrity first
echo "Testing backup file integrity..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gzip -t "$BACKUP_FILE" || {
        echo "ERROR: Backup file is corrupted"
        exit 1
    }
fi

# Create a pre-restore backup
PRERESTORE_BACKUP="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).sql.gz"
echo "Creating pre-restore backup: $PRERESTORE_BACKUP"
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --clean --no-owner --no-privileges | gzip > "$PRERESTORE_BACKUP"

echo "Pre-restore backup completed: $PRERESTORE_BACKUP"

# Restore the database
echo "Restoring database from: $BACKUP_FILE"

if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
fi

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [[ "$TABLE_COUNT" -gt 0 ]]; then
    echo "Restore verification successful: $TABLE_COUNT tables found"
    
    # Show some basic stats
    echo "Database statistics after restore:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname, 
            tablename, 
            n_tup_ins as inserts, 
            n_tup_upd as updates, 
            n_tup_del as deletes,
            n_live_tup as live_rows
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC 
        LIMIT 10;"
else
    echo "WARNING: Restore verification failed - no tables found"
    echo "You may want to restore from the pre-restore backup: $PRERESTORE_BACKUP"
    exit 1
fi

echo "Database restore completed successfully at $(date)"
echo "Pre-restore backup saved as: $PRERESTORE_BACKUP"