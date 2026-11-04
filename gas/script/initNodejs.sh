#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "📦 Installing project dependencies..."
npm ci --include=dev

echo "✅ Node.js setup completed!"
