#!/bin/bash

# Script to record heap profile for Next.js
# Usage: ./scripts/heap-profile.sh [dev|build]

MODE=${1:-dev}

if [ "$MODE" = "build" ]; then
  echo "Recording heap profile during build..."
  node --heap-prof node_modules/next/dist/bin/next build
  echo "Heap profile saved as isolate-*.heapprofile in current directory"
elif [ "$MODE" = "dev" ]; then
  echo "Recording heap profile during dev server..."
  echo "Note: Stop the dev server with Ctrl+C when done to generate the profile"
  node --heap-prof node_modules/next/dist/bin/next dev --turbopack
  echo "Heap profile saved as isolate-*.heapprofile in current directory"
else
  echo "Usage: ./scripts/heap-profile.sh [dev|build]"
  exit 1
fi

