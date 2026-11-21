# Tibeb

One window for making short videos: projects, the asset library, and (planned) create, edit, record,
hand-off. Tibeb (ጥበብ) means craft. Plans: [PLAN.md](PLAN.md) · [INTERCHANGE.md](INTERCHANGE.md).

Status: **M1 in progress.** Working today: Projects (create, open, drop files to sort and index them),
Library (search, listen, preview, add to a project's kit), Setup (checks with fixes, editor choice).
Create (M2, first version): pick a Motion Studio template, fill in a form generated from its schema, render
into a project with progress; the config is saved in `renders/` so it can be rendered again.
Everything else in the sidebar is marked "soon".

## Run

```bash
npm install
npm start            # builds and opens the app
npm test             # path safety and project store tests
npm run shots        # saves a picture of every screen to docs/app/ (used to check the UI)
node_modules/.bin/electron . --render-test="App Test"   # renders one template through the app, prints OK/FAILED
```

It needs the engine next to it: [resolve-assist](../resolve-assist) with its `.venv` (see that README),
and reads the same workspace (`~/Documents/resolve-assist` unless `~/.config/studio/config` says otherwise).

## How it is built

```
src/main/      Electron main process: paths.ts (workspace + path guard), store.ts (projects, library),
               engine.ts (runs the engine CLI, JSON out), main.ts (window, IPC, media:// protocol), preload.ts
src/renderer/  React screens: Projects, Project, Library, Setup
design/        mock-ups and diagrams rendered to docs/ with Remotion
```

Rules it keeps: the page has no Node access (context isolation, sandbox); it can only call the fixed list
in `preload.ts`; every file read or served is checked to be inside the workspace; the engine is started
with an argument array, never a shell string; no network access from the page.

Licence: MIT for this repo. The planned editor depends on Remotion, which has its own licence
(free for individuals and teams of up to 3).
