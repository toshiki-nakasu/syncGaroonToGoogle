#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📤 Pushing to Google Apps Script..."
npm exec --no -- clasp push

echo "🌐 Opening in browser..."
npm exec --no -- clasp open-script
