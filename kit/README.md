# The kit

What ships with Tibeb besides the app itself. Plain files, so they also work in a terminal session.

| Folder | What |
|---|---|
| `prompts/` | Starting points for the Make screen (front matter: title, summary, needs) |
| `guides/` | The pages shown on the Guides screen |
| `skills/cutroom/` | The start-word skill: routes, the phone-footage workflow, picture sources, a style template |
| `skills/beat-grid/` | Music first; every cut, word and sound on a frame that is a hit |
| `skills/minimal-talking-head/` | A clean talking-head edit style |

`scripts/install.sh` copies the skills into `~/.claude/skills` (and links them for Codex). It never overwrites a
`style.md` you have written. Guides and skills by other people are linked, not copied.
