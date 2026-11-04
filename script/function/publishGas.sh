#!/bin/bash
set -e

cd gas

echo "📤 Pushing to Google Apps Script..."
clasp push

echo "🌐 Opening in browser..."
clasp open-script
