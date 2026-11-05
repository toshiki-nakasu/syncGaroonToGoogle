#!/bin/bash
set -euo pipefail

# devcontainer作成時に、claspを含む共通ツールを準備する。
bash "$(dirname "$0")/setup-development.sh" --with-browser-deps
