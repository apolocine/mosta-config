#!/usr/bin/env bash
# Author: Dr Hamid MADANI drmdh@msn.com
# Build + run env-profile tests for @mostajs/config
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ Building @mostajs/config…"
npm run build
echo
echo "▶ Running env-profile test suite…"
node test-scripts/test-env-profile.mjs
