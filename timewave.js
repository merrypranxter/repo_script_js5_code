const output = [];
const motifs = ['♦', '◊', '▲', '▼', '🍄', '🍄', '✨', '🌀', '∫', '≈', '∆', '☼', '☾', '★', '❁', '💎', '🔮'];
const waveChars = ['.', '-', '~', ':', '=', '+', '*', 'x', 'X', '§', '#', '@', 'W', 'M'];

// Approximate grid-to-pixel mapping
const cellW = 10;
const cellH = 16;

// Singularity point (concrescence) follows mouse, or centers if undefined
const mx = mouse.x || (grid.cols * cellW / 2);
const my = mouse.y || (grid.rows * cellH / 2);

// Time accelerates if mouse is pressed, mimicking the approach to Timewave Zero
const t = time * (mouse.isPressed ? 3 : 1);

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  const py = y * cellH;
  const dy = py - my;
  const dy2 = dy * dy;
  
  for (let x = 0; x < grid.cols; x++) {
    const px = x * cellW;
    const dx = px - mx;
    
    const dist = Math.sqrt(dx*dx + dy2);
    const angle = Math.atan2(dy, dx);
    
    // --- TIMEWAVE ZERO CALCULATION ---
    // Novelty theory: fractal wave converging to infinite complexity at the singularity
    let timewave = 0;
    let noveltyFactor = Math.max(0.1, 150 / (dist + 5)); // Higher novelty closer to center
    
    for (let i = 1; i <= 5; i++) {
       // Golden ratio frequencies for the fractal wave
       const freq = Math.pow(1.618, i) * 0.04; 
       const amp = 1 / Math.pow(1.618, i);
       // Wave combines radial distance, angular spiral, and time multiplied by novelty
       timewave += Math.sin((dist * freq) + (angle * i) - (t * i * noveltyFactor * 0.15)) * amp;
    }
    
    // Normalize timewave from roughly [-1.5, 1.5] to [0, 1]
    const v = Math.max(0, Math.min(1, (timewave + 1.5) / 3.0));
    
    // --- PSYCHEDELIC POP COLOR LOGIC ---
    let hue = (dist * 0.6 - t * 45 + angle * 57.29 + timewave * 120) % 360;
    if (hue < 0) hue += 360; // Ensure positive hue
    
    const saturation = 80 + 20 * Math.sin(t * 0.5 + dist * 0.05);
    const lightness = 50 + 25 * Math.cos(t * 0.8 + timewave * 3);
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // --- DYNAMIC SIZING ---
    // Breathes with the wave, gets massively distorted at the singularity
    let size = 8 + 16 * v + (40 / (1 + dist * 0.02));
    if (mouse.isPressed) size += Math.random() * 6; // Jitter on click
    
    // --- CHARACTER SELECTION (MINERALS & FUNGI) ---
    let char;
    // At high novelty (peaks of the wave or extremely close to singularity), spawn mushrooms and minerals
    if (v > 0.82 || (dist < 30 && Math.random() < 0.3)) {
      const motifIndex = Math.abs((x * 7 + y * 11 + Math.floor(t * 3))) % motifs.length;
      char = motifs[motifIndex];
      size *= 1.25;
    } else {
      let charIndex = Math.floor(v * waveChars.length);
      charIndex = Math.max(0, Math.min(waveChars.length - 1, charIndex));
      char = waveChars[charIndex];
    }
    
    row.push({ char, color, size });
  }
  output.push(row);
}

return output;