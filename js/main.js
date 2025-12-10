import { GameState, g_time, incrementGTime, initializeLayerSystem, syncGameStateToLayer, loadGame, saveGame } from './state.js';
import { DARK_MATTER_ENTROPY_MULTIPLIER, ENTROPY_DIVISOR, getDecayRate, INITIAL_PARTICLE_COUNT } from './config.js';
import { initializeRenderer, app, renderParticles, particleContainer } from './renderer.js';
import {
    initializeUI,
    uiEntropy,
    uiSpeed,
    uiTempBar,
    nValueLabel,
    dmRow,
    dmDisplay,
    restartBtn
} from './ui.js';
import { formatNumber } from './utils.js';
import { startEpoch, checkDeathConditions, setupRestartButton, restoreUpgradeCosts } from './gameplay.js';
import { initializeDebugPanel } from './debug.js';

(async () => {
    // Initialize all systems
    await initializeRenderer();
    initializeUI();

    // Check for ?new URL parameter to force fresh start
    const urlParams = new URLSearchParams(window.location.search);
    const forceNew = urlParams.has('new');

    // Try to load saved game, otherwise initialize fresh
    const saveLoaded = !forceNew && await loadGame();
    if (!saveLoaded) {
        initializeLayerSystem(); // Initialize layer system (starts at Layer 0)
    } else {
        // Restore upgrade costs from save data
        restoreUpgradeCosts(GameState.upgradePurchaseCounts || {});
    }

    setupRestartButton(restartBtn);
    initializeDebugPanel(); // Add debug panel if ?debug is in URL

    // Hide particles initially (do this AFTER renderer is initialized)
    particleContainer.alpha = 0;

    // Setup start modal
    const startModal = document.getElementById('startModal');
    const startBtn = document.getElementById('startBtn');

    startBtn.onclick = () => {
        // Trigger fade out
        startModal.classList.add('fade-out');

        // Wait for fade to complete, then start game with fade-in
        startModal.addEventListener('transitionend', () => {
            startModal.style.display = 'none';
            startEpoch();

            // Fade in particles over 2 seconds
            const fadeInDuration = 2000;
            const fadeInStart = Date.now();

            const animateFadeIn = () => {
                const elapsed = Date.now() - fadeInStart;
                const progress = Math.min(elapsed / fadeInDuration, 1);
                particleContainer.alpha = progress;

                if (progress < 1) {
                    requestAnimationFrame(animateFadeIn);
                }
            };

            animateFadeIn();
        }, { once: true });
    };

    // Don't start automatically - wait for user to click
    // startEpoch();

    // Pause game when window loses focus & auto-save
    let wasRunningBeforeBlur = false;
    window.addEventListener('blur', () => {
        wasRunningBeforeBlur = GameState.isRunning;
        GameState.isRunning = false;
        saveGame(); // Auto-save when leaving tab
    });

    window.addEventListener('focus', () => {
        if (wasRunningBeforeBlur && !GameState.isFrozen) {
            GameState.isRunning = true;
        }
    });

    // Auto-save every 30 seconds
    setInterval(() => {
        saveGame();
    }, 30000);

    // --- CORE GAME LOOP ---
    app.ticker.add((ticker) => {
        if (!GameState.isRunning) return;

        // Normalize for frame rate - deltaTime is 1.0 at 60fps
        // Apply time multiplier for fast forward
        const dt = ticker.deltaTime * GameState.timeMultiplier;

        // 1. PHYSICS: Decay & Friction (time-normalized)
        const totalDrag = GameState.particleCount * GameState.frictionCoeff;
        GameState.currentTimeSpeed -= totalDrag * dt;

        // Dynamic decay: slows as particle count increases
        const dynamicDecayRate = getDecayRate(Math.floor(GameState.currentActiveParticles));
        GameState.currentActiveParticles -= dynamicDecayRate * dt;

        // 2. UPDATE UI: Visual Status
        const tempRatio = Math.max(0, GameState.currentTimeSpeed / GameState.baseTimeSpeed);
        uiTempBar.style.transform = `scaleX(${tempRatio})`;
        uiSpeed.textContent = Math.floor(tempRatio * 100) + "%";

        // 3. CHECK: Death Conditions
        if (checkDeathConditions()) {
            return;
        }

        // 4. RENDER: Particles
        const activeLimit = GameState.currentActiveParticles;
        renderParticles(g_time);

        // 5. CALCULATE: Entropy Income (time-normalized)
        if (GameState.currentTimeSpeed > 0 && activeLimit > 0) {
            const entropyMult = 1 + (GameState.darkMatter * DARK_MATTER_ENTROPY_MULTIPLIER);

            let currentOutput;
            if (GameState.activeLayerIndex === 0) {
                // Layer 0: Grid-based (quadratic scaling)
                const activeSpritesApprox = activeLimit * activeLimit;
                currentOutput = (activeSpritesApprox / ENTROPY_DIVISOR) *
                    (GameState.currentTimeSpeed / GameState.baseTimeSpeed) *
                    entropyMult *
                    dt;
            } else {
                // Layer 1+: Per-universe (linear scaling)
                // Each universe generates roughly the same as a full Layer 0 cycle
                const LAYER0_BASE_ENTROPY = (INITIAL_PARTICLE_COUNT * INITIAL_PARTICLE_COUNT) / ENTROPY_DIVISOR;
                currentOutput = (GameState.particleCount * LAYER0_BASE_ENTROPY) *
                    (GameState.currentTimeSpeed / GameState.baseTimeSpeed) *
                    entropyMult *
                    dt;
            }

            GameState.entropy += currentOutput;

            // 6. UPDATE UI: Stats
            uiEntropy.textContent = formatNumber(GameState.entropy);

            const currentExponent = Math.floor(activeLimit);
            nValueLabel.innerHTML = `10<sup>${currentExponent}</sup>`;

            if (GameState.darkMatter > 0) {
                dmRow.style.display = 'block';
                dmDisplay.textContent = GameState.darkMatter;
            }

            incrementGTime(GameState.currentTimeSpeed * dt);  // Normalize for frame rate
        }

        // Sync GameState changes to active layer
        syncGameStateToLayer();
    });
})();
