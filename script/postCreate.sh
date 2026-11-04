#!/bin/bash
set -euo pipefail

# devcontainer作成時に、共通ツールと実装別の開発依存を準備する。
bash "$(dirname "$0")/setup.sh" --with-browser-deps --with-gas
