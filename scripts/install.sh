#!/bin/bash
# Sets up Tibeb and the studio behind it on a Mac. Safe to run again: it only adds what is missing.
# It never uses sudo, never overwrites your style rules, and asks before large downloads.
#   ./scripts/install.sh            install what is missing
#   ./scripts/install.sh --check    only report what is there and what would be done
set -u
CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1
HERE="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${TIBEB_HOME:-$(dirname "$HERE")}"                      # the sibling repositories live next to this one
ENGINE="$BASE/resolve-assist"; MOTION="$BASE/motion-studio"; FRAMES="$BASE/hyperframes-studio"
ENGINE_REPO="${TIBEB_ENGINE_REPO:-https://github.com/Cherireal7/resolve-assist.git}"; ENGINE_BRANCH="${TIBEB_ENGINE_BRANCH:-feat/studio-foundations}"
MOTION_REPO="${TIBEB_MOTION_REPO:-https://github.com/Cherireal7/motion-studio.git}"; MOTION_BRANCH="${TIBEB_MOTION_BRANCH:-feat/vertical-3d-vfx}"
CONF="$HOME/.config/studio/config"; VENV="$HOME/.local/share/studio/venv"
todo=0
say()  { printf '\n== %s\n' "$1"; }
ok()   { printf '  ok    %s\n' "$1"; }
miss() { printf '  need  %s\n' "$1"; todo=$((todo + 1)); }
have() { command -v "$1" >/dev/null 2>&1; }
run()  { if [ $CHECK = 1 ]; then printf '  would run: %s\n' "$*"; else "$@"; fi; }
conf_set() {                                                   # key value: write once, keep what is already set
  grep -q "^$1=" "$CONF" 2>/dev/null && return 0
  if [ $CHECK = 1 ]; then printf '  would set %s=%s in %s\n' "$1" "$2" "$CONF"; else mkdir -p "$(dirname "$CONF")"; printf '%s=%s\n' "$1" "$2" >> "$CONF"; fi
}

[ "$(uname)" = "Darwin" ] || { echo "Tibeb's studio runs on macOS."; exit 1; }

say "Tools"
if have brew; then ok "Homebrew"; else echo "  Install Homebrew first (https://brew.sh), then run this again."; exit 1; fi
for pkg in git ffmpeg node python@3.12; do
  bin="$pkg"; [ "$pkg" = "python@3.12" ] && bin="python3.12"
  if have "$bin"; then ok "$pkg"; else miss "$pkg"; run brew install "$pkg"; fi
done
if have node; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] && ok "Node $major" || miss "Node 20 or newer (found $major): brew upgrade node"
fi
[ -d "/Applications/Google Chrome.app" ] && ok "Google Chrome (draws the frames)" || miss "Google Chrome: install it from google.com/chrome"

say "Repositories next to this one ($BASE)"
clone() {                                                      # dir repo branch
  if [ -d "$1/.git" ]; then ok "$(basename "$1")"; return 0; fi
  miss "$(basename "$1") from $2 ($3)"
  run git clone --branch "$3" "$2" "$1" || { echo "  Could not clone $2. It is private: ask for access, or set TIBEB_ENGINE_REPO / TIBEB_MOTION_REPO to your copy."; return 1; }
}
clone "$ENGINE" "$ENGINE_REPO" "$ENGINE_BRANCH"
clone "$MOTION" "$MOTION_REPO" "$MOTION_BRANCH"

say "Engine (Python)"
if [ -x "$ENGINE/.venv/bin/resolve-assist" ]; then ok "engine environment"; else
  miss "engine environment in $ENGINE/.venv"
  if [ -d "$ENGINE" ] || [ $CHECK = 1 ]; then run python3.12 -m venv "$ENGINE/.venv" && run "$ENGINE/.venv/bin/pip" install --quiet -e "$ENGINE[mcp,tts]"; fi
fi
if [ -x "$VENV/bin/python" ]; then ok "tools environment ($VENV)"; else
  miss "tools environment for first cuts and cut-outs (numpy, pillow, scipy, opencv)"
  run python3.12 -m venv "$VENV" && run "$VENV/bin/pip" install --quiet numpy pillow scipy opencv-python
fi

say "Templates and HyperFrames"
if [ -d "$MOTION/node_modules" ]; then ok "motion-studio packages"; else miss "motion-studio packages"; [ -d "$MOTION" ] && (cd "$MOTION" && run npm install --no-fund --no-audit); fi
if [ -f "$FRAMES/package.json" ]; then ok "hyperframes-studio"; else
  miss "hyperframes-studio (a folder for HTML-to-video projects)"
  if [ $CHECK = 0 ]; then
    mkdir -p "$FRAMES/projects"
    cat > "$FRAMES/package.json" <<'JSON'
{
  "name": "hyperframes-studio",
  "private": true,
  "description": "HyperFrames projects for Tibeb (HTML rendered to video, local and free)",
  "devDependencies": {"hyperframes": "0.9.80", "puppeteer-core": "^24.0.0"}
}
JSON
    printf 'node_modules/\nprojects/*/exports/\nprojects/*/renders/\nprojects/*/.hyperframes/artifacts/\n.env\n' > "$FRAMES/.gitignore"
  fi
