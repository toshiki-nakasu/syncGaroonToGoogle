#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🔐 Logging in to Google..."
npm exec --no -- clasp login

echo "✅ Login completed!"
