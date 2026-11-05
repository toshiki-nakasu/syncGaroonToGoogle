#!/bin/bash
set -euo pipefail

with_browser_deps=false
for option in "$@"; do
    case "$option" in
        --with-browser-deps) with_browser_deps=true ;;
        --with-gas) ;; # 旧コマンドとの互換用。claspは共通依存として常に導入する。
        --help|-h)
            echo 'Usage: bash script/environment/setup-development.sh [--with-browser-deps]'
            echo '  --with-browser-deps  Chromium用のOSライブラリも導入する (Linuxではsudoが必要)'
            echo '  GAS用のclaspもルートのnode_modulesへ導入する'
            exit 0
            ;;
        *) echo "不明なオプション: $option" >&2; exit 1 ;;
    esac
done

cd "$(dirname "$0")/../.."
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    echo 'Node.js 24とnpmを用意してください。docs/procedures/development-setup.mdを参照してください。' >&2
    exit 1
fi
if [[ $(node --version) != v24.* ]]; then
    echo 'このリポジトリの開発環境にはNode.js 24を使用してください。' >&2
    exit 1
fi

npm ci --include=dev
if "$with_browser_deps"; then
    npm run browser:install:deps
else
    npm run browser:install
fi

echo '開発ツールの導入が完了しました。npm test と npm run check で検証できます。'
