# House style: teach it your taste once

The `cutroom` skill reads a file called `style.md` at the start of every video. It is where your taste lives, so
the agent does not start from zero each time.

## Set it up

Copy `style.example.md` to `style.md` in the cutroom skill folder (`~/.claude/skills/cutroom/`) and fill it in.
Keep it short and dated:

```
## Look
- 2026-11-25: photo backgrounds, not flat colour fields. Text in deep ink, the key word in cream.

## Sound
- 2026-11-21: varied tactile sounds (clicks, taps, stamp). Whooshes are rare and never on text.
```

## What belongs in it

- Shape and count (for example: one vertical 9:16 video per request).
- The credit line, if any (also set `credit=` in `~/.config/studio/config`).
- Looks you loved, with the video they came from. Looks you rejected, in your own words.
- Pace, captions, sound.
- Components you never want again, named plainly.

## How it grows

After each video, when something lands or something annoys you, tell the agent to add a dated line. Notes that
are only about one video do not belong here.

A team can share one `style.md`: keep it in a shared repo and link it into each person's skill folder.
