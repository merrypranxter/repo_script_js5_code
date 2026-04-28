const W = 256;
const H = 256;

// 1. Initialize Reaction-Diffusion System
if (!canvas.__rd) {
    canvas.__rd = {
        u: new Float32Array(W * H).fill(1.0),
        v: new Float32Array(W * H).fill(0.0),
        nextU: new Float32Array(W * H),
        nextV: new Float32Array(W * H),
        F_map: new Float32Array(W * H),
        k_map: new Float32Array(W * H),
        imgData: new ImageData(W, H),
        offscreen: document.createElement('canvas')
    };
    canvas.__rd.offscreen.width = W;
    canvas.__rd.offscreen.height = H;
    
    // Seed initial state with a central shape and random noise
    for(let y = 0; y < H; y++) {
        for(let x = 0; x < W; x++) {
            let dx = x - W/2;
            let dy = y - H/2;
            let idx = x + y * W;
            if (dx*dx + dy*dy < 600) {
                canvas.__rd.u[idx] = 0.5 + Math.random() * 0.1;
                canvas.__rd.v[idx] = 0.25 + Math.random() * 0.1;
            }
            if (Math.random() < 0.005) {
                canvas.__rd.v[idx] = 0.9;
            }
        }
    }
}

let rd = canvas.__rd;
let { u, v, nextU, nextV, F_map, k_map, imgData, offscreen } = rd;

// 2. Generate Spatially Varying Parameter Maps (The Strange Mechanism)
// Maps F and k into a 4-arm and 2-arm spiral, creating multiple Pearson 
// pattern types (Spots, Waves, Mazes, Spirals) radiating simultaneously.
for (let y = 0; y < H; y++) {
    let dy = (y / H) - 0.5;
    for (let x = 0; x < W; x++) {
        let dx = (x / W) - 0.5;
        let rad = Math.sqrt(dx*dx + dy*dy) * 2.0;
        let ang = Math.atan2(dy, dx);
        
        let idx = x + y * W;
        // F varies from 0.025 (Chaos) to 0.08 (Red Soap Bubbles)
        F_map[idx] = 0.025 + 0.055 * (0.5 + 0.5 * Math.sin(rad * 8 - time * 2.0 + ang * 4));
        // k varies from 0.045 to 0.065
        k_map[idx] = 0.045 + 0.020 * (0.5 + 0.5 * Math.cos(rad * 6 + time * 1.5 - ang * 2));
    }
}

// 3. Glitch/Interaction Injection
if (mouse.isPressed) {
    let mx = Math.floor((mouse.x / grid.width) * W);
    let my = Math.floor((mouse.y / grid.height) * H);
    for(let i = -10; i <= 10; i++) {
        for(let j = -10; j <= 10; j++) {
            if (i*i + j*j < 100) {
                let px = mx + i;
                let py = my + j;
                if (px >= 0 && px < W && py >= 0 && py < H) {
                    u[px + py*W] = 0.5;
                    v[px + py*W] = 0.8;
                }
            }
        }
    }
}

// Auto-seed to ensure the system never dies into uniform equilibrium
if (Math.random() < 0.15) {
    let rx = Math.floor(Math.random() * W);
    let ry = Math.floor(Math.random() * H);
    for(let i = -4; i <= 4; i++) {
        for(let j = -4; j <= 4; j++) {
            let px = rx + i;
            let py = ry + j;
            if (px >= 0 && px < W && py >= 0 && py < H && i*i + j*j < 16) {
                u[px + py*W] = 0.5;
                v[px + py*W] = 0.9;
            }
        }
    }
}

// 4. Gray-Scott Integration (12 steps per frame for high-speed evolution)
const weightCenter = -1.0;
const weightCardinal = 0.2;
const weightDiagonal = 0.05;

