---
name: cutroom
description: The start word for the video studio. Use when the user says "cutroom" (alone or followed by an idea, a project name or a file), drops raw phone footage to be edited, or asks to make any video with the studio (talking-head edit, captions reel, word behind the head, story video, motion graphic, 3D film). Loads the studio's style rules, picks the right engine and skill for the job, and runs the storyboard-first workflow. Works the same in Claude Code and Codex.
---

# Cutroom

One word starts a video. `cutroom` alone asks what is being made; `cutroom <idea, project or file>` goes straight to work.

## When it starts

1. Read `style.md` next to this file (the studio's standing taste; it overrides defaults in every other skill). If there is
   none yet, copy `style.example.md` to `style.md` and fill it in as notes come.
2. Read `~/Documents/resolve-assist/CLAUDE.md` (the workspace guide: folders, tools, editor) and `~/.config/studio/config`.
3. If a project is named, read `~/Documents/resolve-assist/projects/<name>/brief.md` and `project.json` first.
   New material: `studio new "<Name>"`, files go in its `inbox/`, then `studio add "<Name>"` (or the `project_intake` tool).
4. Say in two or three lines what you understood and which route below you will take, then start. Ask only what blocks
   the work (at most three questions).

## Routes

| The request | Route | Read |
|---|---|---|
| Raw phone footage of someone talking | Phone footage edit (below) | this file |
| A premium minimal talking-head edit | `minimal-talking-head` skill | that skill |
| A bold editorial talking-head reel (big Anton words, B-roll, split screens), rendered by Python and ffmpeg | `talking-head-reels` skill; run its scripts with `~/.local/share/studio/venv/bin/python` | that skill |
| A voice-over turned into a glass-frame documentary reel | `voiceover-glass-reel` skill: needs After Effects (not installed) and Higgsfield credits for every picture, so ask first | that skill |
| A story or explainer in his paper style (desk cut, Vox, map journeys) | Motion Studio templates | `~/Documents/Github/motion-studio/CLAUDE.md` |
| A one-off graphic, kinetic type, counter, chart, overlay, parody | HyperFrames (`hyperframes` skill) | `~/Documents/Github/hyperframes-studio/README.md` |
| A music-led intro, a drop, slides or words landing on the beat | `beat-grid` skill (`studio grid`): music first, every cue on a frame that is a hit | that skill |
| A product, app or brand animation with UI in 3D space | `motion-design` skill | that skill |
| A real 3D scene (desk, room, product) | `3d-animator` skill | that skill |
| AI-generated images or clips | Higgsfield skills, only after stating the credit cost and getting an OK | workspace guide |

Most videos mix routes: plan scene by scene, give each scene to the engine that does it best, and keep one look
(the same fonts, colours and paper textures). A full scene joins as an MP4 clip; an element on top of footage is
rendered with transparency (ProRes 4444 `.mov`) and goes on a track above.

## A first cut in one command

`studio cut "<Project>"` (clips in the project's `inbox/` or `footage/`, one track in `music/`; or `--clips <folder>` `--track <file>`)
makes a first version in the house style: clips converted, usable moments and faces found, hard cuts on the speech's words
(or the beats), one-or-two-word captions, opening on a face. It writes `build/auto-cut.json`: change a shot's clip or
in-point there and re-run with `--from-plan`. Use it as the starting point for footage-to-a-track videos, then add the in-scene
text, cards and paper moments by hand. `studio layers "<Project>"` then exports any finished video for CapCut and the app.
Known limits: caption pairs can straddle a sentence when the transcript has no punctuation; shot choice is by sharpness,
light, movement and faces, not by meaning.

## Phone footage edit

The order matters: each step is cheap to change before the next one starts.

1. **Intake.** Put the clips in the project `inbox/`, run intake, look at one frame of each (ffmpeg) and note size, frame
   rate, rotation and length. Phone clips are often variable frame rate or HDR: convert once to constant 30 fps SDR
   H.264 before anything else, and keep the originals.
2. **Words.** `resolve-assist prep "<clip>" "<Project>"` (tool: `edit_prep`) cuts silences and writes a word-level
   transcript. Show the words in one line, mark anything that looks misheard, ask for brand and people names, and wait
   for the OK. A corrected word keeps the time of the word it replaces. Then check word starts against where the audio
   gets loud (`resolve-assist peaks`); a caption three frames late is felt even when nobody can say why.
3. **Jump cuts.** Cut every pause longer than about 0.22 s, never inside a word. Alternate normal and tight framing
   (1.15x) from cut to cut. No zooms or transitions on jump cuts.
4. **Storyboard, then wait.** A table, one row per beat: time, his exact words, what is on screen, which engine or
   tool, the sound. For a planned edit also write `prep/plan.html` (tool: `edit_plan`) so he can pick scenes. Nothing is
   rendered before he approves; notes come back by row number.
5. **Cutout (only where text or graphics go behind him).**
   `~/.local/share/studio/venv/bin/python <this skill>/scripts/person_cutout.py clip.mp4 cutout.mov --still 2 check.png`
   Local and free (birefnet-portrait). It is slow, a few seconds a frame, so cut out only the seconds that need it
   (`--start`, `--dur`), show the still first and say how long the run will take. Faster but rougher:
   `npx hyperframes remove-background clip.mp4 -o cutout.webm` in `~/Documents/Github/hyperframes-studio`.
6. **Layers, back to front:** the footage; words and graphics that sit behind him; his cutout; captions and graphics
   in front. A word behind the head: about 85 % of the frame width, placed so his head covers roughly 60 % of its
   height and at least 15 % of the letters, popping in on the frame he says it. Do not caption that word twice.
7. **Captions.** Up to three words at a time, split at natural breaks, each group cut on exactly when its first word
   is spoken and held until the next. Highlight only the word being spoken or the one word that carries the line; never
   a coloured box behind every caption. Two typefaces at most: a clean one for most words, an expressive one for the
   word that matters. One accent colour, saved for one word a line. Vary size, emphasis and entrance from line to line.
   Keep text between 15 % and 65 % of the frame height and away from the right edge (app buttons and the post caption
   cover the rest).
8. **Graphics on his words.** Each element enters on the stressed word. Real screenshots and real logos beat mock-ups;
   ask for them. Useful beats: a tool's logo with its name sliding out, a repo or product card, a typed prompt bar, a
   before/after wipe, a clip in a window that freezes while he explains, a grid of clips, a magazine-cover frame.
   Between shots prefer a whip pan (6 frames out, 6 in, about 8 % slide with blur) over nested zooms.
9. **Grade.** One consistent look across clips: the `look` fields in `edit.json`, or FFmpeg curves, a small saturation
   cut and a soft vignette. Show a before/after still.
10. **Sound, last.** Only when the picture is locked, because any change moves every beat. One sound per visible
    action, on its frame, quiet and under his voice. Sounds must survive a phone speaker: content around 1 to 8 kHz,
    not sub-bass. Master to about -14 LUFS with peaks near -1.5 dB.
11. **Check the file, not the preview.** Frame count and length as planned, frames pulled from the MP4 at each beat,
    the last frame showing the credit, `resolve-assist delivery-check`. Then open the video.
12. **Notes rounds.** He gives notes like he would to an editor ("this word comes in late"). Change only what he named,
    back up the file first, render again. When something lands, add it to `style.md` so the style builds up.

## Motion graphics with no footage (launch films, logo stings, explainers)

Build them in HyperFrames. Write the brief to yourself in eight parts before any code: PRODUCT (what, for whom, the one promise),
STORY (hook, points, ending; one visual thread that never leaves the screen; every scene turns into the next, nothing fades or
cuts), FORMAT, LOOK (exact hex colours, named fonts, what is banned), MOTION (the camera always moves a little; real depth),
SOUND (one sound per action, on its frame), QUALITY CHECK, RULES. The quality check is the part that matters most: render,
look at a frame from every half second, critique it as a senior motion designer would (story, layout, spacing, type, timing,
readability, sound against picture), fix, and repeat for several rounds, noting what was weak and what changed each round.
Use real assets (the product's own screenshots, icon and colours). Style starting points worth naming in a brief: particles, liquid morph, glassmorphism, kinetic type, isometric, clay,
ASCII, split-flap, VHS, halftone, Bauhaus, pixel art, blueprint, art deco, neo-brutalism. More in `references/prompt-libraries.md`. `reanimate` copies the motion of a reference.

## Rules for every route

- Sound is planned first, on a beat grid, in every video: read the `beat-grid` skill and run `studio grid plan` before
  the storyboard, so each row of the storyboard already has its step on the grid and its sound.
- Storyboard before rendering; stills before a preview; a preview before the final. Say how long a long render takes
  before starting it.
- One vertical 9:16 video per request, ending with the studio's credit line (`credit=` in `~/.config/studio/config`; none when it is empty).
- Shots should turn into each other where they can; no cross dissolves. Something is always moving. Fast first,
  then slower for longer.
- Everything runs locally and free. Paid services (Higgsfield credits, ElevenLabs, Suno, Beeble, HeyGen cloud or Pro,
  Adobe Podcast, any API key) only after stating the cost and getting an OK.
- Real pictures before mock-ups: search Wikimedia Commons with the built-in tool, then the archives in
  `references/picture-sources.md`, and record each picture's source and licence in the project.
- Other people's reels as references or grid tiles: `yt-dlp <link>` into the project's `refs/`.
- Every delivered video also goes out as layers he can edit in CapCut: each shot its own clip, each effect its own clip on its
  own track (transparent ProRes 4444 `.mov` over footage, MP4 for full-frame scenes), captions as CapCut text, music separate,
  then `resolve_assist.capcut.build_draft`. Reference: `studio layers "<Project>"`, which reads `build/layers.json`
  (renders each HyperFrames group alone by hiding the others and scrubbing the same timeline over its time range). Also write
  `edit.json` so the Tibeb app opens it (WebM copies of the transparent layers). Say what stays retypeable and what is baked.
- Commit and push the studio repos after each large stage. Report honestly what was checked and what was not.

## Where things are

| Thing | Place |
|---|---|
| Workspace, projects, asset library | `~/Documents/resolve-assist` |
| Studio tools (CLI `resolve-assist`, MCP server `resolve-assist`) | `~/Documents/Github/resolve-assist` |
| Motion Studio templates (Remotion) | `~/Documents/Github/motion-studio` |
| HyperFrames projects, CLI pinned | `~/Documents/Github/hyperframes-studio` |
| Python for cutouts, shake tools, mixers (numpy, pillow, scipy, opencv, rembg) | `~/.local/share/studio/venv/bin/python` |
| Cutout model | `~/.local/share/studio/models` |
| Launcher | `studio help` |
| The guides this was learned from (links, not copies) | the app's Guides screen, "Where this comes from" |
| Free archives for real pictures (Commons, Library of Congress, the Met, NASA and more) | `references/picture-sources.md` |
| Prompt libraries to browse for looks and moves | `references/prompt-libraries.md` |
