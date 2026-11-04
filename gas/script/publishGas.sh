#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📤 Pushing to Google Apps Script..."
clasp push

echo "🌐 Opening in browser..."
clasp open-script
