#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🔐 Logging in to Google..."
clasp login

echo "✅ Login completed!"
