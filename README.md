# JS5 Player

A browser-based ASCII/canvas animation viewer. Each `.js` script in this repo is a self-contained animation that runs inside `index.html`.

---

## How to open it

Because the viewer fetches script files over HTTP, you **cannot** just double-click `index.html` — browsers block local file requests. You need a simple local web server.

### Option A — Python (no install needed)

```bash
# Python 3
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

### Option B — Node.js (`npx`)

```bash
npx serve .
```

Then open the URL it prints (usually **http://localhost:3000**).

### Option C — VS Code Live Server extension

1. Install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**.

---

## Using the viewer

Once it's open you'll see a fullscreen animated canvas with a small cyan control panel in the bottom-left corner.

| Control | What it does |
|---|---|
| **≡ BROWSE** tab | Shows the full list of scripts — click any name to play it. |
| **⇄ RANDOM** tab | Auto-cycles through scripts on a timer. |
| **◀ PREV / NEXT ▶** buttons | Step through scripts one at a time. |
| **every 5s / 15s / 30s** buttons | Change the auto-cycle interval in Random mode. |
| **− / +** (panel header) | Collapse or expand the control panel. |
| **Drag** the panel header | Move the control panel anywhere on screen. |
| **Mouse move** | Many animations react to cursor position. |
| **Click & hold** on the canvas | Triggers extra effects in some animations. |
| **Touch** | Works on phones/tablets too. |

---

## The scripts

All available animations are listed in `scripts.json`. The individual `.js` files (e.g. `dmt.js`, `cthulhu.js`, `slime-party.js`, etc.) each export a frame function that receives a grid, a time value, and the mouse state, then returns an array of character cells to render.

To add a new animation, drop a `.js` file in the repo root and add its filename to `scripts.json`.

