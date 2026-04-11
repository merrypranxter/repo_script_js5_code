// [FERAL DESIGN-BRAIN: ENGAGED]
// OBVIOUS ANSWER: A simple 2D grid showing Conway's Game of Life in neon colors.
// REJECTION: Too clean, too static, too expected.
// STRANGE MECHANISM: "Overclocked Dither-Voxel Display Matrix." 
// We combine 1D Elementary Cellular Automata (Wolfram rules) cascading down a 2D isometric grid.
// The cells don't move; they act as a physical height-map matrix. 
// We inject the "pixel_voxel" repo's Bayer 4x4 ordered dithering directly into the voxel faces 
// using procedurally generated canvas patterns, forced through a hyper-saturated "Lisa Frank" acid palette.
// The system suffers from domain warping (spatial distortion) and emits neon spores when cells overheat.

(function(ctx, grid, time, repos, input, mouse, canvas) {
    // 1. INITIALIZE FERAL STATE
    if (!canvas.__weirdState) {
        const W = 40;
        const H = 40;
        
        // Lisa Frank Acid Palette
        const colors = [
            "#FF0099", // Neon Magenta
            "#00FFFF", // Cyan
            "#FAFF00", // Electric Yellow
            "#00FF66", // Toxic Green
            "#8A2BE2"  // Deep Violet
        ];

        // Bayer 4x4 matrix for Ditherpunk aesthetic
        const bayer = [
            0, 8, 2, 10,
            12, 4, 14, 6,
            3, 11, 1, 9,
            15, 7, 13, 5
        ];

        // Generate Dither Patterns
        const patterns = [];
        for (let i = 0; i < colors.length; i++) {
            let c1 = colors[i];
            let c2 = colors[(i + 1) % colors.length];
            
            let makePat = (col1, col2, mode) => {
                let oc = document.createElement('canvas');
                oc.width = 4; oc.height = 4;
                let ox = oc.getContext('2d');
                for (let j = 0; j < 16; j++) {
                    let fill = col1;
                    if (mode === 'dither') fill = (bayer[j] / 16 < 0.5) ? col1 : col2;
                    if (mode === 'solid2') fill = col2;
                    ox.fillStyle = fill;
                    ox.fillRect(j % 4, Math.floor(j / 4), 1, 1);
                }
                return ctx.createPattern(oc, 'repeat');
            };

            patterns.push({
                top: makePat(c1, c2, 'solid1'),   // Brightest
                left: makePat(c1, c2, 'dither'),  // Midtone (Dithered)
                right: makePat(c1, c2, 'solid2'), // Shadow
                raw: c1
            });
        }

        // Initialize CA and Height arrays
        let currCA = new Array(W).fill(0);
        currCA[Math.floor(W / 2)] = 1; // Seed
        
        let history = [];
        let heights = [];
        for (let y = 0; y < H; y++) {
            history.push(new Array(W).fill(0));
            heights.push(new Array(W).fill(0));
        }

        canvas.__weirdState = {
            W: W,
            H: H,
            currCA: currCA,
            history: history,
            heights: heights,
            patterns: patterns,
            lastTick: 0,
            spores: []
        };
    }

    const state = canvas.__weirdState;
    const { W, H, currCA, history, heights, patterns, spores } = state;

    // 2. CLEAR TO DEEP VOID
    ctx.fillStyle = '#0a0014';
    ctx.fillRect(0, 0, grid.width, grid.height);

    // 3. CELLULAR AUTOMATA EVOLUTION (The Engine)
    // Rule mutates based on time and mouse, creating "glitchy circuitry"
    let baseRule = Math.floor(time * 3) % 256;
    let mouseInject = mouse.isPressed ? Math.floor((mouse.x / grid.width) * 255) : 0;
    let rule = (baseRule ^ mouseInject) % 256;

    if (time - state.lastTick > 0.08) {
        let nextCA = new Array(W).fill(0);
        let sum = 0;
        
        for (let i = 0; i < W; i++) {
            let left = currCA[(i - 1 + W) % W];
            let center = currCA[i];
            let right = currCA[(i + 1) % W];
            
            // Wolfram Elementary CA logic
            let idx = (left << 2) | (center << 1) | right;
            nextCA[i] = (rule >> idx) & 1;
            sum += nextCA[i];
        }

        // Feral Injection: if it dies out, or mouse is pressed, reseed randomly
        if (sum === 0 || mouse.isPressed) {
            nextCA[Math.floor(Math.random() * W)] = 1;
            nextCA[Math.floor(Math.random() * W)] = 1;
        }

        // Shift history (waterfall effect)
        history.pop();
        history.unshift(currCA);
        state.currCA = nextCA;
        state.lastTick = time;
    }

    // 4. PHYSICS & RELAXATION (The Meat)
    let maxH = grid.height * 0.15;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let target = history[y][x] * maxH;
            // Smoothly interpolate heights for organic "breathing" matrix
            heights[y][x] += (target - heights[y][x]) * 0.25;
        }
    }

    // 5. ISOMETRIC PROJECTION & RENDER (The Visualization)
    let halfW = (grid.width * 0.6) / W;
    let halfH = halfW * 0.5;
    
    let cx = grid.width / 2;
    let cy = grid.height * 0.2; // Start near top

    // Domain Warping parameters
    let warpFreq = 0.15 + Math.sin(time) * 0.05;
    let warpAmp = 15;

    // Draw back-to-front for correct isometric overlap
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let px = cx + (x - y) * halfW;
            let py = cy + (x + y) * halfH;

            // Spatial distortion (The "Infection")
            let warp = Math.sin(time * 4 + x * warpFreq + y * warpFreq) * warpAmp;
            // Mouse repeller
            let dx = mouse.x - px;
            let dy = mouse.y - py;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 100) {
                warp -= (100 - dist) * 0.2;
            }
            py += warp;

            let h = heights[y][x];

            // Color cycling based on position and time (Lisa Frank overdrive)
            let colorIdx = Math.floor((x + y + time * 10) % patterns.length);
            let pats = patterns[colorIdx];

            // Draw Left Face (Dithered)
            ctx.fillStyle = pats.left;
            ctx.beginPath();
            ctx.moveTo(px - halfW, py - h);
            ctx.lineTo(px, py + halfH - h);
            ctx.lineTo(px, py + halfH);
            ctx.lineTo(px - halfW, py);
            ctx.fill();

            // Draw Right Face (Solid Shadow)
            ctx.fillStyle = pats.right;
            ctx.beginPath();
            ctx.moveTo(px, py + halfH - h);
            ctx.lineTo(px + halfW, py - h);
            ctx.lineTo(px + halfW, py);
            ctx.lineTo(px, py + halfH);
            ctx.fill();

            // Draw Top Face (Solid Highlight)
            ctx.fillStyle = pats.top;
            ctx.beginPath();
            ctx.moveTo(px, py - halfH - h);
            ctx.lineTo(px + halfW, py - h);
            ctx.lineTo(px, py + halfH - h);
            ctx.lineTo(px - halfW, py - h);
            ctx.fill();

            // Crisp 1px Outline (pixel_voxel outline_sobel influence)
            if (h > 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Emit Spores if cell is "hot"
            if (h > maxH * 0.8 && Math.random() < 0.02) {
                spores.push({
                    x: px,
                    y: py - h,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3 - 1,
                    life: 1.0,
                    color: pats.raw
                });
            }
        }
    }

    // 6. SPORE PARTICLE SYSTEM (Emergent Behavior)
    ctx.globalCompositeOperation = 'screen';
    for (let i = spores.length - 1; i >= 0; i--) {
        let s = spores[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05; // slight gravity
        s.life -= 0.02;

        if (s.life <= 0) {
            spores.splice(i, 1);
            continue;
        }

        let radius = Math.max(0.1, s.life * 4);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 7. HUD / RULE DISPLAY (Diagnostic Feral Output)
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`CA_RULE: ${rule} | OVERCLOCK: ${warpAmp.toFixed(1)} | SPORES: ${spores.length}`, 10, 20);
    ctx.fillText(`AESTHETIC: LISA_FRANK_ACID // DITHER: BAYER_4X4`, 10, 35);
    
})(ctx, grid, time, repos, input, mouse, canvas);