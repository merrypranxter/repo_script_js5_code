const output = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2;

const popChars = ['@', 'O', 'o', '*', '~', '.', '+', '✧', '☁', '★', '✿', '☼'];
const osChars = ['0', '1', 'x', 'F', '%', '&', 'A', 'Z', 'T', 'H', '§', '¶', '‡', '†', '░', '▒', '▓'];

const popColors = ['#FF1493', '#00FFFF', '#FFD700', '#32CD32', '#FF4500', '#FF69B4'];
const osColors = ['#00FF41', '#8A2BE2', '#4B0082', '#DC143C', '#008F11', '#556B2F'];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const dx = x - cx;
    const dy = (y - cy) * 2; 
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    
    const pixelX = x * 10;
    const pixelY = y * 20;
    const mdx = pixelX - mouse.x + Math.sin(y * 0.5 + time * 3) * 15;
    const mdy = pixelY - mouse.y + Math.cos(x * 0.5 + time * 3) * 15;
    const distToMouse = Math.sqrt(mdx * mdx + mdy * mdy);
    
    const angle = Math.atan2(dy, dx);
    
    // Psychedelic Pop Waves
    const psychWave = Math.sin(distToCenter * 0.15 - time * 2) + Math.cos(angle * 6 + time * 1.5);
    
    // Lovecraft OS Tentacles / Threads
    const tentacleWaves = Math.sin(angle * 7 + distToCenter * 0.1 - time * 4);
    const isTentacle = Math.abs(tentacleWaves) < 0.25 && distToCenter < 40;
    
    let char = ' ';
    let color = '#fff';
    let size = 12;
    
    // Azathoth CPU Core
    const corePulse = Math.sin(time * 6) * 3;
    if (distToCenter < 6 + corePulse) {
      char = osChars[Math.floor(Math.random() * osChars.length)];
      color = mouse.isPressed ? '#FF0000' : '#DC143C';
      size = 18 + Math.random() * 8;
    } else if (isTentacle) {
      char = osChars[Math.floor((Math.abs(dx + dy) + time * 10) % osChars.length)];
      color = osColors[Math.floor((distToCenter - time * 5) % osColors.length + osColors.length) % osColors.length];
      size = 14 + Math.sin(distToCenter * 0.4 - time * 5) * 4;
    } else {
      const idx = Math.floor(Math.abs(psychWave * 3)) % popChars.length;
      char = popChars[idx];
      color = popColors[Math.floor(Math.abs(distToCenter * 0.1 - time * 2)) % popColors.length];
      size = 10 + psychWave * 3;
    }
    
    // Mouse Interaction: Chaos Engineering (tearing the veil)
    const mouseRadius = mouse.isPressed ? 180 : 100;
    if (distToMouse < mouseRadius) {
      const influence = 1 - (distToMouse / mouseRadius);
      if (Math.random() < influence * 0.9) {
        char = osChars[Math.floor(Math.random() * osChars.length)];
        color = mouse.isPressed ? '#FF0000' : '#00FF41';
        size = 12 + influence * (mouse.isPressed ? 24 : 14);
      }
    }
    
    row.push({ char, color, size });
  }
  output.push(row);
}
return output;