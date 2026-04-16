const REPULSION_RADIUS = 25;
const REST_LENGTH = 6;
const MAX_EDGE_LENGTH = 14;
const REPULSION_FORCE = 1.2;
const SPRING_FORCE = 0.6;
const DRAG = 0.75;
const MAX_NODES = 3500;

// Fantastic Planet / Roland Topor Palette
const paper = "#E8DFC8";
const ink = "#2F2A2A";

// Pseudo-random noise for organic writhing
function fluidNoise(x, y, t) {
  return Math.sin(x * 0.02 + t) + Math.sin(y * 0.025 - t) + Math.sin((x + y) * 0.015 + t * 0.5);
}

function createNode(x, y) {
  return { x, y, vx: 0, vy: 0 };
}

function createPath(x, y, radius, color) {
  const nodes = [];
  const count = 30;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    nodes.push(createNode(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
  }
  return { nodes, color };
}

function createSpore(x, y) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    r: 1 + Math.random() * 2.5,
    seed: Math.random() * 100
  };
}

function createSpatialHash(cellSize) {
  return {
    cellSize,
    cells: new Map(),
    insert(node) {
      const cx = Math.floor(node.x / this.cellSize);
      const cy = Math.floor(node.y / this.cellSize);
      const key = cx + ',' + cy;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(node);
    },
    getNeighbors(node, radius) {
      const neighbors = [];
      const cx = Math.floor(node.x / this.cellSize);
      const cy = Math.floor(node.y / this.cellSize);
      const range = Math.ceil(radius / this.cellSize);
      for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
          const key = (cx + i) + ',' + (cy + j);
          const cell = this.cells.get(key);
          if (cell) {
            for (let k = 0; k < cell.length; k++) {
              if (cell[k] !== node) neighbors.push(cell[k]);
            }
          }
        }
      }
      return neighbors;
    }
  };
}

function updatePathPhysics(path, hash, mouse, grid, time) {
  const nodes = path.nodes;
  
  // Spring forces to maintain edge lengths
  for (let i = 0; i < nodes.length; i++) {
    const n1 = nodes[i];
    const n2 = nodes[(i + 1) % nodes.length];
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const diff = dist - REST_LENGTH;
      const force = diff * SPRING_FORCE;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      n1.vx += fx; n1.vy += fy;
      n2.vx -= fx; n2.vy -= fy;
    }
  }
  
  const cx = grid.width / 2;
  const cy = grid.height / 2;
  const maxR = Math.min(cx, cy) * 0.8;
  
  for (const n1 of nodes) {
    // Spatial repulsion (prevents self-intersection and creates wrinkles)
    const neighbors = hash.getNeighbors(n1, REPULSION_RADIUS);
    for (const n2 of neighbors) {
      const dx = n1.x - n2.x;
      const dy = n1.y - n2.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < REPULSION_RADIUS) {
        const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS * REPULSION_FORCE;
        n1.vx += (dx / dist) * force;
        n1.vy += (dy / dist) * force;
      }
    }
    
    // Mouse repulsor field
    if (mouse.isPressed) {
      const dx = n1.x - mouse.x;
      const dy = n1.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        n1.vx += (dx / dist) * 3;
        n1.vy += (dy / dist) * 3;
      }
    }
    
    // Gentle boundary containment
    const cdist = Math.hypot(n1.x - cx, n1.y - cy);
    if (cdist > maxR) {
      const force = (cdist - maxR) * 0.05;
      n1.vx -= (n1.x - cx) / cdist * force;
      n1.vy -= (n1.y - cy) / cdist * force;
    }
    
    // Organic writhing
    const angle = fluidNoise(n1.x, n1.y, time * 0.5) * Math.PI;
    n1.vx += Math.cos(angle) * 0.2;
    n1.vy += Math.sin(angle) * 0.2;
  }
  
  // Integrate velocity
  for (const n of nodes) {
    n.vx = Math.max(-6, Math.min(6, n.vx));
    n.vy = Math.max(-6, Math.min(6, n.vy));
    n.x += n.vx;
    n.y += n.vy;
    n.vx *= DRAG;
    n.vy *= DRAG;
  }
}

