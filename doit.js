const out = [];
const cellW = 8;
const cellH = 16; 
const cx = (grid.cols * cellW) / 2;
const cy = (grid.rows * cellH) / 2;

const glitchChars = ['#', '@', '%', 'X', '!', '?', '█', '▓', '▒', '░', '¥', '§', '¶', '∆'];
const y2kWords = ["Y2K_AESTHETIC", "DEAD_WEB", "MYSPACE_SCENE", "OP_ART", "RETINAL", "GLITCHCORE", "SYS_ERR", "404_NOT_FOUND", "<HTML>", "CURSED_SHITPOST"];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  
  const rowGlitch = Math.sin(y * 0.3 + time * 8) > 0.98;
  const rowOffset = rowGlitch ? Math.floor(Math.sin(time * 20) * 10) : 0;
  
  for (let x = 0; x < grid.cols; x++) {
    const effX = x + rowOffset;
    let px = effX * cellW;
    let py = y * cellH;
    
    const distortion = Math.sin(py * 0.05 + time) * 15;
    px += distortion;
    
    const dx = px - cx;
    const dy = py - cy;
    const dCenter = Math.sqrt(dx*dx + dy*dy);
    const angleCenter = Math.atan2(dy, dx);
    
    const mdx = px - mouse.x;
    const mdy = py - mouse.y;
    const dMouse = Math.sqrt(mdx*mdx + mdy*mdy);
    
    const wave1 = Math.cos(dCenter * 0.08 - time * 3);
    const wave2 = Math.cos(dMouse * 0.12 + time * 2);
    const radial = Math.sin(angleCenter * 16 + time * 1.5);
    
    let interference = wave1 * wave2 + radial * 0.4;
    
    let size = 12;
    if (dMouse < 180) {
      const lens = (180 - dMouse) / 180;
      interference += Math.sin(dMouse * 0.2 - time * 5) * lens;
      size += lens * 14; 
    }
    
    let char = ' ';
    let color = '#ffffff';
    
    if (interference > 0.7) { char = '█'; color = '#ffffff'; }
    else if (interference > 0.3) { char = '▓'; color = '#dddddd'; }
    else if (interference > -0.1) { char = '▒'; color = '#aaaaaa'; }
    else if (interference > -0.5) { char = '░'; color = '#666666'; }
    else { char = ' '; color = '#000000'; }

    const isGlitch = Math.random() < 0.005 || (rowGlitch && Math.random() < 0.2);
    if (isGlitch) {
      char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
      const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff3333', '#00ff33'];
      color = colors[Math.floor(Math.random() * colors.length)];
      if (mouse.isPressed) size += Math.random() * 10;
    }
    
    if (y % 10 === 0) {
      const textIdx = Math.floor(y / 10) % y2kWords.length;
      const text = y2kWords[textIdx];
      const speed = (y % 20 === 0) ? 8 : -8;
      let tIdx = Math.floor(effX + time * speed) % (text.length + 30);
      if (tIdx < 0) tIdx += (text.length + 30);
      
      if (tIdx < text.length) {
        char = text[tIdx];
        color = mouse.isPressed ? '#ff00ff' : '#00ffcc'; 
        size = 14;
      }
    }

    if (mouse.isPressed && dMouse < 100) {
      char = Math.random() > 0.5 ? '0' : '1';
      color = '#ff0000';
      size = 12 + Math.random() * 8;
    }

    row.push({ char, color, size });
  }
  out.push(row);
}
return out;