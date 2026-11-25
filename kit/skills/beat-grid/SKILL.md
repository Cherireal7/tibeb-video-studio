---
name: beat-grid
description: Make a music-led motion video where the music comes first and every cut, word and sound sits on a frame that is also a hit in the music. Plans the video on a beat grid (a tempo where one sixteenth note is a whole number of frames), writes the music plan section by section, makes a free local percussion track or measures one from ElevenLabs, checks the cue sheet against the rules of the edit, and mixes one sound per gesture on its frame. Use when the user asks for an intro reel, a "drop", a beat-synced or music-first motion graphic, a name or logo sting cut to music, slides flashing on the beat, "sound design on the grid", or says "beat grid" or "motion setup". Built with HyperFrames; works the same in Claude Code and Codex.
---

# Beat grid

The music is written first, as a plan. The picture is then placed on the music's grid, never the other way round.
Learned from Luca Radez's guide "The Motion Setup" (motion.lucaradez.com; get it from its author), built into the
studio as `studio grid`.

Read `~/.claude/skills/cutroom/style.md` first: the studio's taste still applies (one 9:16 video, the credit line at the
end, the house look). This route is the exception to "no music by default": here the music is the point.

## The grid

At 60 fps pick a tempo where a sixteenth is a whole number of frames:

| Tempo | Sixteenth | Beat | Bar |
|---|---|---|---|
| 90 bpm | 10 frames | 40 | 160 |
| 100 bpm | 9 frames | 36 | 144 |
| 112.5 bpm | 8 frames | 32 | 128 |
| 150 bpm | 6 frames | 24 | 96 |

`studio grid tempos --fps 30` lists them for another frame rate. A position is written `bar.beat.sixteenth` from 1
(`3.1.1` is the downbeat of bar 3), or as a step number (sixteenths from 0).

## The rules of the edit

1. **Music first.** Sections with exact lengths, one per act, before any scene exists.
2. **On a hit.** Everything that moves starts on a sixteenth where the music has a hit you can hear. Never on an empty one.
3. **One at a time.** The text lands, then the effect, then the cut. Two gestures on one hit read as noise.
4. **Few words.** At most four on screen, typed or one at a time, held long enough to read.
5. **Cut on the one.** If the music is cut, cut at the end of a bar and restart on a downbeat.
6. **Silence.** One beat of nothing before the drop: no picture change, no sound, no reverb tail.
7. **The drop never holds.** One cut per hit, starting on the downbeat, the first slide growing out of the scene before it.
   Design the slides as one system: same name in the centre, same grid, same type; only the colour and the drawing change.
8. **One sound per gesture**, on its hit. No loops with a rhythm of their own.
9. **Safe area.** Text stays out of the top and bottom 190 px.

`studio grid check` tests rules 2 to 7 on the cue sheet and names a fix for each problem.

## How to work

**Step 1: the plan, then wait.** Ask for the brief if it is missing (what, for whom, three words for the feeling,
colours and fonts, no logo unless one is given). Then:

```bash
studio grid plan "<Project>" --bpm 112.5 --sections intro:4,groove:3,spin:3,drop:2,outro:2
```

Sections are in bars (quarters allowed: `1.5`); kinds are `intro`, `groove`, `spin`, `drop`, `outro`, `pulse`,
`silence`; `build=spin:3` names a section differently from its kind. For other music descriptions write
`build/sections.json` (a list of `{name, kind, bars, music, exclude, silence_beats}`) and run `plan` without `--sections`.
The section before a drop gets its beat of silence by itself. This writes, in `projects/<Project>/build/`:
`grid.md` (the table), `grid.json`, `grid.js`, `music-plan.json`, and a starter `cues.json`.

Show the user the section table and the scene list on the grid (step, time, what happens, the sound). Nothing is built
before the OK.

**Step 2: the music.** Two ways:

- Free, here: `studio grid track "<Project>"` makes `music/grid-track.wav`, a dry percussion track that follows the plan
  exactly (hits on the frames, hard silence before the drop). Good for the first versions and for videos that need
  nothing more.
