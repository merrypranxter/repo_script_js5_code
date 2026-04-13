// Aperiodic Reaction-Diffusion: The Lisa Frank Ditherpunk Quasicrystal
//
// MECHANISM:
// 1. Calculates a 5-fold (icosahedral) quasiperiodic interference field that breathes and glitches over time.
// 2. Uses this aperiodic field to spatially modulate the feed/kill rates of a Gray-Scott reaction-diffusion system.
// 3. The organic Turing patterns (worms, spots, labyrinths) are forced to grow along the forbidden 5-fold geometry.
// 4. The chemical concentration is quantized via 4x4 Bayer ordered dithering (pixel_voxel style).
// 5. The dithered values are mapped to a hyper-saturated, 12-step neon palette (lisa_frank_aesthetic).
// 6. Rendered to a low-res pixel grid and nearest-neighbor upscaled.

const scale = Math.max(1, Math.floor(Math.max(grid.width, grid.height) / 150));
const W = Math.floor(grid.width / scale);
const H = Math.floor(grid.height / scale);

if (!canvas.__gsState || canvas.__gsState.W !== W || canvas.__gsState.H !== H) {
    const A = new Float32Array(W * H).fill(1.0);
    const B = new Float32Array(W * H).fill(0.0);
    const nextA = new Float32Array(W * H);
    const nextB = new Float32Array(W * H);
    const phases = new Float32Array(5 * W * H);
    const Q = new Float32Array(W * H);
    
    // Generate 5-fold quasicrystal basis vectors
    const freq = 0.25; 
    for (let j = 0; j < 5; j++) {
        const angle = j * Math.PI / 5;
        const kx = Math.cos(angle) * freq;
        const ky = Math.sin(angle) * freq;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                phases[j * W * H + y * W + x] = x * kx + y * ky;
            }
        }
    }
    
    // Seed the initial feral growth along the quasicrystal nodes
    for(let i = 0; i < W * H; i++) {
        let sum = 0;
        for(let j = 0; j < 5; j++) sum += Math.cos(phases[j * W * H + i]);
        let q = (sum / 5) * 0.5 + 0.5;
        if (q > 0.8 || Math.random() < 0.02) {
            B[i] = 1.0;
            A[i] = 0.0;
        }
    }
    
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(W, H);
    
    canvas.__gsState = { A, B, nextA, nextB, phases, Q, W, H, offscreen, offCtx, imgData, glitchOffset: 0 };
}

let { A, B, nextA, nextB, phases, Q, offscreen, offCtx, imgData } = canvas.__gsState;

// 1. Machine Hesitation / Glitch
let glitch = canvas.__gsState.glitchOffset;
if (Math.random() < 0.015) canvas.__gsState.glitchOffset = glitch + Math.random() * 2.0;
canvas.__gsState.glitchOffset *= 0.9;

// 2. Update Quasicrystal Field
const phi = 1.6180339887; // Golden Ratio
const timeScaled = time * 0.8;
for(let i = 0; i < W * H; i++) {
    let sum = 0;
    for(let j = 0; j < 5; j++) {
        // Waves drift at different golden-ratio-scaled speeds, causing the structure to morph
        sum += Math.cos(phases[j * W * H + i] - timeScaled * Math.pow(phi, j - 2) + (j % 2 === 0 ? glitch : -glitch)); 
    }
    Q[i] = (sum / 5.0) * 0.5 + 0.5; 
}

// 3. Parasite-Host Interaction (Mouse input)
if (mouse.isPressed) {
    let mx = Math.floor(mouse.x / scale);
    let my = Math.floor(mouse.y / scale);
    let radius = Math.floor(10 / scale) + 1;
    for(let dy = -radius; dy <= radius; dy++) {
        for(let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
                let px = (mx + dx + W) % W;
                let py = (my + dy + H) % H;
                B[py * W + px] = 1.0;
                A[py * W + px] = 0.0;
            }
        }
    }
}

