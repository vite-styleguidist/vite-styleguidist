#!/usr/bin/env bash

# Full production build of the docs site, including the live example style guides.
#
# Run from site/ (`npm run deploy` or `bash scripts/deploy.sh`); it is also what
# .github/workflows/site.yml runs before publishing site/build to GitHub Pages.
#
# Steps:
#   1. install the repository root and compile the package (lib/bin/styleguidist.js),
#   2. build every example style guide the root CI builds, with that compiled package,
#   3. copy each build into site/static/examples/<name>/ (gitignored) so Docusaurus
#      ships them verbatim at <baseUrl>/examples/<name>/,
#   4. sync the docs and build the site.
#
# The example builds use relative asset URLs (`base: './'` in production, see
# src/scripts/make-vite-config.ts), which is what lets them work from a sub-path.

set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$SITE_DIR/.." && pwd)"
STATIC_EXAMPLES_DIR="$SITE_DIR/static/examples"

# Keep in sync with the "Build all examples" step of .github/workflows/ci.yml and
# the `build:<name>` scripts in the root package.json.
EXAMPLES=(basic customised sections themed express preact styled-components vite mdx)

echo "Node $(node -v)"
echo "npm $(npm -v)"

echo
echo "Installing and compiling the package..."
cd "$ROOT_DIR"
npm ci
npm run compile

for name in "${EXAMPLES[@]}"; do
	echo
	echo "Building the $name example..."
	npm run "build:$name"
done

echo
echo "Copying the examples into $STATIC_EXAMPLES_DIR..."
rm -rf "$STATIC_EXAMPLES_DIR"
for name in "${EXAMPLES[@]}"; do
	# Each example builds into its `styleguide/` folder (the default `styleguideDir`):
	# `index.html` plus a `build/` folder with the assets. Some examples also keep
	# source files there (e.g. examples/customised/styleguide/components), so only the
	# build output is copied.
	src="$ROOT_DIR/examples/$name/styleguide"
	dest="$STATIC_EXAMPLES_DIR/$name"
	mkdir -p "$dest"
	cp "$src/index.html" "$dest/index.html"
	cp -R "$src/build" "$dest/build"
done

echo
echo "Building the site..."
cd "$SITE_DIR"
npm run sync
npm run build
