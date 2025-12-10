import { GameState, setGTime, syncGameStateToLayer, syncLayerToGameState, saveGame } from './state.js';
import {
    UPGRADES,
    PRESTIGE_BASE_COST,
    PRESTIGE_COST_MULTIPLIER,
    INITIAL_BASE_TIME_SPEED,
    INITIAL_FRICTION_COEFF,
    INITIAL_PARTICLE_COUNT,
    INITIAL_DECAY_RATE,
    PHASE_SHIFT_DM_THRESHOLD,
    LAYERS
} from './config.js';
import { GameLayer } from './layer.js';
import { particleContainer } from './renderer.js';
import {
    uiSpeed,
    shopModal,
    shopEntropy,
    upgradesList,
    prestigeBtn,
    phaseShiftModal,
    phaseShiftDM,
    phaseShiftLayerName,
    phaseShiftConfirm,
    phaseShiftCancel,
    layerDisplay,
    layerNumber,
    layerName,
    fiatLuxBtn
} from './ui.js';
import { formatNumber, getRestartButtonText } from './utils.js';

// Current upgrade costs (will be modified during gameplay)
// Made mutable so it can be restored from save
export let upgradeCosts = UPGRADES.map(u => u.initialCost);

/**
 * Restore upgrade costs from save data
 */
export function restoreUpgradeCosts(purchaseCounts) {
    UPGRADES.forEach((u, index) => {
        const purchaseCount = purchaseCounts[u.id] || 0;
        upgradeCosts[index] = u.initialCost * Math.pow(u.costMultiplier, purchaseCount);
    });
}

/**
 * Track upgrade purchase in save data
 */
function trackUpgradePurchase(upgradeId) {
    if (!GameState.upgradePurchaseCounts) {
        GameState.upgradePurchaseCounts = {};
    }
    GameState.upgradePurchaseCounts[upgradeId] = (GameState.upgradePurchaseCounts[upgradeId] || 0) + 1;
}

// Store reference to restart button
let restartButtonRef = null;

/**
 * Start a new epoch (universe cycle)
 */
export function startEpoch() {
    GameState.currentTimeSpeed = GameState.baseTimeSpeed;
    GameState.currentActiveParticles = GameState.particleCount;
    GameState.isRunning = true;
    GameState.isFrozen = false;

    // Sync to active layer
    syncGameStateToLayer();

    setGTime(-10 + 20 * Math.random());
    particleContainer.alpha = 1.0;
    shopModal.style.display = 'none';
}

/**
 * Trigger the big freeze (end of universe)
 */
export function triggerBigFreeze() {
    if (GameState.isFrozen) return;
    GameState.isFrozen = true;

    setTimeout(() => {
        GameState.isRunning = false;
        shopModal.style.display = 'block';
        shopEntropy.textContent = formatNumber(GameState.entropy);
        renderShop(restartButtonRef);
    }, 1000);
}

/**
 * Check if universe should end
 */
export function checkDeathConditions() {
    if (GameState.currentTimeSpeed <= 0 || GameState.currentActiveParticles <= 0) {
        GameState.currentTimeSpeed = 0;
        uiSpeed.textContent = GameState.currentActiveParticles <= 0 ? "ENTROPY MAX" : "HEAT DEATH";
        triggerBigFreeze();
        return true;
    }
    return false;
}

/**
 * Render the shop/upgrade interface
 */
