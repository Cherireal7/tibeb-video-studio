#!/bin/bash
# Packs kit/extras (other people's guides and skills, kept out of git) into one zip to hand to a teammate privately.
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$HERE/kit/extras" ] || { echo "Nothing to pack: $HERE/kit/extras does not exist."; exit 1; }
cd "$HERE" && rm -f tibeb-extras.zip && zip -qr tibeb-extras.zip kit/extras -x '*/node_modules/*' -x '*/.DS_Store'
echo "Wrote $HERE/tibeb-extras.zip ($(du -h tibeb-extras.zip | cut -f1)). Send it privately; unpack it inside the repository folder."
