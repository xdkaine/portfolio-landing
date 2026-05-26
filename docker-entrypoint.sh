#!/bin/sh
set -eu

PUBLIC_DIR=/app/public
PUBLIC_SEED_DIR=/app/public-seed
PROJECT_UPLOAD_DIR="${PROJECT_IMAGE_UPLOAD_DIR:-$PUBLIC_DIR/uploads/projects}"
POST_UPLOAD_DIR="${POST_IMAGE_UPLOAD_DIR:-$PUBLIC_DIR/uploads/posts}"

mkdir -p "$PUBLIC_DIR"

if [ -d "$PUBLIC_SEED_DIR" ]; then
  cp -R "$PUBLIC_SEED_DIR"/. "$PUBLIC_DIR"/
fi

mkdir -p "$PROJECT_UPLOAD_DIR" "$POST_UPLOAD_DIR"
chown -R nextjs:nodejs "$PUBLIC_DIR"

exec su-exec nextjs "$@"