function growPath(path) {
  const nodes = path.nodes;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n1 = nodes[i];
    const n2 = nodes[(i + 1) % nodes.length];
    const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
    if (dist > MAX_EDGE_LENGTH) {
      nodes.splice(i + 1, 0, createNode((n1.x + n2.x) / 2, (n1.y + n2.y) / 2));
    }
  }
}

function updateSpore(s, hash, grid, time) {
  s.x += s.vx;
  s.y += s.vy;
  
  const angle = fluidNoise(s.x, s.y, time + s.seed) * Math.PI;
  s.vx += Math.cos(angle) * 0.15;
  s.vy += Math.sin(angle) * 0.15;
  
  s.vx *= 0.95;
  s.vy *= 0.95;
  
  const neighbors = hash.getNeighbors(s, 30);
  for (const n of neighbors) {
    const dx = s.x - n.x;
    const dy = s.y - n.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30 && dist > 0) {
      s.vx += (dx / dist) * 1.5;
      s.vy += (dy / dist) * 1.5;
    }
  }
  
  if (s.x < 0) s.x = grid.width;
  if (s.x > grid.width) s.x = 0;
  if (s.y < 0) s.y = grid.height;
  if (s.y > grid.height) s.y = 0;
}

// ------------------------------------------------------------------
// Main Execution
// ------------------------------------------------------------------

if (!canvas.__growthState || canvas.__growthState.w !== grid.width || canvas.__growthState.h !== grid.height) {
  const state = {
    w: grid.width,
    h: grid.height,
    paths: [],
    spores: []
  };
  
  // Palette from Topor / La Planète Sauvage orbit
  const colors = ["#8EA3B0", "#D8C98E", "#C98B8A", "#A45E4D", "#8E9A72", "#8A7C92"];
  colors.sort(() => Math.random() - 0.5);
  
  // Spawn initial biological seeds
  for (let i = 0; i < 5; i++) {
    const cx = grid.width / 2 + (Math.random() - 0.5) * 200;
    const cy = grid.height / 2 + (Math.random() - 0.5) * 200;
    state.paths.push(createPath(cx, cy, 30, colors[i % colors.length]));
  }
  
  for (let i = 0; i < 120; i++) {
    state.spores.push(createSpore(
      Math.random() * grid.width,
      Math.random() * grid.height
    ));
  }
  
  // Pre-render the dusty paper background and static ecological stalks
  const offCanvas = document.createElement('canvas');
  offCanvas.width = grid.width;
  offCanvas.height = grid.height;
  const octx = offCanvas.getContext('2d');
  
  octx.fillStyle = paper;
  octx.fillRect(0, 0, grid.width, grid.height);

  // Print-era paper grain texture
  octx.fillStyle = "#D8C98E";
  for(let i=0; i < (grid.width * grid.height / 50); i++) {
    octx.fillRect(Math.random() * grid.width, Math.random() * grid.height, 1.5, 1.5);
  }
  octx.fillStyle = "#C98B8A";
  for(let i=0; i < (grid.width * grid.height / 200); i++) {
    octx.fillRect(Math.random() * grid.width, Math.random() * grid.height, 1, 1);
  }
  
  // Surreal stalks/towers
  octx.strokeStyle = ink;
  octx.lineWidth = 1.2;
  octx.fillStyle = paper;
  for(let i=1; i<=12; i++) {
    const seed = i * 13.37;
    const x = grid.width * (0.05 + 0.9 * (seed % 1));
    const height = grid.height * (0.15 + 0.5 * ((seed * 2.1) % 1));
    
    octx.beginPath();
    octx.moveTo(x, grid.height);
    for(let y = grid.height; y >= grid.height - height; y -= 5) {
      octx.lineTo(x + Math.sin(y * 0.03 + i) * 8, y);
    }
    octx.stroke();
    
    // Seed pods on stalks
    for(let j=0; j<4; j++) {
      const py = grid.height - height + j * 40;
      if (py > grid.height) continue;
      const px = x + Math.sin(py * 0.03 + i) * 8;
      octx.beginPath();
      octx.ellipse(px + (j%2===0?6:-6), py, 4, 10, (j%2===0?0.2:-0.2), 0, Math.PI*2);
      octx.fill();
      octx.stroke();
    }
  }
  
  state.bgPattern = offCanvas;
  canvas.__growthState = state;
}

const state = canvas.__growthState;

// 1. Draw Background
ctx.drawImage(state.bgPattern, 0, 0);

