#!/usr/bin/env bash

set -e

# Deploy to Netlify

ROOT_DIR=".."
EXAMPLE_DIR="../examples/basic"
STATIC_DIR="static"

echo "Node $(node -v)"
echo "npm $(npm -v)"

# Build the basic example with the version of Styleguidist from this repository
# (the example is built from the repository root, with the root dependencies)
echo
echo "Building the basic example..."
cd "$ROOT_DIR"
npm ci
npm run compile
npm run build:basic
cd -

# Copy to the public folder
echo
echo "Copying the basic example..."
mkdir -p "$STATIC_DIR/examples/basic"
cp -R $EXAMPLE_DIR/styleguide/* "$STATIC_DIR/examples/basic"

# Build the site
echo
echo "Building the site..."
npm run sync
npm run build
