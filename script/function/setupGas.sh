#!/bin/bash
cd sync-garoon-to-google

# Googleドライブ直下にGAS作成
clasp create --type api

# 既存をcloneする場合はこちら
# clasp clone [script_id]
