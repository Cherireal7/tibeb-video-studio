# The kit

What ships with Tibeb besides the app itself. Plain files, so they also work in a terminal session.

| Folder | What |
|---|---|
| `prompts/` | Starting points for the Make screen (front matter: title, summary, needs) |
| `guides/` | The pages shown on the Guides screen |
| `skills/cutroom/` | The start-word skill: routes, the phone-footage workflow, picture sources, a style template |
| `skills/beat-grid/` | Music first; every cut, word and sound on a frame that is a hit |
| `skills/minimal-talking-head/` | A clean talking-head edit style |
| `skills/threejs-*`, `map-animation`, `kinetic-typography`, `chart-animation` and nine more | Sixteen open-source (MIT) skills by other people, unchanged: see `skills/THIRD-PARTY.md` |

`skills/cutroom/style.md` is the studio's own house style, dated note by note; a teammate starts from it and adds
their own. `scripts/install.sh` copies the skills into `~/.claude/skills` (and links them for Codex) and never
overwrites a `style.md` that is already there.

Guides and skills by other people that came without an open licence are not in this repository: see `extras.README.md` for what they are and how a
teammate gets them.
