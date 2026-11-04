#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📦 Installing global packages..."
npm install -g @google/clasp

echo "📦 Installing project dependencies..."
npm install

echo "✅ Node.js setup completed!"