- ElevenLabs (paid: say the cost and get a yes first): give its music tool `build/music-plan.json` (sections with
  `duration_ms`, styles and excluded styles). Save the result in the project's `music/`, then
  `studio grid hits "<Project>" --music music/<file>`. That reports how many milliseconds the track sits off the grid
  and which sixteenths really carry a hit; the check then uses those, and the mix shifts the track onto the frames.
  If fewer than three beats in four carry a hit, the tempo is not the plan's: generate again rather than stretch it.

**Step 3: the cue sheet.** `build/cues.json` is the one list both picture and sound are made from. One entry per gesture:

```json
{"section": "groove", "step": 3, "kind": "text", "text": "ONE", "what": "first word", "sound": "click-soft", "gain_db": -6}
```

Place by `section` + `step`, or `pos` ("5.1.4"), `step`, `frame` or `time`. Kinds: `text`, `effect`, `cut`, `slide`,
`music-cut`. `sound` is a name from the library's `sfx/` (search: `studio find <words>`) or a file in the project; leave it
empty when the music's own hit is the sound (the drop). Run `studio grid check "<Project>"` until it reports no problems.

Sounds, by the user's taste: varied tactile ones (clicks, taps, stamp, paper, shutter, pen); the same click for a row of
like things; whooshes rare and never on text; a cut can be a soft camera shutter.

**Step 4: the picture.** Build in HyperFrames (`~/Documents/Github/hyperframes-studio/projects/<name>`, 1080x1920,
render with `--fps 60`). Take every time from the grid: copy `build/grid.js` into the page and use `GRID.t(step)`,
`GRID.pos('3.1.1')` and `GRID.section('drop').step(n)`, or generate the page from `grid.json` and `cues.json` with a small
script. The worked example is `projects/grid-demo/gen.py`: it writes the page and the cue sheet from one list, so they
cannot drift apart.

Two things that cost a frame if forgotten:
- A time rounded up lands one frame late (13.066667 s is after frame 784). Use `GRID.t`, which sits a hair before the
  frame, or round down.
- An entrance may ease out after the hit, but it must start on it, with most of the change in the first frame or two.

**Step 5: the sound.** `studio grid mix "<Project>"` (add `--music music/<file>` for a track made elsewhere) writes
`music/grid-mix.wav`: the music plus each cue's sound starting on its exact frame, nothing in the silence, about
-14 LUFS with peaks near -1.5 dB. Copy it into the HyperFrames project's `assets/audio/` as one `<audio>` clip from 0.
It warns when a sound is longer than a bar. Re-run it after any change to the cues.

**Step 6: check the file.** `npx hyperframes check --json`, stills at the key moments, then on the rendered MP4: frame
count equals the plan's, and the cuts sit on the planned frames:

```bash
ffmpeg -i out.mp4 -vf "select='gt(scene,0.1)',metadata=print:file=-" -an -f null - 2>/dev/null | grep pts_time
```

(times x fps should be multiples of the sixteenth), then `resolve-assist delivery-check out.mp4`.

**Step 7: notes.** The first version takes minutes; the video is made in the notes. Change only what was asked, keep
every version (`exports/<name>-v2-9x16.mp4`), and re-run check and mix after each change.

## The prompt this replaces

The guide's start prompt, in studio terms, for when the user wants to paste one:

```
cutroom beat grid. A 9:16 motion video, 1080x1920, 60 fps, HyperFrames.
What: [one line]   For: [who watches]   Feeling: [three words]
Brand: colours [HEX], fonts [names], no logo unless I give one.
Music first: show me the section plan and the scene list on the grid, and wait for my OK.
```

## Where things are

| Thing | Place |
|---|---|
| The tool | `studio grid tempos|plan|track|hits|check|mix` (same as `resolve-assist grid`; MCP tool `beat_grid`) |
| Its code | `~/Documents/Github/resolve-assist/src/resolve_assist/beatgrid.py` |
| A project's grid files | `~/Documents/resolve-assist/projects/<Project>/build/` and `music/` |
| Worked example | `~/Documents/Github/hyperframes-studio/projects/grid-demo` (project "Grid Demo") |
| Sound library | `~/Documents/resolve-assist/library/sfx` |
| ElevenLabs | Not connected yet. The user adds it: `claude mcp add --transport http elevenlabs https://api.elevenlabs.io/v1/mcp`, then `/mcp` to sign in. Every generation costs credits |
