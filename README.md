# repo_script_js5_code

A growing collection of ASCII/Unicode art animations saved from my reposcript apps, with a browser player to browse and play them.

---

## Running the player

The player (`index.html`) fetches files at runtime, so it **must be served over HTTP** — double-clicking the file won't work. Pick any of these:

### Python (easiest — already installed on most machines)

```bash
cd repo_script_js5_code
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

### Node.js

```bash
cd repo_script_js5_code
npx serve .
```

Then open the URL it prints (usually **http://localhost:3000**).

### VS Code

Install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

---

## Using the player

A floating control panel sits in the corner of the fullscreen animation canvas. It's draggable — grab the `◉ JS5 PLAYER` header and move it anywhere. Click `−` to collapse it down to just the title bar, `+` to expand again.

### BROWSE mode

The default. Scroll through the list and click any script to switch to it instantly. The currently playing script is highlighted.

Use **◀ PREV** and **NEXT ▶** to step through one at a time.

### RANDOM mode

Click **⇄ RANDOM** to enable. Scripts will auto-cycle with a countdown progress bar showing when the next one is coming. Choose your interval — **5s**, **15s**, or **30s** — with the buttons below the bar. PREV/NEXT still work in random mode and reset the timer.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` or `↑` | Previous script |
| `→` or `↓` | Next script |
| `Space` | Jump to a random script |
| `R` | Toggle random mode on/off |

### Mouse interaction

Most scripts react to your mouse — move it around the canvas to warp and distort the animation. Click and hold for extra effects (explosions, mode shifts, etc.).

---

## Adding new scripts

Just commit your new `.js` file — a git pre-commit hook automatically updates `scripts.json` (the manifest the player reads) every time you commit. Reload the page and your new script appears in the list.

```bash
git add my-new-script.js
git commit -m "Add my-new-script"
# scripts.json is updated automatically by the pre-commit hook
```

The hook requires either `node` or `python3` to be available (one of them almost certainly is).

---

## File overview

| File | What it is |
|------|------------|
| `index.html` | The player — canvas renderer + floating UI panel |
| `scripts.json` | Auto-generated list of all `.js` scripts (don't edit by hand) |
| `*.js` | The art scripts |
| `inspo/` | Separate experiments, not loaded by the player |