for (let step = 0; step < 12; step++) {
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            let idx = x + y * W;
            let uc = u[idx];
            let vc = v[idx];
            
            let sumU = uc * weightCenter +
                       (u[idx - 1] + u[idx + 1] + u[idx - W] + u[idx + W]) * weightCardinal +
                       (u[idx - W - 1] + u[idx - W + 1] + u[idx + W - 1] + u[idx + W + 1]) * weightDiagonal;
                       
            let sumV = vc * weightCenter +
                       (v[idx - 1] + v[idx + 1] + v[idx - W] + v[idx + W]) * weightCardinal +
                       (v[idx - W - 1] + v[idx - W + 1] + v[idx + W - 1] + v[idx + W + 1]) * weightDiagonal;
                       
            let uvv = uc * vc * vc;
            let F = F_map[idx];
            let k = k_map[idx];
            
            // Du = 1.0, Dv = 0.5, dt = 1.0
            nextU[idx] = uc + (sumU - uvv + F * (1.0 - uc));
            nextV[idx] = vc + (0.5 * sumV + uvv - (F + k) * vc);
        }
    }
    
    // Toroidal Boundary Conditions
    for (let x = 0; x < W; x++) {
        nextU[x] = nextU[x + (H - 2) * W];
        nextV[x] = nextV[x + (H - 2) * W];
        nextU[x + (H - 1) * W] = nextU[x + W];
        nextV[x + (H - 1) * W] = nextV[x + W];
    }
    for (let y = 0; y < H; y++) {
        nextU[y * W] = nextU[W - 2 + y * W];
        nextV[y * W] = nextV[W - 2 + y * W];
        nextU[W - 1 + y * W] = nextU[1 + y * W];
        nextV[W - 1 + y * W] = nextV[1 + y * W];
    }
    
    let tempU = u; u = nextU; nextU = tempU;
    let tempV = v; v = nextV; nextV = tempV;
}

rd.u = u;
rd.v = v;
rd.nextU = nextU;
rd.nextV = nextV;

// 5. Acid Vibration Palette Mapping (No Black or White)
let data = imgData.data;
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        let idx = x + y * W;
        let val = v[idx];
        
        // Non-linear topographic wrapping to create intense contour lines
        let t = (val * 6.0 - time * 0.5 + Math.sin(x*0.04)*0.05 + Math.cos(y*0.04)*0.05) % 1.0;
        if (t < 0) t += 1.0;
        
        let n = (t % 0.25) / 0.25;
        let r, g, b;
        if (t < 0.25) {
            // Lime (#AAFF00) to Cobalt Blue (#0047FF)
            r = 170 * (1-n) + 0 * n;
            g = 255 * (1-n) + 71 * n;
            b = 0 * (1-n) + 255 * n;
        } else if (t < 0.5) {
            // Cobalt Blue to Hot Magenta (#FF00C8)
            r = 0 * (1-n) + 255 * n;
            g = 71 * (1-n) + 0 * n;
            b = 255 * (1-n) + 200 * n;
        } else if (t < 0.75) {
            // Hot Magenta to Electric Orange (#FF6B00)
            r = 255 * (1-n) + 255 * n;
            g = 0 * (1-n) + 107 * n;
            b = 200 * (1-n) + 0 * n;
        } else {
            // Electric Orange back to Lime
            r = 255 * (1-n) + 170 * n;
            g = 107 * (1-n) + 255 * n;
            b = 0 * (1-n) + 0 * n;
        }
        
        let px = idx * 4;
        data[px] = r;
        data[px+1] = g;
        data[px+2] = b;
        data[px+3] = 255;
    }
}
offscreen.getContext('2d').putImageData(imgData, 0, 0);

// 6. Psychedelic Collage Compositing
const cx = grid.width / 2;
const cy = grid.height / 2;
const baseScale = Math.max(grid.width / W, grid.height / H) * 1.5;
const radius = Math.min(grid.width, grid.height) * 0.35;

ctx.imageSmoothingEnabled = true;

