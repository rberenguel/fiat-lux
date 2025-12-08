import { GameState, g_time, incrementGTime } from './state.js';
import { DARK_MATTER_ENTROPY_MULTIPLIER, ENTROPY_DIVISOR } from './config.js';
import { initializeRenderer, app, renderParticles } from './renderer.js';
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
import { startEpoch, checkDeathConditions, setupRestartButton } from './gameplay.js';

(async () => {
    // Initialize all systems
    await initializeRenderer();
    initializeUI();
    setupRestartButton(restartBtn);

    // Start the game
    startEpoch();

    // --- CORE GAME LOOP ---
    app.ticker.add((ticker) => {
        if (!GameState.isRunning) return;

        // Normalize for frame rate - deltaTime is 1.0 at 60fps
        const dt = ticker.deltaTime;

        // 1. PHYSICS: Decay & Friction (time-normalized)
        const totalDrag = GameState.particleCount * GameState.frictionCoeff;
        GameState.currentTimeSpeed -= totalDrag * dt;
        GameState.currentActiveParticles -= GameState.decayRate * dt;

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
            const activeSpritesApprox = activeLimit * activeLimit;

            const currentOutput = (activeSpritesApprox / ENTROPY_DIVISOR) *
                (GameState.currentTimeSpeed / GameState.baseTimeSpeed) *
                entropyMult *
                dt;  // Normalize for frame rate

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
    });
})();
