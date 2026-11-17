#!/usr/bin/env bash
# Build the GitHub Pages site into a folder.
#
#   scripts/build-pages.sh <out-dir> <version>
#
# - Copies only the app (index.html, css, js, assets, LICENSE).
# - Adds ?v=<version> to the stylesheet, the language script, the entry
#   script and every module import, so a new release never runs against a
#   stale cached copy of the old CSS or JS (browsers may keep those for
#   hours). Fonts and images keep plain URLs: they rarely change, and the
#   font preload must match the URL in the CSS.
# - Writes cosready.html for the cosready.ai/glowready proxy: the same page
#   with absolute /glowready/ paths, because the browser stays on /glowready
#   with no trailing slash. index.html keeps relative paths for the Pages URL.
set -euo pipefail

OUT="${1:?usage: build-pages.sh <out-dir> <version>}"
VERSION="${2:?usage: build-pages.sh <out-dir> <version>}"
cd "$(dirname "$0")/.."

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R index.html css js assets LICENSE "$OUT/"

sed -i.bak -E \
  -e "s#href=\"css/app\.css\"#href=\"css/app.css?v=$VERSION\"#" \
  -e "s#src=\"js/locale\.js\"#src=\"js/locale.js?v=$VERSION\"#" \
  -e "s#src=\"js/main\.js\"#src=\"js/main.js?v=$VERSION\"#" \
  "$OUT/index.html"
for f in "$OUT"/js/*.js; do
  sed -i.bak -E "s#from '\./([a-z]+)\.js'#from './\1.js?v=$VERSION'#g" "$f"
done
find "$OUT" -name '*.bak' -delete

sed -E 's#(href|src)="(css|js|assets)/#\1="/glowready/\2/#g' "$OUT/index.html" > "$OUT/cosready.html"

# Fail the build if anything was missed.
grep -q "href=\"/glowready/css/app.css?v=$VERSION\"" "$OUT/cosready.html"
grep -q "src=\"/glowready/js/locale.js?v=$VERSION\"" "$OUT/cosready.html"
grep -q "src=\"/glowready/js/main.js?v=$VERSION\"" "$OUT/cosready.html"
if grep -nE "from '\./[a-z]+\.js'" "$OUT"/js/*.js; then
  echo "unversioned module import left in the build" >&2
  exit 1
fi
echo "Built $OUT (version $VERSION)"
