const output = [];
const cw = 10; // Approx character width
const ch = 20; // Approx character height

// Mouse coordinates mapped to grid
let mx = mouse.x / cw;
let my = mouse.y / ch;

// If mouse is idle, simulate a wandering singularity (Concrescence Point)
if (mouse.x === 0 && mouse.y === 0) {
    mx = grid.cols / 2 + Math.sin(time) * 15;
    my = grid.rows / 2 + Math.cos(time * 0.8) * 10;
}

// Psychedelic Pop Art Palette
const colors = ['#FF0099', '#00FFCC', '#FFFF00', '#CC00FF', '#FF6600', '#33FF00', '#00FFFF'];
const syms = "∞∆∇⚗☼☽☿♀⊕♁♂♃♄♅♆♇";
const popDots = " .oO●";

// McKenna Corpus + Fungi + Minerals
const textStr = " NOVELTY CONCRESCENCE TIMEWAVE ZERO ESCHATON MALACHITE FLUORITE AGARICOMYCETES CELESTIAL CLOUDS SMOKE POP MUSHROOM ".split("");

// Precalculate time modifiers for optimization
const t1 = time;
const t2 = time * 2;
const t3 = time * 3;
const t4 = time * 4;
const t15 = Math.floor(time * 15);

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  const y01 = y * 0.1;
  const sinY = Math.sin(y01 + t1) * 2;

  for (let x = 0; x < grid.cols; x++) {
    const dx = x - mx;
    const dy = y - my;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Distorted coordinates for organic psychedelic/fungal feel
    const nx = x + sinY;
    const ny = y + Math.cos(x * 0.1 - t1) * 2;

    // Fractal Timewave (Novelty Theory)
    // Decreasing amplitude, increasing frequency
    const wave = Math.sin(nx * 0.12 + t1) * Math.cos(ny * 0.12 - t1) +
                 (Math.sin(nx * 0.24 + t2) * Math.cos(ny * 0.24 - t2)) * 0.5 +
                 (Math.sin(nx * 0.36 + t3) * Math.cos(ny * 0.36 - t3)) * 0.333;
    
    // Spiral concrescence pulling towards the singularity
    const angle = Math.atan2(dy, dx);
    const spiral = Math.sin(angle * 7 + dist * 0.4 - t4);
    
    // Fungal Spore Cloud interference
    const fungal = Math.sin(x * 0.3 + t1) * Math.cos(y * 0.3 - t1);
    
    // Total Novelty calculation
    let novelty = wave + spiral + fungal * 0.5 + (15 / (dist + 0.5));
    
    // Pressing the mouse accelerates concrescence
    if (mouse.isPressed) novelty *= 1.8;
    
    // Pop Art Color Banding
    const bandedNovelty = Math.floor(Math.abs(novelty * 3)) % colors.length;
    let color = colors[bandedNovelty];
    
    let char = " ";
    let size = 12;
    
    if (novelty > 2.5) {
      // The Eschaton / High Novelty: Reveal the corpus
      char = textStr[(x + y * grid.cols + t15) % textStr.length];
      size = 14 + novelty * 2;
      color = "#FFFFFF"; // Flash pure white at the edge of time
    } else if (novelty > 1.2) {
      // Celestial Motifs & Crystalline Mineral Structures
      char = syms[(x * y + Math.floor(t2)) % syms.length];
      size = 12 + novelty;
    } else if (novelty > 0.2) {
      // Ben-Day Dots (Pop Art)
      const dotIdx = Math.floor(Math.abs(novelty * 4)) % popDots.length;
      char = popDots[dotIdx];
      size = 10 + dotIdx;
    } else {
      // Habit / Low Novelty
      char = "·";
      color = '#3a005c'; // Deep psychedelic purple
      size = 10;
    }
    
    // Clamp size to prevent rendering explosions
    size = size > 32 ? 32 : (size < 8 ? 8 : size);
    
    row.push({ char, color, size });
  }
  output.push(row);
}

return output;