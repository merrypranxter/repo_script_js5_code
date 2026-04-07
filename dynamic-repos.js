const output = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2;

const palette = ['#FFB7C5', '#ADD8E6', '#E6E6FA', '#98FF98', '#D4AF37', '#FFDAB9'];
const astralChars = ['.', ':', '+', '*', '°', '·'];
const rococoChars = ['~', 'c', 's', '&', '@', '§', '}', '{', '(', ')', 'j', 'l', '?', '*'];

const cellW = 10;
const cellH = 16;
const t = time * 0.5;

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  const ny = (y - cy) / cy; 
  
  const helixAmp = grid.cols * 0.15;
  const helixX1 = Math.sin(ny * 5 + t * 2) * helixAmp;
  const helixX2 = Math.sin(ny * 5 + t * 2 + Math.PI) * helixAmp;
  const minHelix = cx + Math.min(helixX1, helixX2);
  const maxHelix = cx + Math.max(helixX1, helixX2);
  const isRungRow = y % 3 === 0;

  for (let x = 0; x < grid.cols; x++) {
    const nx = (x - cx) / cx;
    
    const r = Math.sqrt(nx*nx + ny*ny);
    const theta = Math.atan2(ny, nx);
    
    const dx = (x * cellW) - mouse.x;
    const dy = (y * cellH) - mouse.y;
    const mDist = Math.sqrt(dx*dx + dy*dy);
    
    const ripple = Math.sin(mDist * 0.05 - time * 6) * Math.max(0, 1 - mDist / 250);
    const press = mouse.isPressed ? ripple : 0;
    
    const swirl1 = Math.sin(theta * 3 + r * 6 - t);
    const swirl2 = Math.cos(theta * 2 - r * 4 + t * 1.2);
    const swirl3 = Math.sin(nx * 4 + Math.cos(ny * 4 + t));
    const ornateField = swirl1 + swirl2 + swirl3 + press * 2;
    
    const contour = Math.abs(Math.sin(ornateField * 2.5));
    
    let char = ' ';
    let color = '#000000';
    let size = 12;
    
    const isHelix1 = Math.abs((x - cx) - helixX1) < 1.5;
    const isHelix2 = Math.abs((x - cx) - helixX2) < 1.5;
    const isRung = isRungRow && x > minHelix && x < maxHelix;
    
    const dust = Math.sin(x * 123.45 + y * 678.9);
    
    if (isHelix1 || isHelix2) {
      char = '§';
      color = '#98FF98'; 
      size = 14 + press * 5;
    } else if (isRung) {
      char = '-';
      color = '#E6E6FA'; 
      size = 12;
    } else if (contour > 0.85) {
      const idx = Math.floor(Math.abs(ornateField * 10)) % rococoChars.length;
      char = rococoChars[idx];
      const pIdx = Math.floor(Math.abs((theta + r) * 5 - t)) % palette.length;
      color = palette[pIdx];
      size = 12 + (contour - 0.85) * 40 + press * 8; 
    } else if (dust > 0.98) {
      char = '✧';
      color = '#D4AF37'; 
      size = 8 + Math.sin(t * 5 + dust * 10) * 4 + press * 5; 
    } else {
      const gridWave = Math.sin(nx * 20 + t) * Math.cos(ny * 20 - t);
      if (Math.abs(gridWave) > 0.7) {
        const idx = Math.floor(Math.abs(gridWave * 10)) % astralChars.length;
        char = astralChars[idx];
        color = '#334466'; 
        size = 9 + press * 3;
      }
    }
    
    if (mDist < 50) {
      size += (50 - mDist) * 0.2;
      if (char === ' ') {
        char = '·';
        color = '#FFB7C5';
      }
      if (mouse.isPressed) {
        color = '#FFFFFF';
        char = '@';
        size += 4;
      }
    }
    
    row.push({ char, color, size });
  }
  output.push(row);
}
return output;