import {
    INITIAL_BASE_TIME_SPEED,
    INITIAL_FRICTION_COEFF,
    INITIAL_PARTICLE_COUNT,
    INITIAL_DECAY_RATE,
    LAYERS
} from './config.js';
import { GameLayer } from './layer.js';

// Global game state
// At Layer 0, this IS the game state
// At Layer 1+, these values are synced with the active layer
export const GameState = {
    // Layer system
    activeLayerIndex: 0,
    activeLayer: null, // Will be initialized to GameLayer instance

    // Currencies
    entropy: 0,
    darkMatter: 0,
    prestigeLevel: 0,

    // Physics / Stats
    baseTimeSpeed: INITIAL_BASE_TIME_SPEED,
    frictionCoeff: INITIAL_FRICTION_COEFF,
    particleCount: INITIAL_PARTICLE_COUNT,
    decayRate: INITIAL_DECAY_RATE,

    // Runtime State
    currentTimeSpeed: 0.0,
    currentActiveParticles: 0,
    isRunning: true,
    isFrozen: false,

    // Time acceleration
    timeMultiplier: 1.0,

    // Restart Counter
    restartCount: 0
};

/**
 * Initialize the layer system
 * Creates the first layer (Layer 0: Universe)
 */
export function initializeLayerSystem() {
    const layerConfig = LAYERS[0];
    GameState.activeLayer = new GameLayer(0, layerConfig);
    GameState.activeLayerIndex = 0;

    // Sync initial values from layer to GameState
    syncLayerToGameState();
}

/**
 * Sync active layer's state to GameState
 * This allows existing code to continue reading from GameState
 */
export function syncLayerToGameState() {
    const layer = GameState.activeLayer;
    if (!layer) return;

    GameState.entropy = layer.entropy;
    GameState.darkMatter = layer.darkMatter;
    GameState.prestigeLevel = layer.prestigeLevel;
    GameState.particleCount = layer.particleCount;
    GameState.baseTimeSpeed = layer.baseTimeSpeed;
    GameState.frictionCoeff = layer.frictionCoeff;
    GameState.decayRate = layer.decayRate;
    GameState.currentTimeSpeed = layer.currentTimeSpeed;
    GameState.currentActiveParticles = layer.currentActiveParticles;
    GameState.isRunning = layer.isRunning;
    GameState.isFrozen = layer.isFrozen;
    GameState.timeMultiplier = layer.timeMultiplier;
    GameState.restartCount = layer.restartCount;
}

/**
 * Sync GameState changes back to the active layer
 * Called after modifying GameState properties
 */
export function syncGameStateToLayer() {
    const layer = GameState.activeLayer;
    if (!layer) return;

    layer.entropy = GameState.entropy;
    layer.darkMatter = GameState.darkMatter;
    layer.prestigeLevel = GameState.prestigeLevel;
    layer.particleCount = GameState.particleCount;
    layer.baseTimeSpeed = GameState.baseTimeSpeed;
    layer.frictionCoeff = GameState.frictionCoeff;
    layer.decayRate = GameState.decayRate;
    layer.currentTimeSpeed = GameState.currentTimeSpeed;
    layer.currentActiveParticles = GameState.currentActiveParticles;
    layer.isRunning = GameState.isRunning;
    layer.isFrozen = GameState.isFrozen;
    layer.timeMultiplier = GameState.timeMultiplier;
    layer.restartCount = GameState.restartCount;
}

// Global animation variables
export let g_x = 0.0;
export let g_y = 0.0;
export let g_time = 0.0;

// Functions to update global animation variables
export function setGX(value) {
    g_x = value;
}

export function setGY(value) {
    g_y = value;
}

export function setGTime(value) {
    g_time = value;
}

export function incrementGTime(delta) {
    g_time += delta;
}
