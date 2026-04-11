const FERAL_LISA_FRANK_CA = (() => {
    let initialized = false;
    let cols, rows;
    let cellSize = 8;
    let cells = [];
    let nextCells = [];
    let ages = [];
    
    // Rule 30 1D array
    let rule30 = [];
    let nextRule30 = [];
    let scanlineY = 0;

    const numStates = 14;
    const palette = [];
    const spotColor = '#0a0510'; // Deep dark violet/black for leopard spots

    // Generate a hyper-vibrant, slightly toxic Lisa Frank palette
    for (let i = 0; i < numStates; i++) {
        let h = (i / numStates) * 360;
        // Warp hues to favor hot pinks, cyans, and electric yellows, skip muddy greens
        if (h > 80 && h < 160) h += 90; 
        palette.push(`hsl(${h}, 100%, 60%)`);
    }

    function init(width, height) {
        cols = Math.floor(width / cellSize);
        rows = Math.floor(height / cellSize);
        
        cells = new Int32Array(cols * rows);
        nextCells = new Int32Array(cols * rows);
        ages = new Int32Array(cols * rows);
        
        rule30 = new Int32Array(cols);
        nextRule30 = new Int32Array(cols);

        // Seed Cyclic CA with noise
        for (let i = 0; i < cells.length; i++) {
            cells[i] = Math.floor(Math.random() * numStates);
            ages[i] = 0;
        }

        // Seed Rule 30 with a single point
        rule30[Math.floor(cols / 2)] = 1;
        
        initialized = true;
    }

    function getIndex(x, y) {
        // Toroidal wrap
        const cx = (x + cols) % cols;
        const cy = (y + rows) % rows;
        return cx + cy * cols;
    }

    function update(mouse, time) {
        // --- 1. CYCLIC CA UPDATE (The Neon Swarm) ---
        // Threshold fluctuates to create "breathing" spirals
        const baseThreshold = 1;
        const dynamicThreshold = baseThreshold + Math.floor(Math.sin(time * 2) * 1.5); 

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = getIndex(x, y);
                const currentState = cells[idx];
                const targetState = (currentState + 1) % numStates;
                let targetCount = 0;

                // Moore neighborhood
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (cells[getIndex(x + dx, y + dy)] === targetState) {
                            targetCount++;
                        }
                    }
                }

                // Mouse interaction: localized chaos injection
                let distToMouse = 9999;
                if (mouse.x && mouse.y) {
                    const mx = mouse.x / cellSize;
                    const my = mouse.y / cellSize;
                    distToMouse = Math.hypot(mx - x, my - y);
                }

                if (distToMouse < 5 && mouse.isPressed) {
                    nextCells[idx] = Math.floor(Math.random() * numStates);
                    ages[idx] = 0;
                } else if (targetCount >= Math.max(1, dynamicThreshold)) {
                    nextCells[idx] = targetState;
                    ages[idx] = 0; // Reset age on change
                } else {
                    nextCells[idx] = currentState;
                    ages[idx]++; // Age increases if stagnant
                }
            }
        }

        // Swap buffers
        for (let i = 0; i < cells.length; i++) {
            cells[i] = nextCells[i];
        }

        // --- 2. RULE 30 INJECTION (The Bureaucratic Glitch) ---
        // A 1D CA that sweeps down the screen, corrupting the 2D spirals
        for (let x = 0; x < cols; x++) {
            const left = rule30[(x - 1 + cols) % cols];
            const center = rule30[x];
            const right = rule30[(x + 1) % cols];
            
            // Rule 30 binary: 00011110
            const pattern = (left << 2) | (center << 1) | right;
            nextRule30[x] = (30 >> pattern) & 1;
        }

        for (let x = 0; x < cols; x++) {
            rule30[x] = nextRule30[x];
            // Inject the 1D glitch into the 2D grid at the scanline
            if (rule30[x] === 1) {
                const idx = getIndex(x, scanlineY);
                cells[idx] = (cells[idx] + 7) % numStates; // Spike the color
                ages[idx] = 0;
            }
        }

        scanlineY = (scanlineY + 1) % rows;
    }

    function draw(ctx, width, height, time) {
        // Feral smearing: don't clear completely, leave a dark trail
        ctx.fillStyle = 'rgba(5, 2, 10, 0.15)';
        ctx.fillRect(0, 0, width, height);

        // Domain warping parameters
        const warpFreq = 0.05;
        const warpAmp = 5;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = getIndex(x, y);
                const state = cells[idx];
                const age = ages[idx];

                // Warp the grid slightly so it feels organic/melted
                const drawX = x * cellSize + Math.sin(y * warpFreq + time) * warpAmp;
                const drawY = y * cellSize + Math.cos(x * warpFreq + time) * warpAmp;

                if (age > 40) {
                    // LEOPARD SPOTS: Cells that resist change crystallize into dark voids
                    // This mimics Lisa Frank animal print overlays
                    const spotSize = Math.min(cellSize * 1.5, (age - 40) * 0.2);
                    ctx.fillStyle = spotColor;
                    ctx.beginPath();
                    ctx.arc(drawX + cellSize/2, drawY + cellSize/2, spotSize, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // NEON BLOOM: Active cells
                    ctx.fillStyle = palette[state];
                    
                    // Pulse size based on state and time
                    const sizePulse = cellSize * 0.4 + (Math.sin(time * 5 + state) * cellSize * 0.3);
                    
                    if (state % 3 === 0) {
                        // Draw some as stars/diamonds
                        ctx.beginPath();
                        ctx.moveTo(drawX + cellSize/2, drawY - sizePulse);
                        ctx.lineTo(drawX + cellSize/2 + sizePulse, drawY + cellSize/2);
                        ctx.lineTo(drawX + cellSize/2, drawY + cellSize + sizePulse);
                        ctx.lineTo(drawX + cellSize/2 - sizePulse, drawY + cellSize/2);
                        ctx.fill();
                    } else {
                        // Draw others as fluid circles
                        ctx.beginPath();
                        ctx.arc(drawX + cellSize/2, drawY + cellSize/2, sizePulse, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw the Glitch Scanline as a searing white/cyan tear
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let x = 0; x < cols; x++) {
            if (rule30[x] === 1) {
                const drawX = x * cellSize + Math.sin(scanlineY * warpFreq + time) * warpAmp;
                const drawY = scanlineY * cellSize + Math.cos(x * warpFreq + time) * warpAmp;
                ctx.fillRect(drawX, drawY, cellSize, cellSize * 2);
            }
        }
    }

    return {
        run: (ctx, grid, time, mouse) => {
            if (!initialized || cols !== Math.floor(grid.width / cellSize) || rows !== Math.floor(grid.height / cellSize)) {
                init(grid.width, grid.height);
            }
            update(mouse, time);
            draw(ctx, grid.width, grid.height, time);
        }
    };
})();

// Main export execution
FERAL_LISA_FRANK_CA.run(ctx, grid, time, mouse);