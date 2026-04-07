const output = [];
const cw = 12; 
const ch = 20; 

const cx = grid.cols / 2;
const cy = grid.rows / 2;

const motifs = ['@', '&', '§', 'S', 'C', '}', '{', '°', '*'];
const astralChars = ['.', ',', '-', '~', ':', '=', '+', '*', '%', 'x', 'X', '#', '@'];
const ghostStr = "ASTRAL_OS_ANU_KERNEL_SHADOW_STRAND_GHOST_AI";

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const sx = (x - cx) * 1.8;
    const sy = (y - cy);
    const d = Math.sqrt(sx * sx + sy * sy);
    const a = Math.atan2(sy, sx);
    
    // Rococo shell/scallop shape frame
    const frameR = cy * 0.75 + Math.sin(a * 6) * 4 + Math.cos(a * 12) * 2 + Math.sin(a * 3 - time) * 2;
    const distToFrame = d - frameR; 
    const absDistToFrame = Math.abs(distToFrame);
    
    let char = ' ';
    let color = '#000000';
    let size = 12;
    
    // Mouse distance
    const dx = x * cw - mouse.x;
    const dy = y * ch - mouse.y;
    const mDist = Math.sqrt(dx*dx + dy*dy);
    const mouseInfluence = Math.max(0, 1 - mDist / 150);
    
    const frameThickness = 3.5 + Math.sin(a * 16 + time) * 1.5;
    
    if (absDistToFrame < frameThickness) {
      // Rococo Frame
      const isEdge = absDistToFrame > frameThickness - 1.0;
      if (isEdge) {
        char = '*';
        color = '#DAA520'; 
      } else {
        const motifIdx = Math.floor(Math.abs(Math.sin(a * 8 + x)) * motifs.length) % motifs.length;
        char = motifs[motifIdx];
        color = mouse.isPressed ? '#FF8C00' : '#FFD700'; 
      }
      size = 14 + mouseInfluence * 12 + Math.sin(time * 4 + a) * 2;
      
    } else if (distToFrame < 0) {
      // Inside: Astral Portal (GLSL style fluid)
      const u = x / grid.cols;
      const v = y / grid.rows;
      const t = time * 0.8;
      
      const v1 = Math.sin(u * 12 + t) + Math.cos(v * 12 - t);
      const v2 = Math.sin((u + v) * 20 + t * 1.5);
      const v3 = Math.cos(d * 0.2 - t * 4);
      
      const val = (v1 + v2 + v3) / 3; 
      const normVal = (val + 1) / 2;
      
      const charIdx = Math.max(0, Math.min(astralChars.length - 1, Math.floor(normVal * astralChars.length)));
      char = astralChars[charIdx];
      
      const r = Math.floor(140 * normVal + 40);
      const g = Math.floor(90 * Math.sin(t + u * 10) + 90);
      const b = Math.floor(255 * normVal + 50);
      color = `rgb(${r},${g},${b})`;
      size = 10 + normVal * 6 + mouseInfluence * 18;
      
      // DNA Shadow Strand 
      const helix1 = Math.sin(sy * 0.2 + time * 2) * 12;
      const helix2 = Math.sin(sy * 0.2 + time * 2 + Math.PI) * 12;
      const isRung = Math.abs(sy % 3) < 1;
      const betweenHelices = (sx > Math.min(helix1, helix2)) && (sx < Math.max(helix1, helix2));
      
      if (Math.abs(sx - helix1) < 1.5 || Math.abs(sx - helix2) < 1.5) {
         char = '8';
         color = mouse.isPressed ? '#FF00FF' : '#00FFFF'; 
         size = 14 + mouseInfluence * 15 + Math.sin(t*5)*3;
      } else if (isRung && betweenHelices) {
         char = '-';
         color = '#00FFFF';
         size = 12 + mouseInfluence * 10;
      } else if (Math.random() > 0.99) {
         char = ghostStr[Math.floor(Math.random() * ghostStr.length)];
         color = '#FFFFFF';
         size = 16;
      }
      
    } else {
      // Outside: Rococo Wallpaper
      const wx = x + time * 0.5;
      const wy = y + time * 0.3;
      const pat = Math.sin(wx * 0.35 + Math.sin(wy * 0.25)) + Math.cos(wy * 0.35 + Math.cos(wx * 0.25));
      
      if (pat > 1.3) {
        char = '{';
        color = '#FFB6C1'; 
      } else if (pat < -1.3) {
        char = '}';
        color = '#ADD8E6'; 
      } else if (Math.abs(pat) < 0.1) {
        char = '°';
        color = '#E6E6FA'; 
      } else {
        char = '·';
        color = '#222222'; 
      }
      size = 10 + mouseInfluence * 8;
      
      if (mouseInfluence > 0.4) {
         const mix = (mouseInfluence - 0.4) / 0.6;
         if (char === '·') {
             color = `rgb(${Math.floor(34 + mix*100)}, ${Math.floor(34 + mix*100)}, ${Math.floor(34 + mix*50)})`;
         }
      }
    }
    
    row.push({ char, color, size });
  }
  output.push(row);
}
return output;