// Base fill
ctx.fillStyle = "#FF00C8";
ctx.fillRect(0, 0, grid.width, grid.height);

// Tunnel Background
for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.05 * (i % 2 === 0 ? 1 : -1) + i * Math.PI / 4);
    let s = baseScale * (1.2 - i * 0.2);
    ctx.scale(s, s);
    ctx.globalAlpha = 1.0 - i * 0.25;
    ctx.drawImage(offscreen, -W/2, -H/2, W, H);
    ctx.restore();
}

// Color Tint Layer (Creates depth separation)
ctx.fillStyle = "rgba(0, 71, 255, 0.4)";
ctx.fillRect(0, 0, grid.width, grid.height);

// Foreground Sacred Geometry Clip (Seed of Life)
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(-time * 0.05);

ctx.beginPath();
for(let i=0; i<6; i++) {
    let angle = i * Math.PI / 3;
    let ox = Math.cos(angle) * radius * 0.6;
    let oy = Math.sin(angle) * radius * 0.6;
    ctx.moveTo(ox + radius * 0.6, oy);
    ctx.arc(ox, oy, radius * 0.6, 0, Math.PI*2);
}
ctx.moveTo(radius * 0.6, 0);
ctx.arc(0, 0, radius * 0.6, 0, Math.PI*2);
ctx.clip();

// Draw RD pattern inside the clip, scaled and rotating in reverse
let pulse = 1.0 + 0.1 * Math.sin(time * 2.0);
ctx.rotate(time * 0.15);
ctx.scale(baseScale * pulse, baseScale * pulse);
ctx.globalAlpha = 1.0;
ctx.drawImage(offscreen, -W/2, -H/2, W, H);
ctx.restore();

// Heavy Physical Stroke & CMYK Misregistration Simulation
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(-time * 0.05);

ctx.beginPath();
for(let i=0; i<6; i++) {
    let angle = i * Math.PI / 3;
    let ox = Math.cos(angle) * radius * 0.6;
    let oy = Math.sin(angle) * radius * 0.6;
    ctx.moveTo(ox + radius * 0.6, oy);
    ctx.arc(ox, oy, radius * 0.6, 0, Math.PI*2);
}
ctx.moveTo(radius * 0.6, 0);
ctx.arc(0, 0, radius * 0.6, 0, Math.PI*2);

// Shadow depth
ctx.shadowColor = "rgba(0, 71, 255, 0.9)";
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 12;
ctx.shadowOffsetY = 12;
ctx.lineWidth = 14;
ctx.strokeStyle = "#FF6B00";
ctx.stroke();
ctx.shadowColor = "transparent";

// Offset misregistration stroke
ctx.translate(6, -4);
ctx.lineWidth = 14;
ctx.strokeStyle = "rgba(255, 0, 200, 0.7)";
ctx.stroke();

// Crisp inner neon keyline
ctx.translate(-6, 4);
ctx.lineWidth = 4;
ctx.strokeStyle = "#AAFF00";
ctx.stroke();
ctx.restore();

// Floating Op-Art Orbits
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(time * 0.08);
for(let i=0; i<24; i++) {
    let a = (i / 24) * Math.PI * 2 + time * 0.2;
    let r = radius * 1.3 + Math.sin(time * 3 + i) * 30;
    
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 6 + Math.sin(i*2 + time)*4, 0, Math.PI*2);
    ctx.fillStyle = i % 2 === 0 ? "#FF00C8" : "#AAFF00";
    ctx.shadowColor = "#FF6B00";
    ctx.shadowBlur = 10;
    ctx.fill();
}
ctx.restore();

// Final CRT Scanline Overlay Texture
ctx.save();
ctx.fillStyle = "rgba(255, 107, 0, 0.15)";
for(let y = 0; y < grid.height; y += 4) {
    ctx.fillRect(0, y, grid.width, 2);
}
ctx.restore();