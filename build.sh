#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$(mktemp -d /tmp/oculus-build.XXXXXX)"
cleanup() { rm -rf "$BUILD_DIR"; }
trap cleanup EXIT

cp -a "$ROOT/src" "$ROOT/package.json" "$ROOT/tsconfig.json" "$ROOT/esbuild.config.mjs" "$ROOT/manifest.json" "$ROOT/README.md" "$BUILD_DIR/"
mkdir -p "$BUILD_DIR/docs"
cp -a "$ROOT/docs/GUIDE.md" "$BUILD_DIR/docs/"
cd "$BUILD_DIR"
npm install
npm run build
cp -f "$BUILD_DIR/main.js" "$ROOT/main.js"
echo "Wrote $ROOT/main.js"
