const out = [];
const cx = grid.cols / 2;
const cy = grid.rows / 2;
const aspect = 2.0;

const bgChars = "0123456789ABCDEF$#@%&*";
const tentacleChars = " .:*oO8@#";
const repoWords = [
    "AZATHOTH.SYS", "CPU_CORE", "RAFT_CONSENSUS", "CHAOS.DLL", 
    "NOUVEAU_UI", "MOTIF_EXP", "LOVECRAFT_OS", "GLSL_RENDER", 
    "ELDRITCH_PROC", "TENTACLE.EXE", "MYTHOS_KERNEL", "SIMULATION"
];

for (let y = 0; y < grid.rows; y++) {
    let row = [];
    
    let word = repoWords[y % repoWords.length];
    let wordHash = Math.sin(y * 99.99 + Math.floor(time * 2)) * 1000;
    let wordStartX = Math.floor(Math.abs(wordHash)) % grid.cols;
    let showWord = (Math.abs(wordHash) % 10) > 8;

    for (let x = 0; x < grid.cols; x++) {
        let breath = Math.sin(time * 1.5) * 0.05 + 1.0;
        let nx = ((x - cx) / grid.cols) * breath;
        let ny = ((y - cy) / grid.cols * aspect) * breath;
        
        let r = Math.sqrt(nx*nx + ny*ny);
        let theta = Math.atan2(ny, nx);
        
        let char = ' ';
        let color = '#000';
        
        let tStep = Math.floor(time * 15 - y * 0.8); 
        let h = Math.sin(x * 12.9898 + y * 78.233 + tStep) * 43758.5453;
        let isGlitch = Math.abs(h) - Math.floor(Math.abs(h)) > 0.96;
        
        if (showWord && x >= wordStartX && x < wordStartX + word.length) {
            char = word[x - wordStartX];
            color = `hsl(120, 100%, ${15 + Math.random()*25}%)`;
        } else if (isGlitch) {
            char = bgChars[Math.floor(Math.abs(h) * bgChars.length) % bgChars.length];
            color = "#003300"; 
        }
        
        let N = 7; 
        let angleStep = (Math.PI * 2) / N;
        
        let wiggle = Math.sin(r * 15.0 - time * 5.0) * 0.15 + Math.cos(r * 25.0 + time * 3.0) * 0.1;
        let spiral = r * 3.5 + wiggle;
        let twistedTheta = theta + spiral - time * 0.8;
        
        let tMod = ((twistedTheta % angleStep) + angleStep) % angleStep;
        let angularDist = Math.abs(tMod - angleStep / 2.0);
        let spatialDist = angularDist * r;
        
        let thickness = 0.15 * Math.exp(-r * 3.0) + 0.015;
        
        let bN = 11;
        let bAngleStep = (Math.PI * 2) / bN;
        let branchSpiral = -r * 5.0 + Math.cos(r * 15.0 + time * 4.0) * 0.2;
        let branchTheta = theta + branchSpiral + time * 0.6;
        let bMod = ((branchTheta % bAngleStep) + bAngleStep) % bAngleStep;
        let bAngularDist = Math.abs(bMod - bAngleStep / 2.0);
        let bSpatialDist = bAngularDist * r;
        let bThickness = 0.06 * Math.exp(-r * 4.0) + 0.005;

        let isCore = r < 0.03 + Math.sin(time*10)*0.005;
        if (isCore) {
            char = Math.random() > 0.2 ? '@' : '#';
            color = `hsl(${Math.random()*360}, 100%, 80%)`; 
        } else if (spatialDist < thickness) {
            let intensity = Math.pow(1.0 - (spatialDist / thickness), 0.8); 
            let cIdx = Math.floor(intensity * (tentacleChars.length - 1));
            if (cIdx > 0) {
                char = tentacleChars[Math.min(tentacleChars.length-1, cIdx)];
                
                let tentacleIdx = Math.round(twistedTheta / angleStep);
                let absIdx = ((tentacleIdx % 3) + 3) % 3;
                
                let l = intensity * 40 + 30;
                if (absIdx === 0) color = `hsl(280, 100%, ${l}%)`; 
                else if (absIdx === 1) color = `hsl(150, 100%, ${l}%)`; 
                else color = `hsl(190, 100%, ${l}%)`; 
                
                if (intensity > 0.6 && Math.sin(r * 100.0 - time * 15.0) > 0.85) {
                    char = Math.random() > 0.5 ? 'O' : '8';
                    color = "#ff00ff"; 
                }
                
                if (Math.random() < 0.002) {
                    char = bgChars[Math.floor(Math.random() * bgChars.length)];
                    color = "#ffffff";
                }
            }
        } else if (bSpatialDist < bThickness && r < 0.4) {
            let intensity = 1.0 - (bSpatialDist / bThickness);
            if (intensity > 0.2) {
                char = intensity > 0.6 ? '+' : '~';
                color = `hsl(320, 100%, ${intensity * 40 + 20}%)`; 
            }
        }
        
        row.push({ char, color });
    }
    out.push(row);
}
return out;