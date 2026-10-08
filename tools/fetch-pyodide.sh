#!/bin/sh
# Download Pyodide (Python for the browser), which runs Kara's generator, into
# pyodide/ next to index.html. Pinned to one version and checked against known
# hashes: every player must run the same Python, or the same seed could come
# out as a different game. Run by the deploy workflow; run it yourself to try
# the Kara branch on a local copy.
set -eu
V=0.27.7
DIR="$(cd "$(dirname "$0")/.." && pwd)/pyodide"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/pyodide/pyodide/releases/download/$V/pyodide-core-$V.tar.bz2" -o "$TMP/core.tar.bz2"
mkdir -p "$TMP/x" && tar -xjf "$TMP/core.tar.bz2" -C "$TMP/x" --strip-components=1
W=pyyaml-6.0.2-cp312-cp312-pyodide_2024_0_wasm32.whl
curl -fsSL "https://cdn.jsdelivr.net/pyodide/v$V/full/$W" -o "$TMP/x/$W"
cd "$TMP/x"
sha256sum -c - <<SUMS
04c052c815abb0bf2981fa38c2dfa58e3120ee5288c956df2b2a15e301782c5f  pyodide.mjs
6b4c90de5b7172873f04f21884d0e9d2274e305fe32116558fe3e4fbe3618d51  pyodide.asm.js
a50dd1843f805a0b7c45b61037ee0d7b26dfe85efe0e18ef95a34ad24e401f5f  pyodide.asm.wasm
16611534726e5d8ac2bd8f926410b2dcb8d6f49aa24913463533b457a2115c16  python_stdlib.zip
9c45b916001a750f4102fc287494f3eab215909c7535c626a20db80fd6333e2c  pyodide-lock.json
444d034ede13ca0a2961a1215838fb7d4cf6fa98ba7fe5e2a09e5063180af2bf  $W
SUMS
rm -rf "$DIR" && mkdir -p "$DIR"
cp pyodide.mjs pyodide.asm.js pyodide.asm.wasm python_stdlib.zip pyodide-lock.json "$W" "$DIR/"
echo "Pyodide $V in $DIR"
