#!/bin/bash
set -e

echo "📦 Installing global packages..."
npm install -g @google/clasp

echo "📦 Installing project dependencies..."
cd gas
npm install

echo "✅ Node.js setup completed!"