// 4. Aperiodic Reaction-Diffusion (Gray-Scott)
for (let step = 0; step < 4; step++) {
    for(let y = 0; y < H; y++) {
        let ym1w = ((y - 1 + H) % H) * W;
        let yp1w = ((y + 1) % H) * W;
        let yw = y * W;
        
        for(let x = 0; x < W; x++) {
            let xm1 = (x - 1 + W) % W;
            let xp1 = (x + 1) % W;
            let i = yw + x;
            
            let a = A[i];
            let b = B[i];
            
            // 3x3 Laplacian
            let lapA = 
                (A[ym1w + x] + A[yp1w + x] + A[yw + xm1] + A[yw + xp1]) * 0.2 +
                (A[ym1w + xm1] + A[ym1w + xp1] + A[yp1w + xm1] + A[yp1w + xp1]) * 0.05 - a;
                
            let lapB = 
                (B[ym1w + x] + B[yp1w + x] + B[yw + xm1] + B[yw + xp1]) * 0.2 +
                (B[ym1w + xm1] + B[ym1w + xp1] + B[yp1w + xm1] + B[yp1w + xp1]) * 0.05 - b;
                
            let abb = a * b * b;
            let q = Q[i]; 
            
            // Quasicrystal field modulates the reaction, forcing Turing patterns into 5-fold symmetry
            let f = 0.024 + 0.014 * q;
            let k = 0.049 + 0.012 * q;
            
            nextA[i] = a + (1.0 * lapA - abb + f * (1.0 - a));
            nextB[i] = b + (0.5 * lapB + abb - (k + f) * b);
            
            // Continuous injection at quasicrystal peaks to prevent total die-off (Thermal Bloom)
            if (q > 0.85) nextB[i] += 0.003;
            
            if (nextA[i] > 1.0) nextA[i] = 1.0; else if (nextA[i] < 0.0) nextA[i] = 0.0;
            if (nextB[i] > 1.0) nextB[i] = 1.0; else if (nextB[i] < 0.0) nextB[i] = 0.0;
        }
    }
    let tempA = A; A = nextA; nextA = tempA;
    let tempB = B; B = nextB; nextB = tempB;
}
canvas.__gsState.A = A;
canvas.__gsState.B = B;
canvas.__gsState.nextA = nextA;
canvas.__gsState.nextB = nextB;

// 5. Bayer Dithering & Lisa Frank Palette Mapping
const data = imgData.data;
const bayer4x4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
];

// Hyper-saturated 12-step neon ramp
const palette = [
  [10, 0, 20],      // Deep Void
  [30, 0, 60],      // Dark Purple
  [100, 0, 150],    // Royal Purple
  [180, 0, 200],    // Magenta
  [255, 0, 128],    // Hot Pink
  [255, 100, 0],    // Neon Orange
  [255, 200, 0],    // Bright Yellow
  [255, 255, 0],    // Laser Yellow
  [0, 255, 200],    // Mint
  [0, 255, 255],    // Cyan
  [200, 255, 255],  // Pale Cyan
  [255, 255, 255]   // White
];
const pLen = palette.length;

for(let y = 0; y < H; y++) {
    for(let x = 0; x < W; x++) {
        let i = y * W + x;
        // Invert so active infection (high B, low A) is bright
        let v = 1.0 - (A[i] - B[i]); 
        v = Math.max(0, Math.min(1, v));
        
        let bayer = (bayer4x4[(y % 4) * 4 + (x % 4)] / 16.0) - 0.5;
        let v_dither = v + bayer * 0.2; 
        
        let pIdx = Math.floor(v_dither * pLen);
        if (pIdx < 0) pIdx = 0;
        if (pIdx >= pLen) pIdx = pLen - 1;
        
        let color = palette[pIdx];
        let idx = i * 4;
        data[idx] = color[0];
        data[idx+1] = color[1];
        data[idx+2] = color[2];
        data[idx+3] = 255;
    }
}

// 6. Pixel-Grid Locked Render
offCtx.putImageData(imgData, 0, 0);

ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.imageSmoothingEnabled = false;
const drawW = W * scale;
const drawH = H * scale;
const offsetX = Math.floor((grid.width - drawW) / 2);
const offsetY = Math.floor((grid.height - drawH) / 2);

ctx.drawImage(offscreen, offsetX, offsetY, drawW, drawH);