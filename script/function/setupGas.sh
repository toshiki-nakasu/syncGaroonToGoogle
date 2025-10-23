#!/bin/bash
set -e

cd sync-garoon-to-google

echo "📝 Creating new Google Apps Script project..."
clasp create --type api

echo "✅ GAS project created!"
echo ""
echo "To clone existing project instead, run:"
echo "  clasp clone [script_id]"
