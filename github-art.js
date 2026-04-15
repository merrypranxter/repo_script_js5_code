// FERAL DESIGN BRAIN: ACTIVE
// MECHANISM: Cyberdelic Mycelial Membrane (Domain-Warped Gray-Scott CA + CMYK Xerox Artifacts)
// REJECTED: Clean, mathematically perfect Turing patterns.
// EMBRACED: Chromatic aberration, photocopy noise, Lisa Frank neon palettes, and glitch scan-bends.

if (!canvas.__feralCA) {
    // --------------------------------------------------------
    // 1. INITIALIZE THE REACTION-DIFFUSION SUBSTRATE
    // --------------------------------------------------------
    const W = 256;
    const H = 256;
    const SIZE = W * H;

    const state = {
        W, H, SIZE,
        u: new Float32Array(SIZE).fill(1.0),
        v: new Float32Array(SIZE).fill(0.0),
        next_u: new Float32Array(SIZE),
        next_v: new Float32Array(SIZE),
        F_map: new Float32Array(SIZE),
        k_map: new Float32Array(SIZE),
        offCanvas: document.createElement('canvas'),
        lutR: new Uint8Array(256),
        lutG: new Uint8Array(256),
        lutB: new Uint8Array(256),
        lastMouse: { x: -1, y: -1 }
    };

    state.offCanvas.width = W;
    state.offCanvas.height = H;
    state.offCtx = state.offCanvas.getContext('2d', { willReadFrequently: true });
    state.imgData = state.offCtx.createImageData(W, H);

    // --------------------------------------------------------
    // 2. BUILD THE "LISA FRANK / ACID VIBRATION" PALETTE LUT
    // --------------------------------------------------------
    // Repo 4: Cyberdelic Neon + Acid Vibration
    const hexToRgb = (hex) => {
        let bigint = parseInt(hex.replace('#', ''), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const stops = [
        { pct: 0.00, c: hexToRgb('#040608') }, // Void Black
        { pct: 0.15, c: hexToRgb('#3D0070') }, // Deep Violet
        { pct: 0.30, c: hexToRgb('#FF00C8') }, // Hot Magenta
        { pct: 0.50, c: hexToRgb('#FF6B00') }, // Electric Orange
        { pct: 0.70, c: hexToRgb('#FFE800') }, // Riso Yellow
        { pct: 0.85, c: hexToRgb('#00FFF0') }, // Neon Cyan
        { pct: 1.00, c: hexToRgb('#FFFFFF') }  // Hot White
    ];

    for (let i = 0; i < 256; i++) {
        let pct = i / 255;
        let c1 = stops[0], c2 = stops[stops.length - 1];
        for (let j = 0; j < stops.length - 1; j++) {
            if (pct >= stops[j].pct && pct <= stops[j + 1].pct) {
                c1 = stops[j]; c2 = stops[j + 1]; break;
            }
        }
        let t = (pct - c1.pct) / (c2.pct - c1.pct);
        state.lutR[i] = c1.c[0] + t * (c2.c[0] - c1.c[0]);
        state.lutG[i] = c1.c[1] + t * (c2.c[1] - c1.c[1]);
        state.lutB[i] = c1.c[2] + t * (c2.c[2] - c1.c[2]);
    }

    // --------------------------------------------------------
    // 3. GENERATE DOMAIN-WARPED PARAMETER MAPS (NOISE REPO)
    // --------------------------------------------------------
    // A simple value noise implementation to create geological strata of pattern types
    const P = new Uint8Array(512);
    for (let i = 0; i < 256; i++) P[i] = P[i + 256] = Math.floor(Math.random() * 256);
    const lerp = (t, a, b) => a + t * (b - a);
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

    const vnoise = (x, y) => {
        let X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        let u = fade(x), v = fade(y);
        let A = P[X] + Y, B = P[X + 1] + Y;
        return lerp(v, lerp(u, P[P[A]], P[P[B]]), lerp(u, P[P[A + 1]], P[P[B + 1]])) / 255;
    };

    // Map the grid to different Gray-Scott ecosystem zones
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let nx = x * 0.015, ny = y * 0.015;
            // Domain warp: perturb the noise coordinates with another noise
            let warpX = vnoise(nx + 5.2, ny + 1.3) * 2.0;
            let warpY = vnoise(nx + 1.7, ny + 9.2) * 2.0;
            let n = vnoise(nx + warpX, ny + warpY); 

            // Blend between Chaos (ε), U-Skate (π), and Turing Spots (δ)
            state.F_map[y * W + x] = lerp(n, 0.018, 0.070);
            state.k_map[y * W + x] = lerp(n, 0.055, 0.063);
        }
    }

    // Seed the center to start the reaction
    for (let i = 0; i < 20; i++) {
        let cx = W/2 + (Math.random()-0.5)*40;
        let cy = H/2 + (Math.random()-0.5)*40;
        for (let y = -5; y <= 5; y++) {
            for (let x = -5; x <= 5; x++) {
                state.v[Math.floor(cy + y) * W + Math.floor(cx + x)] = 1.0;
            }
        }
    }

    // --------------------------------------------------------
    // 4. CREATE HALFTONE / XEROX PRINT ARTIFACT PATTERN
    // --------------------------------------------------------
    const ptCanvas = document.createElement('canvas');
    ptCanvas.width = 4; ptCanvas.height = 4;
    const pCtx = ptCanvas.getContext('2d');
    pCtx.fillStyle = '#000'; // Dark dot
    pCtx.beginPath(); pCtx.arc(2, 2, 1.2, 0, Math.PI * 2); pCtx.fill();
    state.halftonePat = ctx.createPattern(ptCanvas, 'repeat');

    canvas.__feralCA = state;
}

