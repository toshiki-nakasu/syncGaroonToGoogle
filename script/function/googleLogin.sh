#!/bin/bash
set -e

cd sync-garoon-to-google

echo "🔐 Logging in to Google..."
clasp login

echo "✅ Login completed!"