function renderShop(restartBtn) {
    // Update shop title based on layer
    const shopTitle = shopModal.querySelector('h2');
    if (GameState.activeLayerIndex > 0) {
        const layerConfig = LAYERS[GameState.activeLayerIndex];
        shopTitle.textContent = `${layerConfig.name} Faded`;
    } else {
        shopTitle.textContent = 'Universe Faded';
    }

    upgradesList.innerHTML = '';

    UPGRADES.forEach((u, index) => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.innerHTML = `<strong>${u.name}</strong><br><small>${u.desc}</small><br>Cost: ${formatNumber(upgradeCosts[index])} Entropy`;

        if (GameState.entropy < upgradeCosts[index]) {
            btn.disabled = true;
        }

        btn.onclick = () => {
            if (GameState.entropy >= upgradeCosts[index]) {
                GameState.entropy -= upgradeCosts[index];
                u.effect(GameState);
                upgradeCosts[index] *= u.costMultiplier;

                // Track purchase for save/load
                trackUpgradePurchase(u.id);

                // Sync changes to active layer
                syncGameStateToLayer();

                shopEntropy.textContent = formatNumber(GameState.entropy);
                renderShop(restartBtn);

                // Auto-save after upgrade purchase
                saveGame();
            }
        };
        upgradesList.appendChild(btn);
    });

    // Prestige button - only show after reaching 1000 entropy
    const PRESTIGE_THRESHOLD = 1000;
    if (GameState.entropy >= PRESTIGE_THRESHOLD) {
        const PRESTIGE_COST = PRESTIGE_BASE_COST * Math.pow(PRESTIGE_COST_MULTIPLIER, GameState.prestigeLevel);
        const canPrestige = GameState.entropy >= PRESTIGE_COST;

        prestigeBtn.style.display = 'block';
        prestigeBtn.innerHTML = `<strong>BIG CRUNCH</strong><br><small>Collapse Universe.</small><br>Req: ${formatNumber(PRESTIGE_COST)}<br><span style="color:#ff00ff">+1 Dark Matter</span>`;
        prestigeBtn.disabled = !canPrestige;

        prestigeBtn.onclick = () => {
            if (confirm("Collapse the universe?")) {
                performPrestige();
                saveGame(); // Auto-save after prestige
            }
        };
    } else {
        prestigeBtn.style.display = 'none';
    }

    // Fiat Lux button - only show at Layer 1+
    if (GameState.activeLayerIndex > 0) {
        const FIAT_LUX_BASE_COST = 100;
        const FIAT_LUX_MULTIPLIER = 1.5;
        const fiatLuxCost = FIAT_LUX_BASE_COST * Math.pow(FIAT_LUX_MULTIPLIER, GameState.particleCount - 1);
        const canFiatLux = GameState.darkMatter >= fiatLuxCost;

        fiatLuxBtn.style.display = 'block';
        fiatLuxBtn.innerHTML = `<strong>FIAT LUX</strong><br><small>Spawn new Universe.</small><br>Cost: ${formatNumber(fiatLuxCost)} Dark Matter<br><span style="color:#00ffff">+1 Universe Particle</span>`;
        fiatLuxBtn.disabled = !canFiatLux;

        fiatLuxBtn.onclick = () => {
            if (GameState.darkMatter >= fiatLuxCost) {
                GameState.darkMatter -= fiatLuxCost;
                GameState.particleCount += 1;
                syncGameStateToLayer();
                renderShop(restartBtn);
                saveGame(); // Auto-save after Fiat Lux purchase
            }
        };
    } else {
        fiatLuxBtn.style.display = 'none';
    }

    // Update restart button text
    updateRestartButtonText(restartBtn);
}

/**
 * Perform prestige (big crunch)
 */
function performPrestige() {
    GameState.prestigeLevel++;
    GameState.darkMatter++;

    // Reset game state
    GameState.entropy = 0;
    GameState.particleCount = INITIAL_PARTICLE_COUNT;
    GameState.baseTimeSpeed = INITIAL_BASE_TIME_SPEED;
    GameState.frictionCoeff = INITIAL_FRICTION_COEFF;
    GameState.decayRate = INITIAL_DECAY_RATE;

    // Reset upgrade costs
    UPGRADES.forEach((u, index) => {
        upgradeCosts[index] = u.initialCost;
    });

    // Sync changes to active layer
    syncGameStateToLayer();

    // Check if we should trigger phase shift
    checkPhaseShift();

    startEpoch();
}

/**
 * Check if player has enough Dark Matter to unlock next layer
 */
