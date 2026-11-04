#!/bin/bash
set -e

# 開発環境の起点。GAS固有の依存関係の準備はGAS版へ委譲する。
bash "$(dirname "$0")/../gas/script/initNodejs.sh"

echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "  1. Run 'sh gas/script/googleLogin.sh' to login to Google"
echo "  2. If you need a new Apps Script project, run 'sh gas/script/setupGas.sh' or 'npm --prefix gas run setup'"
echo "  3. Configure 'gas/src/properties/ScriptProperties.js'"
echo "  4. Run 'sh gas/script/publishGas.sh' or 'npm --prefix gas run deploy'"
