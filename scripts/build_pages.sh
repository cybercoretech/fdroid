#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"

cd "$ROOT_DIR"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Main website
cp index.html "$DIST_DIR/"
cp styles.css "$DIST_DIR/"
cp boot-system.css "$DIST_DIR/"
cp boot-system.js "$DIST_DIR/"
cp overlay-scroll-lock.js "$DIST_DIR/"
cp repo-ui.css "$DIST_DIR/"
cp repo-ui.js "$DIST_DIR/"
cp qr.svg "$DIST_DIR/"

# Website assets and vendor libraries
cp -R assets "$DIST_DIR/assets"
cp -R vendor "$DIST_DIR/vendor"

# Root-level icons, if present
[[ ! -f icon.png ]] || cp icon.png "$DIST_DIR/"
[[ ! -f icon.svg ]] || cp icon.svg "$DIST_DIR/"

# Verify essential output
for file in \
  index.html \
  styles.css \
  repo-ui.js \
  assets/fdroid-react.js \
  assets/fdroid-react.css
do
  if [[ ! -s "$DIST_DIR/$file" ]]; then
    echo "ERROR: Required Pages output missing: $file" >&2
    exit 1
  fi
done

echo "Cloudflare Pages output prepared:"
find "$DIST_DIR" -type f | sort
echo
echo "Total files: $(find "$DIST_DIR" -type f | wc -l | tr -d ' ')"
