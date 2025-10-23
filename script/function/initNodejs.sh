#!/bin/bash
set -e

echo "📦 Installing global packages..."
npm install -g @google/clasp

echo "📦 Installing project dependencies..."
cd sync-garoon-to-google
npm install

echo "✅ Node.js setup completed!"