const state = canvas.__feralCA;
const { W, H, SIZE, u, v, next_u, next_v, F_map, k_map, lutR, lutG, lutB } = state;

// --------------------------------------------------------
// 5. MOUSE INTERACTION: INJECT SPORES
// --------------------------------------------------------
let mx = Math.floor((mouse.x / grid.width) * W);
let my = Math.floor((mouse.y / grid.height) * H);

if (mouse.isPressed && mx >= 0 && mx < W && my >= 0 && my < H) {
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            let px = (mx + dx + W) % W;
            let py = (my + dy + H) % H;
            v[py * W + px] = 1.0;
            u[py * W + px] = 0.0;
        }
    }
}

// Spontaneous Glitch Spore Injection (keeps the ecosystem alive)
if (Math.random() < 0.02) {
    let px = Math.floor(Math.random() * W);
    let py = Math.floor(Math.random() * H);
    v[py * W + px] = 1.0;
}

// --------------------------------------------------------
// 6. GRAY-SCOTT REACTION-DIFFUSION CA LOOP (CPU OPTIMIZED)
// --------------------------------------------------------
// 9-point Karl Sims Laplacian. Runs multiple micro-steps per frame.
const steps = 8;
for (let s = 0; s < steps; s++) {
    for (let y = 0; y < H; y++) {
        let yw = y * W;
        let y_up = ((y - 1 + H) % H) * W;
        let y_down = ((y + 1) % H) * W;

        for (let x = 0; x < W; x++) {
            let idx = yw + x;
            let x_l = (x - 1 + W) % W;
            let x_r = (x + 1) % W;

            let U = u[idx];
            let V = v[idx];

            let lapU = -U 
                + 0.2 * (u[yw + x_l] + u[yw + x_r] + u[y_up + x] + u[y_down + x])
                + 0.05 * (u[y_up + x_l] + u[y_up + x_r] + u[y_down + x_l] + u[y_down + x_r]);
                
            let lapV = -V 
                + 0.2 * (v[yw + x_l] + v[yw + x_r] + v[y_up + x] + v[y_down + x])
                + 0.05 * (v[y_up + x_l] + v[y_up + x_r] + v[y_down + x_l] + v[y_down + x_r]);

            let uvv = U * V * V;
            let F = F_map[idx];
            let k = k_map[idx];

            // Forward Euler integration
            next_u[idx] = Math.max(0, Math.min(1, U + (1.0 * lapU - uvv + F * (1.0 - U))));
            next_v[idx] = Math.max(0, Math.min(1, V + (0.5 * lapV + uvv - (F + k) * V)));
        }
    }
    // Swap buffers
    u.set(next_u);
    v.set(next_v);
}

// --------------------------------------------------------
// 7. RENDER PASS: CHROMATIC ABERRATION & CMYK MISREGISTRATION
// --------------------------------------------------------
// Repo 4: "Glitch Scan Bend" & "CMYK Misregistration"
let data = state.imgData.data;
let baseAberration = Math.floor(2 + Math.sin(time * 2) * 2);

for (let y = 0; y < H; y++) {
    // Scanline dropout / glitch artifact
    let rowAberration = baseAberration;
    if (Math.random() < 0.02) rowAberration += Math.floor(Math.random() * 15); 

    let yw = y * W;
    for (let x = 0; x < W; x++) {
        let idx = yw + x;
        
        // Misregister the reads for R, G, B channels based on the V concentration
        let idx_l = yw + ((x - rowAberration + W) % W);
        let idx_r = yw + ((x + rowAberration) % W);

        let v_val = v[idx];
        let v_left = v[idx_l];
        let v_right = v[idx_r];

        // Map to Acid Vibration palette
        let cR = lutR[Math.floor(v_left * 255)];
        let cG = lutG[Math.floor(v_val * 255)];
        let cB = lutB[Math.floor(v_right * 255)];

        let pIdx = idx * 4;
        data[pIdx] = cR;
        data[pIdx + 1] = cG;
        data[pIdx + 2] = cB;
        data[pIdx + 3] = 255;
    }
}

// --------------------------------------------------------
// 8. FINAL COMPOSITING: XEROX & HALFTONE OVERLAY
// --------------------------------------------------------
state.offCtx.putImageData(state.imgData, 0, 0);

ctx.save();
// Disable smoothing for raw, crunchy pixel scaling
ctx.imageSmoothingEnabled = false;

// Draw the cyberdelic mycelium stretched to the canvas
ctx.drawImage(state.offCanvas, 0, 0, grid.width, grid.height);

// Apply Print Artifact: Halftone Dot Screen (Repo 4)
ctx.globalCompositeOperation = 'overlay';
ctx.fillStyle = state.halftonePat;
ctx.globalAlpha = 0.4;
ctx.fillRect(0, 0, grid.width, grid.height);

// Apply Print Artifact: Xerox Edge Vignette / Toner Burn
ctx.globalCompositeOperation = 'multiply';
let gradient = ctx.createRadialGradient(
    grid.width / 2, grid.height / 2, grid.width * 0.3,
    grid.width / 2, grid.height / 2, grid.width * 0.8
);
gradient.addColorStop(0, 'rgba(20, 0, 40, 0)');
gradient.addColorStop(1, 'rgba(10, 0, 20, 0.9)');
ctx.fillStyle = gradient;
ctx.globalAlpha = 1.0;
ctx.fillRect(0, 0, grid.width, grid.height);

ctx.restore();