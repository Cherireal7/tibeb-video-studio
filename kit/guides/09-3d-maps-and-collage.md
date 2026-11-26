# 3D, maps and paper collage

Four ways to go beyond flat graphics, each tried on a short test on 2026-11-26. All four run on the laptop and cost nothing.

## Which one to reach for

| You want | Use | What the test showed |
|---|---|---|
| A real 3D scene with a moving camera, depth of field and soft shadows | three.js through the `3d-animator` skill (extras) and the `threejs-*` skills | A 10 second temple with fog, dust and falling petals rendered in under a minute |
| A product that looks filmed in a studio | Blender, run without opening it (`saas-animation`, extras) | A 5 second metal wordmark took about 10 minutes; use it only when the look needs it |
| A map that zooms from a continent to a town | `map-animation` | Keep the camera smooth and move pins, routes and labels at 12 frames a second |
| An editorial paper-cutout piece | Cutouts on flat colour fields and textured paper, built in HyperFrames | Works from a folder of cutout pictures and a voice file; no image generator needed |
| Headlines that move well, and charts | `kinetic-typography`, `chart-animation` | Lines wipe up from a mask; bars grow with their counters |

## What we learned

- **A photograph beats a black background.** Put a blurred photo on a far plane behind a 3D scene: the camera move
  gives it real parallax. Blur it, or details in the photo will look the wrong size.
- **Three.js light is physical.** Start lights low; the first render is usually blown out.
- **Blender needs light on the front.** A metal object in a black room shows nothing; give it one large soft light it
  can reflect.
- **Stutter only the graphics.** Twelve frames a second on pins and cutouts reads as style; on the camera it reads as
  dropped frames.
- **Check that a map picture is sharp enough** for the closest zoom before building the move.
- **One sound palette per video.** Paper and tape sounds for collage, glass for night scenes, plucks for music.
- **Numbers on screen must be measured or sourced.** If a figure is an estimate, say so in the notes.

## Setting up

- Blender: `brew install --cask blender`. Mesh building also needs `numpy` and `scipy` in a small Python environment.
- three.js: the 3D kit installs it per project with `PUPPETEER_SKIP_DOWNLOAD=1 npm install`, using the Chrome already
  on the Mac (`CHROME_PATH`).
- The skills in `kit/skills/` are installed by `scripts/install.sh`. The ones without an open licence come in the
  extras zip (see `extras.README.md`).
