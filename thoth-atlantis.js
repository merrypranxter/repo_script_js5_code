const output = [];
const cx = Math.floor(grid.cols / 2);
const cy = Math.floor(grid.rows / 2);

const charW = 10;
const charH = 15;

const emeraldChars = "THOTHEMERALDATLANTIS".split('');
const waterChars = "≈~-_.°oO@".split('');
const burstChars = ["B","A","N","G","!","P","O","P","*","#"];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const dx = x - cx;
    const dy = y - cy;
    
    const pixelX = x * charW;
    const pixelY = y * charH;
    const distMouse = Math.sqrt(Math.pow(pixelX - mouse.x, 2) + Math.pow(pixelY - mouse.y, 2));
    
    let char = ' ';
    let color = '#ffffff';
    let size = 12;
    
    const mouseEffect = Math.max(0, 25 - distMouse * 0.12);
    size += mouseEffect;

    const wave1 = Math.sin(x * 0.15 + time * 2);
    const wave2 = Math.cos(y * 0.2 - time * 1.5);
    const waterVal = wave1 + wave2;

    const pyTop = Math.floor(cy - 4);
    const pyBottom = Math.floor(cy + 15);
    const pyY = y - pyTop; 
    const pyWidth = pyY * 1.5; 
    const isPyramid = y >= pyTop && y <= pyBottom && Math.abs(dx) <= pyWidth;
    const isPyramidEdge = isPyramid && (Math.abs(dx) > pyWidth - 1.5 || y === pyBottom);

    const eyeDist = Math.sqrt(dx * dx + Math.pow(y - (pyTop - 4), 2));

    const pillarWave1 = -32 + Math.sin(y * 0.15 - time * 2) * 5;
    const pillarWave2 = 32 + Math.cos(y * 0.15 - time * 2.2) * 5;
    const pillarRadius = 4 + Math.sin(y * 0.1 + time) * 1.5;

    const distPillar1 = Math.abs(dx - pillarWave1);
    const distPillar2 = Math.abs(dx - pillarWave2);

    const isPillar1 = distPillar1 < pillarRadius;
    const isPillar2 = distPillar2 < pillarRadius;
    const isPillar = isPillar1 || isPillar2;
    const isPillarEdge = (isPillar1 && distPillar1 > pillarRadius - 1.0) || (isPillar2 && distPillar2 > pillarRadius - 1.0);

    const halftone = (x + y) % 2 === 0;

    if (eyeDist < 5) {
      if (eyeDist < 1.5) {
        char = '@';
        color = '#ffffff'; 
        size += 8 + Math.sin(time * 5) * 4;
      } else if (eyeDist < 3.5) {
        char = '☼';
        color = '#ffaa00'; 
        size += 4;
      } else {
        char = halftone ? '·' : ' ';
        color = '#ff00ff';
      }
    } else if (isPyramid) {
      if (isPyramidEdge) {
        if (y === pyBottom) {
          char = '=';
        } else {
          char = dx < 0 ? '/' : '\\';
        }
        color = '#ff00ff'; 
        size += 2;
      } else {
        const glyphIdx = Math.floor(Math.abs(x * y - time * 15)) % emeraldChars.length;
        char = emeraldChars[glyphIdx];
        const greenPulse = 40 + Math.sin(x * 0.4 + time * 5) * 20 + (halftone ? 15 : 0);
        color = `hsl(150, 100%, ${greenPulse}%)`;
      }
    } else if (isPillar) {
      if (isPillarEdge) {
        char = '|';
        color = '#ffffff';
      } else {
        const stripe = Math.floor((y - time * 10) / 3) % 2 === 0;
        char = stripe ? '≡' : '≈';
        color = stripe ? '#ffff00' : '#ff00ff';
      }
    } else {
      const wIdx = Math.floor(Math.abs(waterVal * 2 + time)) % waterChars.length;
      char = waterChars[wIdx];
      const hue = (220 + waterVal * 25 + time * 15) % 360;
      const lightness = 35 + waterVal * 10 + (halftone ? 15 : -5);
      color = `hsl(${hue}, 90%, ${lightness}%)`;
    }
    
    if (mouse.isPressed && distMouse < 120) {
      const burstDist = 120 - distMouse;
      char = burstChars[Math.floor(Math.random() * burstChars.length)];
      color = `hsl(${(time * 500 + burstDist * 4) % 360}, 100%, 50%)`;
      size = 16 + burstDist * 0.2;
    }

    row.push({ char, color, size });
  }
  output.push(row);
}
return output;