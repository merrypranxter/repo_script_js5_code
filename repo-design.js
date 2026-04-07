const output = [];
const astralStr = "ASTRAL_OS//ANU_KERNEL//SHADOW_STRAND//GLSL//CHEMISTRY//";
const rococoStr = "Rococo~Motifs~Gilded~Ornate~Palettes~Style~Victorian~";

const rococoColors = ['#FFD700', '#FFB6C1', '#FDF5E6', '#E6E6FA', '#FF69B4', '#DA70D6'];
const astralColors = ['#00F5D4', '#7B2CBF', '#9D4EDD', '#F1FAEE', '#39FF14', '#00FFFF'];

for (let y = 0; y < grid.rows; y++) {
  const row = [];
  for (let x = 0; x < grid.cols; x++) {
    const px = x * 10;
    const py = y * 18;
    const dx = px - mouse.x;
    const dy = py - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const uvX = x / grid.cols;
    const uvY = y / grid.rows;
    
    const qX = Math.sin(uvX * 8.0 + time * 0.6) + Math.cos(uvY * 8.0 + time * 0.6);
    const qY = Math.sin(uvY * 8.0 - time * 0.6) + Math.cos(uvX * 8.0 - time * 0.6);
    const f = Math.sin(uvX * 18.0 + qX * 2.5) + Math.cos(uvY * 18.0 + qY * 2.5);
    
    const astralGrid = (x % 8 === 0 || y % 6 === 0) ? 1 : 0;
    const astralWave = Math.sin(x * 0.3 + time * 3) + Math.cos(y * 0.3 - time * 3);
    
    const hoverIntensity = Math.max(0, 1 - (dist / 180));
    let isAstral = false;
    
    if (mouse.isPressed) {
        const ripple = Math.sin(dist * 0.06 - time * 12);
        if (ripple > 0.4 && dist < 400) isAstral = true;
        if (dist < 100) isAstral = true;
    } else {
        if (astralWave > 1.7) isAstral = true;
    }
    
    let char, color, size;
    
    if (isAstral) {
        const strIdx = Math.floor(x + y + time * 8);
        char = astralGrid ? '+' : astralStr[(strIdx + astralStr.length) % astralStr.length];
        if (astralGrid && x % 8 === 0 && y % 6 === 0) char = '✛';
        
        const colorIdx = Math.floor(Math.abs(astralWave * 4 + hoverIntensity * 6)) % astralColors.length;
        color = astralColors[colorIdx];
        size = 12 + astralGrid * 4 + hoverIntensity * 14;
        
        if (hoverIntensity > 0.8) {
            color = '#FFFFFF';
            size += Math.random() * 6;
            char = Math.random() > 0.5 ? '1' : '0';
        }
    } else {
        const swirlVal = Math.abs(f);
        const strIdx = Math.floor(swirlVal * 12 + x * 0.5 - time * 3);
        
        char = rococoStr[((strIdx % rococoStr.length) + rococoStr.length) % rococoStr.length];
        
        if (swirlVal > 1.8) char = '§';
        if (swirlVal < 0.2) char = '✧';
        if (swirlVal > 1.0 && swirlVal < 1.1) char = '❀';
        
        const colorIdx = Math.floor(swirlVal * 5 + hoverIntensity * 4) % rococoColors.length;
        color = rococoColors[colorIdx];
        size = 10 + swirlVal * 6 + hoverIntensity * 8;
        
        size += Math.sin(time * 2.5 + uvX * 6) * 2.5;
    }
    
    row.push({ char, color, size });
  }
  output.push(row);
}
return output;