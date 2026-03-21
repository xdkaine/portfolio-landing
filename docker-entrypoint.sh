#!/bin/sh
set -eu

PUBLIC_DIR=/app/public
PUBLIC_SEED_DIR=/app/public-seed
UPLOAD_DIR="${PROJECT_IMAGE_UPLOAD_DIR:-$PUBLIC_DIR/uploads/projects}"

mkdir -p "$PUBLIC_DIR"

if [ -d "$PUBLIC_SEED_DIR" ]; then
  cp -R "$PUBLIC_SEED_DIR"/. "$PUBLIC_DIR"/
fi

mkdir -p "$UPLOAD_DIR"
chown -R nextjs:nodejs "$PUBLIC_DIR"

exec su-exec nextjs "$@"
