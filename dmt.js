const output = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2;
const aspect = 2.0;

const chars = [' ', '.', '·', '✧', '*', '+', '≈', '§', '8', '&', '@', '◈', '◉', '∞', '∆'];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    let dx = x - cx;
    let dy = (y - cy) * aspect;
    
    let mdx = x - mouse.x;
    let mdy = (y - mouse.y) * aspect;
    let mdist = Math.sqrt(mdx*mdx + mdy*mdy);
    
    let warp = Math.sin(mdist * 0.1 - time * 2) * 2;
    let nx = dx + warp;
    let ny = dy + warp;
    
    let r = Math.sqrt(nx*nx + ny*ny);
    let angle = Math.atan2(ny, nx);
    
    if (mouse.isPressed) {
        r = 400 / (r + 1) + time * 15;
        angle += Math.sin(r * 0.05 - time * 2);
    }
    
    let spiral1 = Math.sin(r * 0.3 - angle * 6 - time * 3);
    let spiral2 = Math.sin(r * 0.3 + angle * 6 - time * 3);
    let chrysanthemum = spiral1 * spiral2; 
    
    let pulse = Math.cos(r * 0.1 - time * 4);
    
    let entity = 0;
    if (r < 15 && !mouse.isPressed) {
        entity = Math.cos(angle * 3 + time * 5) * Math.sin(r * 0.5 - time * 8);
    }
    
    let val = (chrysanthemum + pulse + entity + 2) / 4; 
    val = Math.max(0, Math.min(0.99, val));
    
    let charIdx = Math.floor(val * chars.length);
    let char = chars[charIdx];
    
    if (r < 3 && !mouse.isPressed) {
        charIdx = chars.length - 2;
        char = chars[charIdx];
    }
    
    let hue = (r * 4 - time * 60 + angle * 180 / Math.PI + val * 120) % 360;
    if (hue < 0) hue += 360;
    
    let saturation = mouse.isPressed ? 100 : 85 + val * 15;
    let lightness = 30 + val * 40;
    
    let size = 10 + (val * 14);
    if (mouse.isPressed) {
        size += Math.random() * 6; 
    } else if (r < 15) {
        size += 4 + Math.sin(time * 10) * 2; 
    }
    
    row.push({
      char: char,
      color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      size: size
    });
  }
  output.push(row);
}
return output;