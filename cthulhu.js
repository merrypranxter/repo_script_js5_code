const cx = Math.floor(grid.cols / 2);
const cy = Math.floor(grid.rows / 2);
const output = [];

const mx = mouse.x / 12;
const my = mouse.y / 12;

const text1 = "OS.LOVECRAFT // v0.9.3_BETA";
const text2 = "PROCESS: CTHULHU_POP.EXE";

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    
    // -- PSYCHEDELIC OS BACKGROUND --
    const spiral = Math.sin(angle * 6 + dist * 0.25 - time * 3);
    const bgHue = (dist * 4 - time * 40 + angle * 180 / Math.PI) % 360;
    const isMatrix = Math.random() < (0.02 + (spiral > 0.8 ? 0.1 : 0));
    
    const osChars = "01AZATHOTH!@#%&*+?";
    let bgChar = isMatrix ? osChars[Math.floor(Math.random() * osChars.length)] : (spiral > 0.5 ? '~' : '.');
    
    let color = `hsl(${bgHue}, 90%, ${spiral > 0.5 ? 60 : 20}%)`;
    let char = bgChar;
    let size = 10 + Math.sin(dist * 0.3 - time * 2) * 3;

    // -- HALO / SUNBURST --
    const haloDist = Math.sqrt(dx*dx + (y - (cy - 4))*(y - (cy - 4)));
    const rayAngle = Math.atan2(y - (cy - 4), dx);
    const rays = Math.sin(rayAngle * 12 - time * 2);

    if (haloDist < 18 && rays > 0.2) {
      char = rays > 0.8 ? '*' : '|';
      color = `hsl(${(time*50 + haloDist*10)%360}, 100%, 60%)`;
      size = 12 + rays * 4;
    }

    // -- CUTE CTHULHU --
    let isCthulhu = false;
    let cColor = '';
    let cChar = '';
    let cSize = 14;

    // Wings (Bat-like, flapping)
    const flap = Math.sin(time * 6) * 3;
    if (x < cx - 6 && x > cx - 25) {
      const wingYBase = cy - 2 + flap - (cx - 6 - x) * 0.5;
      const wingYTop = wingYBase - 5 + Math.sin(x * 0.8 + time * 10) * 2;
      if (y > wingYTop && y < wingYBase) {
        isCthulhu = true;
        cChar = '/';
        cColor = '#00ffff'; 
        if (Math.random() < 0.1) { cChar = '+'; cColor = '#ffffff'; }
      }
    }
    if (x > cx + 6 && x < cx + 25) {
      const wingYBase = cy - 2 + flap - (x - (cx + 6)) * 0.5;
      const wingYTop = wingYBase - 5 + Math.sin(x * 0.8 - time * 10) * 2;
      if (y > wingYTop && y < wingYBase) {
        isCthulhu = true;
        cChar = '\\';
        cColor = '#00ffff'; 
        if (Math.random() < 0.1) { cChar = '+'; cColor = '#ffffff'; }
      }
    }

    // Tentacles
    for (let t = -2; t <= 2; t++) {
      const baseX = cx + t * 4;
      const wave = Math.sin((y - cy) * 0.4 - time * 5 + t * 1.5) * (1.5 + Math.max(0, y - cy) * 0.1);
      if (y >= cy - 2 && y < cy + 18) {
        const width = Math.max(0.5, 2.5 - (y - cy) * 0.08);
        if (Math.abs(x - (baseX + wave)) < width) {
          isCthulhu = true;
          cChar = 'U';
          cColor = `hsl(${300 - (y - cy)*8 + time*30}, 100%, 60%)`;
          if (y % 2 === 0 && Math.abs(x - (baseX + wave)) < width * 0.5) {
            cChar = 'o';
            cColor = '#ffffff';
          }
        }
      }
    }

    // Head
    const headDy = y - (cy - 4);
    const headDist = Math.sqrt(dx*dx + (headDy*1.5)*(headDy*1.5)); 
    
    const eyeOffsetX = Math.max(-1.5, Math.min(1.5, (mx - cx) * 0.15));
    const eyeOffsetY = Math.max(-1.5, Math.min(1.5, (my - (cy - 5)) * 0.15));
    
    const eyeLDist = Math.sqrt(Math.pow(dx + 4, 2) + Math.pow(headDy + 1, 2));
    const eyeRDist = Math.sqrt(Math.pow(dx - 4, 2) + Math.pow(headDy + 1, 2));
    
    const pupilLDist = Math.sqrt(Math.pow(dx + 4 - eyeOffsetX, 2) + Math.pow(headDy + 1 - eyeOffsetY, 2));
    const pupilRDist = Math.sqrt(Math.pow(dx - 4 - eyeOffsetX, 2) + Math.pow(headDy + 1 - eyeOffsetY, 2));

    if (headDist < 10) {
      isCthulhu = true;
      const cChars = "WwM@&8#";
      const charIdx = Math.floor((Math.sin(dx*0.5 + headDy*0.5 + time*2) * 0.5 + 0.5) * cChars.length);
      cChar = cChars[charIdx % cChars.length];
      cColor = `hsl(${(y * 10 - time * 20) % 360}, 100%, 50%)`; 
      
      if (pupilLDist < 1.2 || pupilRDist < 1.2) {
        cChar = 'O';
        cColor = '#ffffff'; 
      } else if (eyeLDist < 3.5 || eyeRDist < 3.5) {
        cChar = '@';
        cColor = '#000000'; 
      }
    }

    // -- FINAL COMPOSITION --
    let finalChar = char;
    let finalColor = color;
    let finalSize = size;

    if (isCthulhu) {
      finalChar = cChar;
      finalColor = cColor;
      finalSize = cSize;
      
      const mDist = Math.sqrt(Math.pow(x * 12 - mouse.x, 2) + Math.pow(y * 12 - mouse.y, 2));
      const hoverSize = mDist < 40 && mouse.isPressed ? 6 : (mDist < 40 ? 3 : 0);
      finalSize += hoverSize;
    }

    // Memory dump (OS Elements)
    if (x > grid.cols - 13 && y >= 2 && y < grid.rows - 2 && !isCthulhu) {
      const col = x - (grid.cols - 13);
      if (col === 0) {
        finalChar = '|';
        finalColor = '#ff00ff';
      } else if (col === 1 || col === 6) {
        finalChar = '0';
        finalColor = '#888888';
      } else if (col === 2 || col === 7) {
        finalChar = 'x';
        finalColor = '#888888';
      } else if (col === 5 || col === 10) {
        finalChar = ' ';
      } else {
        const hash = Math.sin(x * 11.3 + y * 5.1 + Math.floor(time * 4)) * 10000;
        finalChar = Math.floor(Math.abs(hash) % 16).toString(16).toUpperCase();
        finalColor = '#00ffaa';
      }
      finalSize = 10;
    }

    // Text overlay (Highest priority)
    if (y === 2 && x >= 2 && x < 2 + text1.length) {
      finalChar = text1[x - 2];
      finalColor = '#ffffff';
      finalSize = 12;
    } else if (y === 3 && x >= 2 && x < 2 + text2.length) {
      finalChar = text2[x - 2];
      finalColor = '#ffff00';
      finalSize = 12;
    }

    row.push({ char: finalChar, color: finalColor, size: finalSize });
  }
  output.push(row);
}

return output;