export function checkPhaseShift() {
    const nextLayerIndex = GameState.activeLayerIndex + 1;

    // Check if next layer exists and we have enough DM
    if (nextLayerIndex < LAYERS.length &&
        GameState.darkMatter >= PHASE_SHIFT_DM_THRESHOLD) {

        // Show phase shift modal
        phaseShiftDM.textContent = Math.floor(GameState.darkMatter);
        phaseShiftLayerName.textContent = LAYERS[nextLayerIndex].name;
        phaseShiftModal.style.display = 'block';

        // Setup button handlers (one-time use)
        phaseShiftConfirm.onclick = () => {
            phaseShiftModal.style.display = 'none';
            performPhaseShift();
        };

        phaseShiftCancel.onclick = () => {
            phaseShiftModal.style.display = 'none';
        };
    }
}

/**
 * Perform the phase shift to next layer
 */
function performPhaseShift() {
    const nextLayerIndex = GameState.activeLayerIndex + 1;
    if (nextLayerIndex >= LAYERS.length) return;

    const nextLayerConfig = LAYERS[nextLayerIndex];

    // Pause the game during transition
    GameState.isRunning = false;

    // Set pivot to center for proper scaling
    const centerX = particleContainer.parent.width / 2;
    const centerY = particleContainer.parent.height / 2;
    particleContainer.pivot.set(centerX, centerY);
    particleContainer.position.set(centerX, centerY);

    // Zoom-out animation: shrink and fade the current universe
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animateZoomOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out)
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Scale down and fade out
        particleContainer.scale.set(1 - eased * 0.99); // Scale to almost 0
        particleContainer.alpha = 1 - eased; // Fade out

        if (progress < 1) {
            requestAnimationFrame(animateZoomOut);
        } else {
            // Animation complete - transition to new layer
            completePhaseShift(nextLayerIndex, nextLayerConfig);
        }
    };

    animateZoomOut();
}

/**
 * Complete the phase shift after animation
 */
function completePhaseShift(nextLayerIndex, nextLayerConfig) {
    // Create new layer
    const newLayer = new GameLayer(nextLayerIndex, nextLayerConfig);

    // Consume Dark Matter and transfer remaining
    newLayer.darkMatter = GameState.darkMatter - PHASE_SHIFT_DM_THRESHOLD;

    // Layer 1+ starts with minimal particles (representing universes, not stars)
    // Start with 1 particle = the universe you just left
    if (nextLayerIndex > 0) {
        newLayer.particleCount = 1;
    }

    // Update active layer
    GameState.activeLayerIndex = nextLayerIndex;
    GameState.activeLayer = newLayer;

    // Sync new layer state to GameState
    syncLayerToGameState();

    // Update layer display (show for Layer 1+)
    if (nextLayerIndex > 0) {
        layerDisplay.style.display = 'block';
        layerNumber.textContent = nextLayerIndex;
        layerName.textContent = nextLayerConfig.name;
    }

    // Reset particle container scale, alpha, pivot, and position
    particleContainer.scale.set(1);
    particleContainer.alpha = 1;
    particleContainer.pivot.set(0, 0);
    particleContainer.position.set(0, 0);

    // Auto-save after phase shift
    saveGame();

    // Start new epoch
    startEpoch();
}


/**
 * Setup restart button handler
 */
export function setupRestartButton(restartBtn) {
    restartButtonRef = restartBtn;

    restartBtn.onclick = () => {
        GameState.restartCount++;
        startEpoch();
    };

    // Set initial button text
    updateRestartButtonText(restartBtn);
}

/**
 * Update restart button text based on current restart count and layer
 */
export function updateRestartButtonText(restartBtn) {
    // Layer 1+ uses different restart text
    if (GameState.activeLayerIndex > 0) {
        const layerConfig = LAYERS[GameState.activeLayerIndex];
        restartBtn.textContent = layerConfig.restartButton || 'Restart';
    } else {
        // Layer 0 uses naming progression
        const buttonText = getRestartButtonText(GameState.restartCount);

        if (buttonText.sub) {
            restartBtn.innerHTML = `${buttonText.main}<br><small class="restart-translation" style="font-size:0.8em; opacity:0.8">${buttonText.sub}</small>`;
        } else {
            restartBtn.textContent = buttonText.main;
        }
    }
}
