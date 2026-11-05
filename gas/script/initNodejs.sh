#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/../.."

echo "📦 Installing shared development dependencies..."
npm ci --include=dev

echo "✅ Node.js setup completed!"
