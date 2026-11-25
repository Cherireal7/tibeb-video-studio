# Install on a new Mac, and fix common problems

## Install

```
git clone <the Tibeb repository address>
cd tibeb
./scripts/install.sh
```

The script checks what is there and installs only what is missing: Homebrew tools (FFmpeg, Node, Python 3.12),
the engine and the template repositories next to this one, a Python environment, the kit's skills, the asset
library, the `tibeb` command and the app. It asks before each large download. Run `./scripts/install.sh --check`
to see what it would do without changing anything.

You also need one agent, signed in by you:

- Claude Code: `curl -fsSL https://claude.ai/install.sh | bash`, then `claude` and `/login`.
- Codex: `npm install -g @openai/codex`, then `codex login`.

Then open the app: `tibeb app`, or Tibeb in your Applications folder.

## Problems

| Problem | Fix |
|---|---|
| Setup shows "The engine is not installed" | Run `./scripts/install.sh` again; it resumes where it stopped |
| A repository cannot be cloned | You need access to the private repositories; ask whoever shared Tibeb with you |
| Make says the agent is not signed in | Sign in from a terminal as above, then Setup → Check again |
| Renders fail with a Chrome error | Install Google Chrome; HyperFrames draws frames with it |
| No sound effects found | Setup → run `tibeb library build` in a terminal to make the library |
| The editor preview is blank | The template repository is missing or not installed: `cd ../motion-studio && npm install` |

Settings live in `~/.config/studio/config` as `key=value` lines: `workspace`, `editor` (resolve, capcut, none),
`credit` (the end credit; empty for none), `assist`, `motion`, `frames`, `app` (where each part is installed).
