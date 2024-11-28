#!/bin/bash
echo Node install
npm install -g @google/clasp
npm install -g @google-cloud/storage
npm install --prefix sync-garoon-to-google sync-garoon-to-google

cd sync-garoon-to-google
npm install
