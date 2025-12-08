(async () => {
    const app = new PIXI.Application();
    await app.init({
        resizeTo: window,
        backgroundColor: 0x000000,
        antialias: true,
        preference: 'webgpu'
    });
    document.body.appendChild(app.canvas);

    // --- CONSTANTS ---
    const MAX_RENDER_CAPACITY = 150000;
    const TAU = Math.PI * 2;
    const SYSTEM_SCALE = 300;

    const GameState = {
        // Currencies
        entropy: 0,
        darkMatter: 0,
        prestigeLevel: 0,

        // Physics / Stats
        baseTimeSpeed: 0.0005,
        frictionCoeff: 0.000000015,
        particleCount: 20,     // Linear internal value (20 -> 380)
        decayRate: 0.01,

        // Runtime State
        currentTimeSpeed: 0.0,
        currentActiveParticles: 0,
        isRunning: true,
        isFrozen: false
    };

    let g_x = 0.0, g_y = 0.0, g_time = 0.0;

    // --- GPU ASSETS ---
    const particleContainer = new PIXI.Container();
    particleContainer.isRenderGroup = true;
    app.stage.addChild(particleContainer);

    const particleGraphics = new PIXI.Graphics().circle(0, 0, 10).fill(0xFFFFFF);
    const particleTexture = app.renderer.generateTexture(particleGraphics);
    particleGraphics.destroy();

    const spritePool = [];
    let previousSpriteCount = 0;

    function ensurePoolCapacity(count) {
        if (count < spritePool.length) return;
        const batchSize = 1000;
        const target = count + batchSize;
        for (let i = spritePool.length; i < target; i++) {
            const sprite = new PIXI.Sprite(particleTexture);
            sprite.anchor.set(0.5);
            sprite.visible = false;
            sprite.scale = 0.1
            spritePool.push(sprite);
            particleContainer.addChild(sprite);
        }
    }

    // --- UI REFS ---
    const uiContainer = document.getElementById('analysisResults');
    uiContainer.innerHTML = `
        <div>Universe Energy: <span id="speedDisplay">100%</span></div>
        <div>Particles: <span id="nValueLabel" style="color:#00ccff">10<sup>20</sup></span></div>
        <div>Entropy: <span id="entropyDisplay">0</span></div>
        <div id="dmRow" style="display:none; color:#a100f2">Dark Matter: <span id="dmDisplay">0</span></div>
    `;

    const uiEntropy = document.getElementById('entropyDisplay');
    const uiSpeed = document.getElementById('speedDisplay');
    const uiTempBar = document.getElementById('timelineBar');
    const nValueLabel = document.getElementById('nValueLabel');
    const dmRow = document.getElementById('dmRow');
    const dmDisplay = document.getElementById('dmDisplay');

    const shopModal = document.getElementById('shopModal');
    const shopEntropy = document.getElementById('shopEntropy');
    const upgradesList = document.getElementById('upgradesList');

    const prestigeBtn = document.createElement('button');
    prestigeBtn.id = "prestigeBtn";
    prestigeBtn.style.cssText = "display:none; width:100%; margin-top:10px; background: #4a0072; border: 1px solid #a100f2; padding: 10px; color: white; cursor: pointer; border-radius: 8px;";
    shopModal.insertBefore(prestigeBtn, document.getElementById('restartBtn'));

    startEpoch();

    // --- CORE LOOP ---
    app.ticker.add(() => {
        if (!GameState.isRunning) return;

        // 1. DECAY & FRICTION
        const totalDrag = GameState.particleCount * GameState.frictionCoeff;
        GameState.currentTimeSpeed -= totalDrag;
        GameState.currentActiveParticles -= GameState.decayRate;

        // Visual Status
        const tempRatio = Math.max(0, GameState.currentTimeSpeed / GameState.baseTimeSpeed);
        uiTempBar.style.transform = `scaleX(${tempRatio})`;
        uiSpeed.textContent = Math.floor(tempRatio * 100) + "%";
        // Do not decay the container
        //particleContainer.alpha = 0.05 + (tempRatio * 0.95);

        // DEATH CONDITIONS
        if (GameState.currentTimeSpeed <= 0 || GameState.currentActiveParticles <= 0) {
            GameState.currentTimeSpeed = 0;
            uiSpeed.textContent = GameState.currentActiveParticles <= 0 ? "ENTROPY MAX" : "HEAT DEATH";
            triggerBigFreeze();
        }

        // 2. RENDER LOOP
        const totalParticles = GameState.particleCount;
        const activeLimit = GameState.currentActiveParticles;
        ensurePoolCapacity(totalParticles * totalParticles);

        const phaseShift = GameState.prestigeLevel * (Math.PI / 4);
        const W = app.screen.width;
        const H = app.screen.height;
        const r = TAU / SYSTEM_SCALE;

        let spriteIndex = 0;

        for (let i = 0; i < totalParticles; i++) {
            const rowIsAlive = i < activeLimit;
            let baseTint = 0xFFFFFF;
            let explodeTint = 0xFFFFFF;
            if (i > 0 && i % 50 !== 0) {
                 baseTint = hslToHex(((i / totalParticles) * 360) + (GameState.prestigeLevel * 30), 100, 50);
                 explodeTint = hslToHex(((i / totalParticles) * 360) + (GameState.prestigeLevel * 30), 100, 70);

            }
            for (let j = 0; j < totalParticles; j++) {
                const maxIndex = Math.max(i, j);
                const lifeMargin = activeLimit - maxIndex; // Positive = Alive, Negative = Dead

                const u = Math.sin(i + g_y + phaseShift) + Math.sin(r * i + g_x);
                const v = Math.cos(i + g_y + phaseShift) + Math.cos(r * i + g_x);

                g_x = u + g_time;
                g_y = v;

                if (spriteIndex >= MAX_RENDER_CAPACITY) break;

                const sprite = spritePool[spriteIndex];
                sprite.x = (u * SYSTEM_SCALE / 2) + (W / 2);
                sprite.y = (v * SYSTEM_SCALE / 2) + (H / 2);

                // --- COLOR LOGIC ---
                if (lifeMargin <= 0) {
                    // DEAD: Dark Void Grey
                    sprite.tint = 0x1a1a1a;
                    sprite.scale = 0.1 // TODO put this constant somewhere
                } else if (lifeMargin < 0.8 && lifeMargin > 0.5) {
                    // DYING (Last 2.5 units): Supernova Flash
                    // We set it to Pure White to simulate maximum brightness/heat
                    //sprite.tint = 0xFFFFFF;
                    sprite.tint = explodeTint;
                    sprite.scale = 0.1/(0.5+lifeMargin)

                } else if (lifeMargin < 0.5) {
                    // DYING (Last 2.5 units): Supernova Flash
                    // We set it to Pure White to simulate maximum brightness/heat
                    //sprite.tint = 0xFFFFFF;
                    sprite.tint = explodeTint;
                    sprite.scale = lifeMargin*0.5
                } else {
                    // ALIVE: Normal Star Color
                    sprite.tint = baseTint;
                }

                sprite.alpha = 1.0;
                sprite.visible = true;
                spriteIndex++;
            }
/*
            for (let j = 0; j < totalParticles; j++) {
                const colIsAlive = j < activeLimit;
                const isAlive = rowIsAlive && colIsAlive;

                const u = Math.sin(i + g_y + phaseShift) + Math.sin(r * i + g_x);
                const v = Math.cos(i + g_y + phaseShift) + Math.cos(r * i + g_x);

                g_x = u + g_time;
                g_y = v;

                if (spriteIndex >= MAX_RENDER_CAPACITY) break;

                const sprite = spritePool[spriteIndex];
                sprite.x = (u * SYSTEM_SCALE / 2) + (W / 2);
                sprite.y = (v * SYSTEM_SCALE / 2) + (H / 2);

                // Dead = Burnt Grey
                sprite.tint = isAlive ? baseTint : 0x1a1a1a;
                sprite.alpha = 1.0;
                sprite.visible = true;
                spriteIndex++;
            }
        */
          }

        const maxClean = Math.max(spriteIndex, previousSpriteCount);
        for (let i = spriteIndex; i < maxClean; i++) {
             if (spritePool[i]) spritePool[i].visible = false;
        }
        previousSpriteCount = spriteIndex;

        // 3. INCOME
        if (GameState.currentTimeSpeed > 0 && activeLimit > 0) {
            const entropyMult = 1 + (GameState.darkMatter * 0.1);
            const activeSpritesApprox = activeLimit * activeLimit;

            // Divisor 4000: Tuned for ~20-25 Entropy per run
            const currentOutput = (activeSpritesApprox / 4000) * (GameState.currentTimeSpeed / GameState.baseTimeSpeed) * entropyMult;
            GameState.entropy += currentOutput;

            uiEntropy.textContent = formatNumber(GameState.entropy);

            // EXPONENT DISPLAY
            const currentExponent = Math.floor(activeLimit);
            nValueLabel.innerHTML = `10<sup>${currentExponent}</sup>`;

            if (GameState.darkMatter > 0) {
                dmRow.style.display = 'block';
                dmDisplay.textContent = GameState.darkMatter;
            }
            g_time += GameState.currentTimeSpeed;
        }
    });

    // --- GAME LOGIC ---

    function startEpoch() {
        GameState.currentTimeSpeed = GameState.baseTimeSpeed;
        GameState.currentActiveParticles = GameState.particleCount;
        GameState.isRunning = true;
        GameState.isFrozen = false;

        g_time = -10 + 20 * Math.random();
        particleContainer.alpha = 1.0;
        shopModal.style.display = 'none';
    }

    function triggerBigFreeze() {
        if (GameState.isFrozen) return;
        GameState.isFrozen = true;

        setTimeout(() => {
            GameState.isRunning = false;
            shopModal.style.display = 'block';
            shopEntropy.textContent = formatNumber(GameState.entropy);
            renderShop();
        }, 1000);
    }

    const upgrades = [
        {
            id: 'mass',
            name: 'Baryogenesis',
            cost: 100,
            desc: 'Increase Particles (+5 Orders of Magnitude).',
            effect: () => GameState.particleCount += 5
        },
        {
            id: 'stability',
            name: 'Strong Force',
            cost: 250,
            desc: 'Particles decay slower.',
            effect: () => GameState.decayRate *= 0.9
        },
        {
            id: 'heat',
            name: 'Big Bang Energy',
            cost: 350,
            desc: 'Universe starts faster.',
            effect: () => GameState.baseTimeSpeed += 0.0005
        },
        {
            id: 'insulation',
            name: 'Dark Energy',
            cost: 600,
            desc: 'Expansion reduces friction.',
            effect: () => GameState.frictionCoeff *= 0.8
        }
    ];

    function renderShop() {
        upgradesList.innerHTML = '';
        upgrades.forEach(u => {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.innerHTML = `<strong>${u.name}</strong><br><small>${u.desc}</small><br>Cost: ${formatNumber(u.cost)} Entropy`;

            if (GameState.entropy < u.cost) btn.disabled = true;

            btn.onclick = () => {
                if (GameState.entropy >= u.cost) {
                    GameState.entropy -= u.cost;
                    u.effect();
                    u.cost *= 1.5;
                    shopEntropy.textContent = formatNumber(GameState.entropy);
                    renderShop();
                }
            };
            upgradesList.appendChild(btn);
        });

        const PRESTIGE_COST = 50000 * Math.pow(2, GameState.prestigeLevel);
        const canPrestige = GameState.entropy >= PRESTIGE_COST;

        prestigeBtn.style.display = 'block';
        prestigeBtn.innerHTML = `<strong>BIG CRUNCH</strong><br><small>Collapse Universe.</small><br>Req: ${formatNumber(PRESTIGE_COST)}<br><span style="color:#ff00ff">+1 Dark Matter</span>`;
        prestigeBtn.disabled = !canPrestige;

        prestigeBtn.onclick = () => {
            if(confirm("Collapse the universe?")) {
                GameState.prestigeLevel++;
                GameState.darkMatter++;

                GameState.entropy = 0;
                GameState.particleCount = 20;
                GameState.baseTimeSpeed = 0.0005;
                GameState.frictionCoeff = 0.000000015;
                GameState.decayRate = 0.01;

                // Reset Costs
                upgrades[0].cost = 100;
                upgrades[1].cost = 250;
                upgrades[2].cost = 350;
                upgrades[3].cost = 600;

                startEpoch();
            }
        }
    }

    document.getElementById('restartBtn').onclick = startEpoch;

    function formatNumber(num) {
        if (num >= 1000000) return (num/1000000).toFixed(2) + "M";
        if (num >= 1000) return (num/1000).toFixed(1) + "k";
        return Math.floor(num);
    }

    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
        return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
    }
})();
