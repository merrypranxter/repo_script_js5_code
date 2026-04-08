const output = [];
const txt = " 0101_GLITCH_Y2K_OP-ART_WWW.MYSPACE.COM_<>_ ";
const glitchChars = "█▓▒░‼æø×§¶‡†";
const y2kColors = ['#ff00ff', '#00ffff', '#39ff14', '#ffffff', '#ff0000'];

// Assume cell size is roughly 12px based on standard sandbox
const mx = mouse.x / 12;
const my = mouse.y / 12;

// Center of the optical tunnel follows mouse, or defaults to screen center
const targetX = (mouse.x !== 0 || mouse.y !== 0) ? mx : grid.cols / 2;
const targetY = (mouse.x !== 0 || mouse.y !== 0) ? my : grid.rows / 2;

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    // Spatial calculations for Op Art retinal fields
    const dx = x - targetX;
    const dy = (y - targetY) * 2.0; // Aspect ratio correction
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Moire, Phase Fields, and Tunnels (Op Art Repo)
    const tunnel = Math.sin(dist * 0.4 - time * 6);
    const spiral = Math.cos(angle * 8 + dist * 0.15 + time * 4);
    const interference = Math.sin(x * 0.3 + time * 2) * Math.cos(y * 0.3 - time * 2);
    
    // VARY THE FONT SIZES - Dramatic scale shifting for optical illusion
    let sizeMod = (tunnel * 8) + (spiral * 6) + (interference * 4);
    
    // Glitchcore Signal Density System (Glitchcore Repo)
    const isGlitch = Math.random() < 0.03 && Math.sin(time * 20 + y * 0.5) > 0.3;
    if (isGlitch) {
        sizeMod += (Math.random() * 16 - 8);
    }

    // Interactive sizing (Early Internet / Myspace cursor interaction)
    let baseSize = mouse.isPressed ? 20 : 14;
    if (mouse.isPressed) sizeMod *= 1.5;
    
    let size = Math.max(4, Math.min(64, baseSize + sizeMod));
    
    // Palette Energy System
    let color = '#ffffff';
    let char = ' ';
    
    if (isGlitch) {
        color = y2kColors[Math.floor(Math.random() * y2kColors.length)];
        char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
    } else {
        // Classic B&W Retinal Op with Y2K Cyan/Magenta bleeding
        const band = Math.sin(dist * 0.6 - time * 5 + angle * 2);
        
        if (band > 0.6) color = '#050505'; // Deep void
        else if (band > 0.2) color = '#333333';
        else if (band > -0.2) color = '#888888';
        else if (band > -0.6) color = '#dddddd';
        else color = '#ffffff'; // Blinding light
        
        // Dead Web Nostalgia color bleed
        if (color === '#ffffff' && Math.sin(dist * 0.2 - time) > 0.8) {
            color = '#00ffff';
        } else if (color === '#050505' && Math.cos(angle * 3 + time) > 0.9) {
            color = '#ff00ff';
        }

        // Textual mapping (Early Internet Aesthetic)
        const strIdx = Math.floor(Math.abs(angle * 5 + dist * 0.5 - time * 10)) % txt.length;
        char = txt[strIdx];
    }

    row.push({ char, color, size });
  }
  output.push(row);
}

return output;