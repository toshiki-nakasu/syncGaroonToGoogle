#!/bin/bash
set -e

echo "📦 Installing Node.js dependencies..."
npm install -g @google/clasp

cd gas
npm install

echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "  1. Run 'sh script/function/googleLogin.sh' to login to Google"
echo "  2. If you need a new Apps Script project, run 'sh script/function/setupGas.sh' or 'cd gas && npm run setup'"
echo "  3. Configure 'gas/src/properties/ScriptProperties.js'"
echo "  4. Run 'sh script/function/publishGas.sh' or 'cd gas && npm run deploy'"
