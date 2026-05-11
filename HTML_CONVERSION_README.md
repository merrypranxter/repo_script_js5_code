# HTML Conversion README

This repository contains standalone HTML versions of every JS5 sketch.

## Browsing

Open `index.html` in a browser to see a gallery of all 149 sketches.
Click any link to open a sketch directly.

## Individual sketches

Open any `.html` file directly in a browser — no server required.

## HUD Controls

Each sketch shows a small control box in the upper-left corner:

| Control | Action |
|---------|--------|
| **H key** or **Hide button** | Removes the HUD completely. No button remains. Reload to restore. |
| **Save PNG** | Downloads the current canvas frame as `<name>.png` |
| **Reset** | Reinitialises sketch state and animation clock |

> Once hidden the only way to restore the HUD is to reload the page.
> This is intentional — so sketches can be used as clean video/image backgrounds.

## Canvas / Rendering

- Canvas always fills the full browser viewport.
- DPR scaling is applied (capped at 2× for performance).
- Canvas and grid dimensions update automatically on window resize.

## Sketch Types

| Tag | Meaning |
|-----|---------|
| **WebGL** | Three.js GLSL shader sketches (loads Three.js r160 from CDN) |
| **2D** | Canvas 2D context sketches |


