const output = [];

// State persistence for interactive explosion
globalThis.eggplants = globalThis.eggplants || [];
globalThis.wasPressed = globalThis.wasPressed || false;

// Explode eggplants on click
if (mouse.isPressed && !globalThis.wasPressed) {
  const mx = mouse.x / 12;
  const my = mouse.y / 12;
  for(let i = 0; i < 60; i++) {
    let angle = Math.random() * Math.PI * 2;
    let speed = Math.random() * 1.5 + 0.5;
    globalThis.eggplants.push({
      x: mx,
      y: my,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 1.5 + Math.random() * 1.5
    });
  }
}
globalThis.wasPressed = mouse.isPressed;

// Physics update for eggplants
for(let i = globalThis.eggplants.length - 1; i >= 0; i--) {
  let p = globalThis.eggplants[i];
  p.x += p.vx; 
  p.y += p.vy;
  p.vy += 0.1; // gravity
  p.life -= 1/60; // assume 60fps
  if (p.life <= 0) {
    globalThis.eggplants.splice(i, 1);
  }
}

// Pre-compute eggplant grid map
const eggplantGrid = Array.from({length: grid.rows}, () => Array(grid.cols).fill(null));
for (let p of globalThis.eggplants) {
  let ex = Math.floor(p.x);
  let ey = Math.floor(p.y);
  if (ex >= 0 && ex < grid.cols && ey >= 0 && ey < grid.rows) {
    eggplantGrid[ey][ex] = { char: '🍆', size: 16 + p.life * 8 };
  }
}

// Font definition (4x5)
const font = {
  'H': ["#..#","#..#","####","#..#","#..#"],
  'E': ["####","#...","####","#...","####"],
  'Y': ["#..#","#..#",".##.","..#.","..#."],
  'D': ["###.","#..#","#..#","#..#","###."],
  'I': ["###.",".#..",".#..",".#..","###."],
  'R': ["###.","#..#","###.","#..#","#..#"],
  'K': ["#..#","#.#.","##..","#.#.","#..#"],
  'N': ["#..#","##.#","#.##","#..#","#..#"],
  'C': [".###","#...","#...","#...",".###"]
};
const lines = ["HEY", "DIRK", "NICE", "DICK"];
const textGrid = Array.from({length: grid.rows}, () => Array(grid.cols).fill(false));

const scaleX = 2; // Making the text chunkier horizontally
const scaleY = 1;

for (let l = 0; l < lines.length; l++) {
  let line = lines[l];
  let lineWidth = line.length * 4 * scaleX + (line.length - 1) * scaleX;
  let startX = Math.floor((grid.cols - lineWidth) / 2);
  let startY = Math.floor((grid.rows - 23 * scaleY) / 2) + l * 6 * scaleY;
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < line.length; c++) {
      let charDef = font[line[c]];
      for (let px = 0; px < 4; px++) {
        if (charDef[r][px] === '#') {
          for(let sx = 0; sx < scaleX; sx++) {
            for(let sy = 0; sy < scaleY; sy++) {
              let tx = startX + c * 5 * scaleX + px * scaleX + sx;
              let ty = startY + r * scaleY + sy;
              if (ty >= 0 && ty < grid.rows && tx >= 0 && tx < grid.cols) {
                textGrid[ty][tx] = true;
              }
            }
          }
        }
      }
    }
  }
}

const isTextNode = (x, y) => {
  if (y < 0 || y >= grid.rows || x < 0 || x >= grid.cols) return false;
  return textGrid[y][x];
};

const hash = (x, y) => {
  let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    // Overlay eggplants first
    if (eggplantGrid[y][x]) {
      row.push({ char: eggplantGrid[y][x].char, color: '#ffffff', size: eggplantGrid[y][x].size });
      continue;
    }

    let isText = isTextNode(x, y);
    // Art nouveau block shadow for 3D pop
    let isShadow = !isText && (isTextNode(x - 2, y - 1) || isTextNode(x - 1, y - 1) || isTextNode(x - 2, y - 2));

    if (isText) {
      let hue = (x * 10 + y * 20 - time * 200) % 360;
      if (hue < 0) hue += 360;
      let color = `hsl(${hue}, 100%, 60%)`; // Psychedelic pop rainbow effect
      
      let dx = (x * 12) - mouse.x;
      let dy = (y * 12) - mouse.y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      let size = 18;
      if (dist < 80) size += (80 - dist) * 0.15; // Interactive text bulge
      
      row.push({ char: '█', color, size });
    } else if (isShadow) {
      row.push({ char: '▓', color: '#111111', size: 16 });
    } else {
      // Background: Psychedelic slime mold fluid flow mixed with art nouveau curves
      let n = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 - time * 0.5) + Math.sin((x + y) * 0.05 + time * 1.2);
      let curve = Math.sin(y * 0.15 + Math.cos(x * 0.1 + time));
      let val = n + curve;
      
      let char = ' ';
      let color = '#222';
      let size = 12;
      
      if (val > 1.5) { char = '§'; color = '#ff1493'; size = 14; } // Deep pink pop
      else if (val > 0.8) { char = '≈'; color = '#39ff14'; size = 12; } // Neon slime green
      else if (val > 0.0) { char = 'v'; color = '#9d00ff'; size = 10; } // Purple flow
      else if (val > -1.0) { char = '~'; color = '#ffea00'; size = 8; } // Yellow pop
      
      // Sparkles layer
      let h = hash(x, y);
      if (h > 0.96) {
        let twinkle = Math.sin(time * 4 + h * 100);
        if (twinkle > 0.5) { char = '✨'; color = '#ffffff'; size = 14 + twinkle * 6; }
        else if (twinkle > 0) { char = '✦'; color = '#ffcc00'; size = 12 + twinkle * 5; }
        else if (twinkle > -0.5) { char = '✧'; color = '#ff1493'; size = 10; }
      }
      
      row.push({ char, color, size });
    }
  }
  output.push(row);
}

return output;