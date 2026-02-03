#!/usr/bin/env bash
# Creates a zip of this project (excluding node_modules, .next, .git) for sharing.
# Run from project root: ./scripts/package-for-share.sh
# Output: ../S6MigratorConsole.zip (or ../<project-folder-name>.zip)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PARENT="$(dirname "$PROJECT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
OUTPUT="$PARENT/${PROJECT_NAME}.zip"

echo "Packaging ${PROJECT_NAME} (excluding node_modules, .next, .git)..."
cd "$PARENT"
zip -r "$OUTPUT" "$PROJECT_NAME" \
  -x "${PROJECT_NAME}/node_modules/*" \
  -x "${PROJECT_NAME}/.next/*" \
  -x "${PROJECT_NAME}/.git/*" \
  -x "${PROJECT_NAME}/.DS_Store" \
  -q

echo "Created: $OUTPUT"
echo "Share this file. Recipient runs: unzip ${PROJECT_NAME}.zip && cd ${PROJECT_NAME} && npm install && npm run dev"
