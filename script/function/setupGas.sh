#!/bin/bash
cd sync-garoon-to-google
clasp login

# Googleドライブ直下にGAS作成
clasp create --type api

# clasp clone [script_id]
