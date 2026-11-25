# Make a video from a prompt

## Before you press Make

- **Put the material in the project first.** The agent uses what it finds: logos in `stills/`, background photos in
  `stills/bg/`, clips in `inbox/`, facts in `docs/`. An empty project gives a video of words on colour.
- **Write the brief like a person, not a spec.** What it is, who it is for, the feeling in three words, and the
  facts that may appear on screen. The presets show the shape.
- **Name what must be true.** Numbers, names and claims come only from what you give or from the pages you point to.

## What happens during a run

1. The agent reads the project and the house rules (the `cutroom` skill and its `style.md`).
2. It plans the sound first on a beat grid, then writes the scenes.
3. It builds the picture as code (HyperFrames), looks at stills, fixes what is clipped or empty, renders.
4. It mixes the sound, checks the file, and copies it to the project's `exports/`.

The log shows every step. **Stop** ends the run; what was already written stays in the project.

## Giving notes

With Claude Code, "Send as notes on this version" continues the same conversation, so it remembers what it built.
With Codex each run starts fresh: use the "Notes on the last video" preset, which tells it to read the newest export.

Good notes name one thing each: "the second name comes in late", "swap the box picture for the tote", "no stamp on
the first scene". The agent is told to change only what you name.

## When it goes wrong

| What you see | What to do |
|---|---|
| "is not signed in" | Open a terminal, run the agent once and sign in, then press Check again in Setup |
| It finishes with no video | Read its last message; usually a file was missing from the project |
| Text cut off at the edge, or hidden by app buttons | Say so in a note; ask it to keep text between 190 px from the top and bottom |
| Picture and sound feel off | Ask for gestures "on the straight hits" and sounds "with an instant attack" |
| "waiting · no connection" in the log | The agent retries by itself. Check the internet; the app keeps the Mac awake during a run, but a closed lid still sleeps it |
| It runs past 40 minutes | Stop it, shorten the request, and try again |
