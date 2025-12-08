import { GameState, setGTime, syncGameStateToLayer, syncLayerToGameState } from './state.js';
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
    prestigeBtn
} from './ui.js';
import { formatNumber, getRestartButtonText } from './utils.js';

// Current upgrade costs (will be modified during gameplay)
const upgradeCosts = UPGRADES.map(u => u.initialCost);

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

                // Sync changes to active layer
                syncGameStateToLayer();

                shopEntropy.textContent = formatNumber(GameState.entropy);
                renderShop(restartBtn);
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
            }
        };
    } else {
        prestigeBtn.style.display = 'none';
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

        // Show phase shift notification
        if (confirm(`You have accumulated ${PHASE_SHIFT_DM_THRESHOLD} Dark Matter.\n\nTrigger the Vacuum Phase Transition?\n\nThe universe will collapse into a single point, and you will enter Layer ${nextLayerIndex}: ${LAYERS[nextLayerIndex].name}.`)) {
            performPhaseShift();
        }
    }
}

/**
 * Perform the phase shift to next layer
 */
function performPhaseShift() {
    const nextLayerIndex = GameState.activeLayerIndex + 1;
    if (nextLayerIndex >= LAYERS.length) return;

    const nextLayerConfig = LAYERS[nextLayerIndex];

    // Create new layer
    const newLayer = new GameLayer(nextLayerIndex, nextLayerConfig);

    // Transfer Dark Matter to new layer
    newLayer.darkMatter = GameState.darkMatter;

    // Update active layer
    GameState.activeLayerIndex = nextLayerIndex;
    GameState.activeLayer = newLayer;

    // Sync new layer state to GameState
    syncLayerToGameState();

    // TODO: Add zoom-out animation here

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
 * Update restart button text based on current restart count
 */
export function updateRestartButtonText(restartBtn) {
    const buttonText = getRestartButtonText(GameState.restartCount);

    if (buttonText.sub) {
        restartBtn.innerHTML = `${buttonText.main}<br><small class="restart-translation" style="font-size:0.8em; opacity:0.8">${buttonText.sub}</small>`;
    } else {
        restartBtn.textContent = buttonText.main;
    }
}
