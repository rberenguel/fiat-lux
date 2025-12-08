import {
    INITIAL_BASE_TIME_SPEED,
    INITIAL_FRICTION_COEFF,
    INITIAL_PARTICLE_COUNT,
    INITIAL_DECAY_RATE
} from './config.js';

// Global game state
export const GameState = {
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

    // Restart Counter
    restartCount: 0
};

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
