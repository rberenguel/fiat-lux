import {
    INITIAL_BASE_TIME_SPEED,
    INITIAL_FRICTION_COEFF,
    INITIAL_PARTICLE_COUNT,
    INITIAL_DECAY_RATE
} from './config.js';

/**
 * GameLayer - Represents a single layer in the infinite hierarchy
 * Layer 0 = Universe (stars are particles)
 * Layer 1 = Multiverse (universes are particles)
 * Layer 2+ = Higher dimensions
 */
export class GameLayer {
    constructor(layerIndex, config) {
        this.layerIndex = layerIndex;
        this.config = config;

        // Core resources (same as current GameState)
        this.entropy = 0;
        this.darkMatter = 0;
        this.prestigeLevel = 0;

        // Physics state (same as current GameState)
        this.particleCount = INITIAL_PARTICLE_COUNT;
        this.baseTimeSpeed = INITIAL_BASE_TIME_SPEED;
        this.frictionCoeff = INITIAL_FRICTION_COEFF;
        this.decayRate = INITIAL_DECAY_RATE;

        // Runtime state (same as current GameState)
        this.currentTimeSpeed = this.baseTimeSpeed;
        this.currentActiveParticles = this.particleCount;
        this.isRunning = false;
        this.isFrozen = false;

        // Time acceleration (quality of life - makes game run faster without changing balance)
        this.timeMultiplier = 1.0;

        // Tracking
        this.restartCount = 0;
    }

    /**
     * Reset layer state for new epoch
     */
    reset() {
        this.currentTimeSpeed = this.baseTimeSpeed;
        this.currentActiveParticles = this.particleCount;
        this.isRunning = true;
        this.isFrozen = false;
    }

    /**
     * Apply time-normalized physics update
     */
    tick(dt) {
        if (!this.isRunning) return;

        // Apply friction and decay (time-normalized)
        const totalDrag = this.particleCount * this.frictionCoeff;
        this.currentTimeSpeed -= totalDrag * dt;
        this.currentActiveParticles -= this.decayRate * dt;
    }
}