fi
if [ -d "$FRAMES/node_modules/hyperframes" ]; then ok "HyperFrames installed"; else miss "HyperFrames packages"; [ -d "$FRAMES" ] && (cd "$FRAMES" && run npm install --no-fund --no-audit); fi
[ $CHECK = 0 ] && [ -d "$FRAMES/node_modules/hyperframes" ] && (cd "$FRAMES" && npx hyperframes telemetry disable >/dev/null 2>&1 || true)

say "Settings ($CONF)"
conf_set assist "$ENGINE"; conf_set motion "$MOTION"; conf_set frames "$FRAMES"; conf_set app "$HERE"; conf_set editor none
if ! grep -q "^credit=" "$CONF" 2>/dev/null; then
  if [ $CHECK = 1 ]; then echo "  would ask for your end credit line"; else
    printf '  End credit on your videos (for example "Edit by Sara"; leave empty for none): '; read -r credit
    printf 'credit=%s\n' "$credit" >> "$CONF"
  fi
else ok "credit line: \"$(sed -n 's/^credit=//p' "$CONF" | tail -1)\""; fi

say "Skills from the kit"
for agent in "$HOME/.claude/skills"; do
  for s in "$HERE"/kit/skills/*/; do
    name="$(basename "$s")"
    if [ -e "$agent/$name" ]; then ok "$name (already there, left as it is)"; else miss "$name"; run mkdir -p "$agent"; run cp -R "$s" "$agent/$name"; fi
  done
done
if [ -f "$HOME/.claude/skills/cutroom/style.md" ]; then ok "your style.md (never overwritten)"; else
  miss "a style.md to hold your taste"; [ $CHECK = 0 ] && [ -d "$HOME/.claude/skills/cutroom" ] && cp "$HERE/kit/skills/cutroom/style.example.md" "$HOME/.claude/skills/cutroom/style.md"
fi
[ -x "$ENGINE/scripts/skills-sync" ] && { [ $CHECK = 1 ] && echo "  would share the skills with Codex" || "$ENGINE/scripts/skills-sync" >/dev/null 2>&1 || true; }

say "Workspace, library and the tibeb command"
if [ -x "$ENGINE/.venv/bin/resolve-assist" ]; then
  WS="$("$ENGINE/.venv/bin/resolve-assist" status 2>/dev/null | sed -n 's/.*"output_dir": "\(.*\)".*/\1/p' | head -1)"; WS="${WS:-$HOME/Documents/resolve-assist}"
  run "$ENGINE/.venv/bin/resolve-assist" workspace >/dev/null
  if [ -f "$WS/library/manifest.json" ]; then ok "asset library"; else miss "asset library (sounds, music, textures: a few minutes, made on this Mac)"; run "$ENGINE/.venv/bin/resolve-assist" library >/dev/null; fi
fi
if [ -x "$HOME/.local/bin/tibeb" ]; then ok "tibeb command"; else miss "tibeb command"; [ -x "$ENGINE/scripts/install-launcher.sh" ] && run "$ENGINE/scripts/install-launcher.sh"; fi

say "Studio tools for the agents (MCP)"
if have claude; then
  if claude mcp get resolve-assist >/dev/null 2>&1; then ok "Claude Code knows the studio tools"; else miss "studio tools in Claude Code"; run claude mcp add --scope user resolve-assist -- "$ENGINE/.venv/bin/resolve-assist-mcp"; fi
  claude plugin list 2>/dev/null | grep -q hyperframes && ok "HyperFrames skills in Claude Code" || { miss "HyperFrames skills in Claude Code"; run claude plugin marketplace add heygen-com/hyperframes; run claude plugin install hyperframes@hyperframes; }
else miss "Claude Code (optional if you use Codex): curl -fsSL https://claude.ai/install.sh | bash, then claude and /login"; fi
if have codex; then
  if grep -q "resolve-assist" "$HOME/.codex/config.toml" 2>/dev/null; then ok "Codex knows the studio tools"; else miss "studio tools in Codex"; run codex mcp add resolve-assist -- "$ENGINE/.venv/bin/resolve-assist-mcp"; fi
else miss "Codex (optional if you use Claude Code): npm install -g @openai/codex, then codex login"; fi

say "The app"
if [ -d "$HERE/node_modules" ]; then ok "app packages"; else miss "app packages"; (cd "$HERE" && run npm install --no-fund --no-audit); fi
if [ -f "$HERE/dist/main/main.js" ] && [ -f "$HERE/dist/renderer/index.html" ]; then ok "app built"; else miss "app build"; (cd "$HERE" && TIBEB_MOTION="$MOTION" run npm run build); fi

say "Result"
if [ $CHECK = 1 ]; then
  [ $todo = 0 ] && echo "Everything is in place. Open the app with:  tibeb app" || echo "$todo thing(s) to set up. Run ./scripts/install.sh to do it."
else
  echo "Open the app with:  tibeb app      (then Setup, then Make)"
  echo "Sign in to one agent first if you have not: 'claude' then /login, or 'codex login'."
fi
