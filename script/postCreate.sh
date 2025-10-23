#!/bin/bash
set -e

echo "📦 Installing Node.js dependencies..."
npm install -g @google/clasp

cd sync-garoon-to-google
npm install

echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run setup' or 'sh script/function/googleLogin.sh' to login to Google"
echo "  2. Configure 'sync-garoon-to-google/src/properties/ScriptProperties.js'"
echo "  3. Run 'npm run deploy' to push to Google Apps Script"
