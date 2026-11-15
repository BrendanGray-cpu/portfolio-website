#!/bin/zsh
# Builds the pages and serves the portfolio at http://localhost:8028
cd "$(dirname "$0")"
python3 tools/build.py && python3 serve.py
