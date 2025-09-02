#!/bin/bash

# LNPixels Database Backup Script
# Creates timestamped backups of the SQLite database

DB_PATH="./pixels.db"
BACKUP_DIR="./backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup filename
BACKUP_FILE="${BACKUP_DIR}/pixels_backup_${TIMESTAMP}.db"

# Copy database file
cp "$DB_PATH" "$BACKUP_FILE"

# Optional: Compress the backup
gzip "$BACKUP_FILE"

echo "Database backup created: ${BACKUP_FILE}.gz"

# Optional: Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "pixels_backup_*.db.gz" -mtime +7 -delete

echo "Old backups cleaned up"