#!/bin/sh
# Rebuilds the .min files that the pages load.
# Run from the repo root after editing any CSS or JS in assets/:  sh tools/minify.sh
# Needs Node.js (uses npx). Then bump the ?v= value in the pages if browsers must pick it up at once.
set -e
for f in site assistant fonts app; do
  npx --yes clean-css-cli@5 -O1 -o "assets/$f.min.css" "assets/$f.css"
done
for f in assistant calculators loadcheck day-color theme-auto-switch page; do
  npx --yes terser@5 "assets/$f.js" --compress --mangle --comments false -o "assets/$f.min.js"
done
ls -l assets/*.min.css assets/*.min.js
