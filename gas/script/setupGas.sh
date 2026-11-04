#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📝 Creating new Google Apps Script project..."
npm exec --no -- clasp create --type api

echo "✅ GAS project created!"
echo ""
echo "To clone existing project instead, run:"
echo "  npm --prefix gas run clone -- [script_id]"
