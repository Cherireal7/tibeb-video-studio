# The beat grid: why the videos feel tight

The music is planned first. The picture is then placed on the music's grid, never the other way round.

## The idea

At 60 frames a second, some tempos make one sixteenth note a whole number of frames:

| Tempo | Sixteenth | Beat | Bar |
|---|---|---|---|
| 90 bpm | 10 frames | 40 | 160 |
| 100 bpm | 9 frames | 36 | 144 |
| 112.5 bpm | 8 frames | 32 | 128 |
| 150 bpm | 6 frames | 24 | 96 |

On such a tempo every cut, word and sound can sit on a frame that is also a hit in the music.

## The rules

1. Music first: sections with exact lengths, one per act.
2. Everything that moves starts on a hit you can hear.
3. One gesture at a time: the text, then the effect, then the cut.
4. At most four words on screen.
5. If the music is cut, cut it at the end of a bar.
6. One beat of silence before the big moment.
7. On the drop, one cut per hit, never a still frame.
8. One sound per gesture, with an instant attack.
9. Text stays out of the top and bottom 190 px.

## The commands

```
studio grid tempos --fps 60
studio grid plan "Project" --sections intro=pluck:3,sites=groove:4,spin:2,drop:2,outro:2
studio grid track "Project"
studio grid check "Project"
studio grid mix "Project"
```

`plan` writes the section table, a music plan and a starter cue sheet into the project's `build/`. `track` makes a
free percussion track on the exact frames. `check` tests the cue sheet against the rules and names a fix for each
problem. `mix` puts one sound per cue on its frame at about -14 LUFS.

Section kinds: `intro` (drum on every beat), `pluck` (a plucked string on every beat, no drums), `groove`, `spin`,
`drop`, `outro`, `pulse`, `silence`.

The method comes from Luca Radez's guide "The Motion Setup"; the tool is this studio's own.