// 2. Physics Integration (2 steps for stability)
for(let step = 0; step < 2; step++) {
  const hash = createSpatialHash(REPULSION_RADIUS);
  for (const p of state.paths) {
    for (const n of p.nodes) hash.insert(n);
  }
  for (const p of state.paths) {
    updatePathPhysics(p, hash, mouse, grid, time);
  }
}

// 3. Differential Growth
let totalNodes = state.paths.reduce((s, p) => s + p.nodes.length, 0);
if (totalNodes < MAX_NODES) {
  for (const p of state.paths) growPath(p);
}

// 4. Render Biological Masses
for (const p of state.paths) {
  const pnodes = p.nodes;
  if (pnodes.length === 0) continue;
  
  // Matte fill
  ctx.beginPath();
  ctx.moveTo(pnodes[0].x, pnodes[0].y);
  for (let i = 0; i < pnodes.length; i++) {
    const n1 = pnodes[i];
    const n2 = pnodes[(i + 1) % pnodes.length];
    ctx.quadraticCurveTo(n1.x, n1.y, (n1.x + n2.x) / 2, (n1.y + n2.y) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = p.color;
  ctx.fill();
  
  // Dry ink contour
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Sparse hatching for volume
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < pnodes.length; i++) {
    if ((i * 17) % 11 > 4) continue; // irregular pattern
    
    const n = pnodes[i];
    const prev = pnodes[(i - 1 + pnodes.length) % pnodes.length];
    const next = pnodes[(i + 1) % pnodes.length];
    
    const dx1 = n.x - prev.x, dy1 = n.y - prev.y;
    const dx2 = next.x - n.x, dy2 = next.y - n.y;
    const len1 = Math.hypot(dx1, dy1), len2 = Math.hypot(dx2, dy2);
    
    if (len1 === 0 || len2 === 0) continue;
    
    const dot = (dx1/len1)*(dx2/len2) + (dy1/len1)*(dy2/len2);
    
    // Draw hatch marks inward at sharp folds
    if (dot < 0.8 && dot > -0.8) {
      const nx = -dy1 / len1;
      const ny = dx1 / len1;
      const hatchLen = 4 + (i % 3) * 4;
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(n.x - nx * hatchLen, n.y - ny * hatchLen);
    }
  }
  ctx.stroke();
  
  // Internal absurd anatomy (mask-like eyes / orifices)
  ctx.fillStyle = paper;
  ctx.lineWidth = 1;
  for (let i = 0; i < pnodes.length; i += 35) {
    const n = pnodes[i];
    const prev = pnodes[(i - 1 + pnodes.length) % pnodes.length];
    const dx = n.x - prev.x, dy = n.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    
    const inX = dy / len;
    const inY = -dx / len;
    const ex = n.x + inX * 14;
    const ey = n.y + inY * 14;
    
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(ex + inX, ey + inY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paper;
  }
}

// 5. Render Floating Spores
const sporeHash = createSpatialHash(30);
for (const p of state.paths) {
  for (const n of p.nodes) sporeHash.insert(n);
}

for (const s of state.spores) {
  updateSpore(s, sporeHash, grid, time);
  
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
  ctx.fillStyle = ink;
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// 6. Scientific Specimen Plate Border
ctx.strokeStyle = ink;
ctx.lineWidth = 1.5;
ctx.strokeRect(20, 20, grid.width - 40, grid.height - 40);
ctx.strokeRect(24, 24, grid.width - 48, grid.height - 48);

ctx.fillStyle = ink;
ctx.font = "bold 12px monospace";
ctx.fillText("FIG. 1: SYMBIOTIC LARVAL MORPHOLOGY", 30, grid.height - 30);
ctx.fillText("SECTOR: OMEGA-7", grid.width - 140, grid.height - 30);

// Registration marks
ctx.beginPath();
ctx.moveTo(grid.width/2, 10); ctx.lineTo(grid.width/2, 30);
ctx.moveTo(grid.width/2, grid.height-10); ctx.lineTo(grid.width/2, grid.height-30);
ctx.moveTo(10, grid.height/2); ctx.lineTo(30, grid.height/2);
ctx.moveTo(grid.width-10, grid.height/2); ctx.lineTo(grid.width-30, grid.height/2);
ctx.stroke();