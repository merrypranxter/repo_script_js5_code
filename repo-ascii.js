const output = [];
const chars = " .·-~*+=¤oO8@#█";

const centerX = grid.cols / 2;
const centerY = grid.rows / 2;

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const dxMouse = (x * 10) - mouse.x;
    const dyMouse = (y * 15) - mouse.y;
    const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse) + 0.001;
    
    // REPO 1: op_art_style (funnel_tunnel_lens_forms & chromatic_interference)
    const lensRadius = 200;
    const lensEffect = distMouse < lensRadius 
      ? (Math.cos(distMouse * Math.PI / lensRadius) + 1) / 2 
      : 0;
      
    const pullX = mouse.isPressed ? -1 : 1;
    const px = x + (dxMouse / distMouse) * lensEffect * 12 * pullX;
    const py = y + (dyMouse / distMouse) * lensEffect * 12 * pullX;

    const dxCenter = px - centerX;
    const dyCenter = py - centerY;
    const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
    const angleCenter = Math.atan2(dyCenter, dxCenter);

    // REPO 1: radial_hypnosis_fields
    const opArtMoire = Math.sin(distCenter * 0.6 - time * 4 + angleCenter * 8);

    // REPO 2: art_nouveau_style (flowing organic lines & motifs)
    const nouveauVine = Math.sin(px * 0.25 + Math.cos(py * 0.2 + time * 1.5));

    // REPO 3: ghost-erowid-cosmology (GLSL-style phenomenology thresholds)
    const erowidThreshold = Math.max(0, 1 - (distMouse / (mouse.isPressed ? 300 : 150)));
    const entityGeometry = Math.cos(distCenter * 0.15 + time) * Math.sin(angleCenter * 4 - time);

    // Combine for optical surrealism
    let val = (opArtMoire + nouveauVine + entityGeometry) / 3;
    val = Math.max(-1, Math.min(1, val));

    let charIdx = Math.floor(((val + 1) / 2) * chars.length);
    charIdx = Math.max(0, Math.min(chars.length - 1, charIdx));
    let char = chars[charIdx];

    // REPO 1: eye_object_iconography insertion near thresholds
    if (Math.abs(val) < 0.05 && distMouse < 100) char = '👁';

    // REPO 4: psychedelic_pop_style (groovy color logic & celestial palettes)
    let hue, sat, lit;
    if (mouse.isPressed) {
      // High-contrast BW retinal op / deep erowid cosmology
      hue = val > 0 ? 280 : 140; // Deep Purple or Neon Green
      sat = 90;
      lit = (Math.sin(distMouse * 0.2 - time * 8) > 0) ? 80 : 15;
    } else {
      // Cute groovy psychedelic pop
      hue = (angleCenter * 180 / Math.PI + time * 80 - distCenter * 3) % 360;
      if (hue < 0) hue += 360;
      sat = 85 + 15 * Math.sin(distCenter * 0.1);
      lit = 55 + 20 * Math.cos(time * 2 + angleCenter * 3);
    }

    const color = `hsl(${hue}, ${sat}%, ${lit}%)`;
    
    // Dynamic typographic scale for 3D funnel effect
    const size = 10 + (erowidThreshold * 25) + (val * 6);

    row.push({ char, color, size: Math.max(4, size) });
  }
  output.push(row);
}
return output;