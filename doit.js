const output = [];
const opChars = " .:-=+*#%@".split('');
const glitchChars = "█▓▒░><\\/![]{}?-".split('');
const colors = ["#ff00ff", "#00ffff", "#00ff00", "#ffff00", "#ffffff", "#ff0000"];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  
  const tear = Math.sin(y * 0.4 + time * 15) > 0.9 ? Math.floor(Math.sin(time * 25) * 10) : 0;
  
  for (let x = 0; x < grid.cols; x++) {
    let readX = x + tear;
    let readY = y;
    
    const px = readX * 10;
    const py = readY * 20; 
    const mx = mouse.x;
    const my = mouse.y;
    
    const dx = px - mx;
    const dy = py - my;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    
    const rings = Math.sin(dist * 0.08 - time * 5);
    const spiral = Math.cos(angle * 10 + dist * 0.04 + time * 4);
    const moire = rings * spiral;
    
    const localGlitch = Math.random() < 0.005;
    const clickGlitch = mouse.isPressed && dist < 150 && Math.random() < 0.4;
    const isGlitch = tear !== 0 || localGlitch || clickGlitch;
    
    let char = '';
    let color = '';
    let size = 12;
    
    if (isGlitch) {
        char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        color = colors[Math.floor(Math.random() * colors.length)];
        size = 12 + Math.random() * 10;
    } else {
        const normalized = (moire + 1) / 2; 
        const charIdx = Math.floor(normalized * (opChars.length - 1));
        char = opChars[charIdx];
        
        const r = Math.sin(dist * 0.02 + time) > 0;
        const g = Math.cos(angle * 6 - time) > 0;
        const b = Math.sin(dist * 0.06 - angle) > 0;
        
        color = `rgb(${r ? 255 : 0}, ${g ? 255 : 0}, ${b ? 255 : 0})`;
        if (color === 'rgb(0, 0, 0)') color = '#111122'; 
        
        size = 10 + normalized * 8 + (mouse.isPressed ? 6 : 0);
    }

    const banner1 = " x_x DEAD WEB OP-ART x_x ";
    if (y === Math.floor(grid.rows * 0.15) && !isGlitch) {
        const shiftX = Math.floor(x - time * 10) % banner1.length;
        char = banner1[(shiftX + banner1.length) % banner1.length];
        color = '#ff00ff';
        size = 16;
    }

    const banner2 = " ~*~ MYSPACE GLITCHCORE ~*~ ";
    if (y === Math.floor(grid.rows * 0.85) && !isGlitch) {
        const shiftX = Math.floor(x + time * 14) % banner2.length;
        char = banner2[(shiftX + banner2.length) % banner2.length];
        color = '#00ffff';
        size = 16;
    }

    row.push({ char, color, size });
  }
  output.push(row);
}
return output;