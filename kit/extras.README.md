# Extras: other people's guides and skills

The studio also uses material made by other people. It is not in this repository, because it is theirs to publish:

| What | From |
|---|---|
| `motion-design` skill (product and app animations, UI in 3D space) | its author's shared download |
| `3d-animator` skill (three.js films in code) | its author's shared download |
| `talking-head-reels` skill (bold editorial reels with Python and FFmpeg) | its author's page |
| `voiceover-glass-reel` skill (needs After Effects and Higgsfield) | its author's page |
| "The Motion Setup" (the beat-grid method) | Luca Radez, motion.lucaradez.com/The-Motion-Setup.pdf |
| Saved guides on launch films, captions reels and editing with Claude | Tyler Mommsen and others, linked in the Guides screen |

## How a teammate gets them

Whoever set up the studio keeps these in `kit/extras/` on their own Mac (the folder is ignored by git) and runs:

```
./scripts/pack-extras.sh        # writes tibeb-extras.zip next to the repository's files
```

Send that zip privately. The teammate unpacks it into their copy of the repository (it recreates `kit/extras/`)
and runs `./scripts/install.sh`, which installs whatever it finds there. Without the zip the installer offers to
download "The Motion Setup" from its author's site and skips the rest.
