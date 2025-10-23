#!/bin/bash
set -e

cd sync-garoon-to-google

echo "📤 Pushing to Google Apps Script..."
clasp push

echo "🌐 Opening in browser..."
clasp open
