#!/bin/zsh

PROJECT_DIR="${0:A:h}"
cd "$PROJECT_DIR" || exit 1

open "http://localhost:8080"
node scripts/dev-server.mjs
