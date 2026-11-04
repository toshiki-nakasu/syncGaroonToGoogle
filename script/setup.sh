#!/bin/bash
set -euo pipefail

with_browser_deps=false
with_gas=false
for option in "$@"; do
    case "$option" in
        --with-browser-deps) with_browser_deps=true ;;
        --with-gas) with_gas=true ;;
        --help|-h)
            echo 'Usage: bash script/setup.sh [--with-browser-deps] [--with-gas]'
            echo '  --with-browser-deps  Chromium用のOSライブラリも導入する (Linuxではsudoが必要)'
            echo '  --with-gas           GAS用のローカルclaspも導入する'
            exit 0
            ;;
        *) echo "不明なオプション: $option" >&2; exit 1 ;;
    esac
done

cd "$(dirname "$0")/.."
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    echo 'Node.js 24とnpmを用意してください。docs/procedures/development-setup.mdを参照してください。' >&2
    exit 1
fi
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != '24' ]]; then
    echo 'このリポジトリの開発環境にはNode.js 24を使用してください。' >&2
    exit 1
fi

npm ci --include=dev
if "$with_browser_deps"; then
    npm run browser:install:deps
else
    npm run browser:install
fi
if "$with_gas"; then
    bash gas/script/initNodejs.sh
fi

echo '開発ツールの導入が完了しました。npm test と npm run check で検証できます。'
