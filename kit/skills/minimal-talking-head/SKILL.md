---
name: minimal-talking-head
description: Edit a talking-head clip into a premium minimal short (cinematic two-font captions, paper textures, line/graph/illustration scenes, quiet sound design) with the local studio tools - resolve-assist edit_prep/edit_plan and the Motion Studio MinimalStory template. Use when the user asks for a "minimal edit", "premium/clean talking head edit", "cinematic captions", "edit this clip in the minimal style", "plan the edit for this clip", or wants to teach Claude a new editing style from reference videos. No Higgsfield or paid tools needed.
---

# Minimal talking-head edit

A clean, premium, educational short-form style: the speaker, a few restrained animated scenes, textured
paper, two typefaces. Everything runs locally: resolve-assist (prep, plan, sound) + Motion Studio
(`MinimalStory` template, Remotion). Vertical 9:16.

Treat this as a style kit. Never copy a specific creator's footage, likeness, name or exact designs.

## The 10 scene types

Ids are the `MinimalStory` scene types (fields: `~/Documents/Github/motion-studio/README.md`).

| # | id | What it is | Use it when |
|---|---|---|---|
| 1 | `aroll` | Speaker on screen + cinematic captions | A new idea or type is announced; the viewer needs the face |
| 2 | `broll` | Clip that shows what is said; light paper texture, darkened and slightly blurred edges; text on top | An action or situation is described |
| 3 | `painting` | A painting with paint/rough paper texture, text around its subject, quick camera slide-in | Stories, philosophy, a human moment |
| 4 | `line-text` | Paper background (black or white); an accent-blue line draws, is interrupted by text, continues to the next text; camera follows the line | A chain of related ideas (the big point) |
| 5 | `line-illustration` | Same line leading to illustrations: horizontal with a dot marker + label, or zigzag revealing items left and right | Progression through phases, steps |
| 6 | `quote` | White or blue rough paper, two quotation marks, centred text | The line to remember; the ending |
| 7 | `center-illustration` | Abstract illustration in the lower half bleeding upward, rough noisy texture, text in the free space | The main idea of the script |
| 8 | `side-illustration` | Illustration on one side (e.g. half circle with text along the arc), text on the other | Two elements at once |
| 9 | `object-callout` | One element or person with text around it, rough reveal | A concrete example, "my dad…" |
| 10 | `graph` | Flat dark textured background, thin glowing grid, a blue ball draws the line, camera follows | Numbers, "up and up", "slow and steady" |

## Cinematic captions (the core of the look)

- Two typefaces: a plain sans for most words (`inter`), a serif italic for special words (`playfair` italic).
- One line at a time, **five words or fewer**.
- Pick the most important word(s) in the line: make them big and bold (bold sans or bold serif italic), centred.
- Put the remaining words small in the gaps above or below. No fixed pattern; it should read in speaking order.
- The same logic is used for text inside every other scene type.

## Shared look

- Paper texture on everything; textures move with the layer they belong to (a texture that stays still
  while its layer moves looks wrong).
- Small palette: off-white paper, near-black, one accent blue. Thin lines. Rough, abstract edges on illustrations.
- Animations are short reveals (line draw, slide-in, rough wipe). No rough cuts between two animations:
  let one finish, or bridge with a short slide.

## Workflow

1. **Prep** (`edit_prep`, or `resolve-assist prep <video> <project>`): word-by-word transcript, silences cut
   with 30 ms padding, tightened clip, script segments. Works without Resolve.
2. **Plan** (`edit_plan` with recommendations): recommend 1-3 scene types per segment, then give the user the
   planning page (clip + script on the right, scene choice + notes on the left). The user decides; do not
   skip this. The plan decides the quality of the edit more than the animations do.
   - Open on `aroll` so the viewer connects with the speaker before anything animates.
   - Announce on the face, describe with a visual. Return to `aroll` at each new idea.
   - Make the first visual a strong one (it is the hook). Balance: do not stack similar scenes.
   - Give a scene enough screen time to be read; end on `quote` or the speaker.
3. **Assets**: list every asset first. Use the library and the user's footage first. Paintings: public-domain
   works only (check the licence on the file page, e.g. Wikimedia Commons). Stock clips: sources whose
   licence allows the use (e.g. Pexels), noted in the project's `LICENSES.txt`. Images of real people need
   the user's OK. Ask when something cannot be found instead of substituting silently.
4. **Build**: a `MinimalStory` config in Motion Studio from the pasted plan, captions first, then scene by
   scene. Render and look at frames from every scene before showing it.
5. **Revise**: the first render is roughly 60-70 % there. Ask for specific notes (text design, rough cuts,
   texture weight, scene length, missing elements) and apply them; repeat until the user says it is done.
6. **Sound design last**, only after the picture is approved: one calm music bed, quiet and **varied** SFX
   under it. Do not put a whoosh on everything: text → clicks and taps (`click-soft`, `tap-wood`,
   `pencil-tick`, `typewriter-key`), pictures → `paper-slide`, `tape-stick`, stamps → `stamp-thunk`,
   highlights and lines → `marker-stroke`, `pen-scribble`, pins and lists → `pluck-accent`, endings →
   `bell-tiny`; at most an occasional `swipe-short` on a scene change. Never the same sound twice in a
   row (Motion Studio: `sfxPicker()` in `src/theme/sfx.ts`). Music carries; SFX stay low; final mix at -14 LUFS.

Typical time for a 60 s clip: prep and plan page ~15 min, the user's planning ~15 min, build ~60 min,
revisions ~10 min, sound ~15 min.

## Teaching Claude another style

1. Collect ~20 of the best videos in that style (the user provides them).
2. For each: word-by-word transcript and a frame-by-frame breakdown. Study three things: where animations
   sit relative to the script, how each design is composed (fonts, colours, sizes, textures, layout), and
   the animation logic (durations, easing, feel).
3. Group the good scenes into recurring scene types; for each type write down what it is made of and when
   it is used. A board of screenshots sorted by type (Figma or a folder) is the design reference.
4. Save it as a skill like this one (scene types, rules, sound map) plus a reference folder of frames, and
   add the scene types to a Motion Studio template so the style can be rebuilt from a plan.

Other styles named in the same source and worth their own kits: cinematic short film, SaaS motion design,
plain talking head, bold business-explainer and Vox-style documentary (see the `vox-motion-graphics` skill).
