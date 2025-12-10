// Game balance configuration - tweak these values to adjust gameplay

// Initial physics parameters
export const INITIAL_BASE_TIME_SPEED = 0.0005;
export const INITIAL_FRICTION_COEFF = 0.000000015;
export const INITIAL_PARTICLE_COUNT = 10; // Linear internal value (10 -> 380)
export const INITIAL_DECAY_RATE = 0.01;

/**
 * Calculate dynamic decay rate based on particle count exponent
 * Decay slows as the order of magnitude increases, making later runs last longer
 * @param {number} particleExponent - The current particle count (as exponent)
 * @returns {number} The decay rate to apply
 */
export function getDecayRate(particleExponent) {
    const baseDecay = 0.01;
    // Decay slows as the ORDER OF MAGNITUDE increases
    // At exponent 10 (starting): decay = 0.01
    // At exponent 20: decay ~0.005 (twice as slow)
    // At exponent 30: decay ~0.0033 (three times as slow)
    const dampening = 1 + (particleExponent - 10) * 0.05;
    return baseDecay / dampening;
}

// Sprite rendering settings
export const SPRITE_SCALE_DEAD = 0.1;
export const SPRITE_SCALE_ALIVE = 0.1;

// Particle lifecycle thresholds
export const DYING_THRESHOLD_MAX = 0.8;
export const DYING_THRESHOLD_MIN = 0.5;

// Particle color configuration
export const PARTICLE_HUE_OFFSET = 30; // Hue shift per prestige level
export const PARTICLE_SATURATION = 100;
export const PARTICLE_LIGHTNESS_BASE = 50;
export const PARTICLE_LIGHTNESS_EXPLODE = 70;

// Entropy calculation
export const ENTROPY_DIVISOR = 860; // Tuned for ~30 Entropy per run with INITIAL_PARTICLE_COUNT=10
export const DARK_MATTER_ENTROPY_MULTIPLIER = 0.1;

// Prestige cost scaling
export const PRESTIGE_BASE_COST = 50000;
export const PRESTIGE_COST_MULTIPLIER = 2;

// Phase shift per prestige level
export const PHASE_SHIFT_PER_PRESTIGE = Math.PI / 4;

// Sprite pool batch size
export const SPRITE_POOL_BATCH_SIZE = 1000;

// Upgrade definitions
export const UPGRADES = [
    {
        id: 'mass',
        name: 'Baryogenesis',
        initialCost: 100,
        costMultiplier: 1.5,
        desc: 'Increase Particles (+5 Orders of Magnitude).',
        effect: (gameState) => {
            gameState.particleCount += 5;
        }
    },
    {
        id: 'stability',
        name: 'Strong Force',
        initialCost: 250,
        costMultiplier: 1.5,
        desc: 'Particles decay slower.',
        effect: (gameState) => {
            gameState.decayRate *= 0.9;
        }
    },
    {
        id: 'heat',
        name: 'Big Bang Energy',
        initialCost: 350,
        costMultiplier: 1.5,
        desc: 'Universe starts faster.',
        effect: (gameState) => {
            gameState.baseTimeSpeed += 0.0005;
        }
    },
    {
        id: 'insulation',
        name: 'Dark Energy',
        initialCost: 600,
        costMultiplier: 1.5,
        desc: 'Expansion reduces friction.',
        effect: (gameState) => {
            gameState.frictionCoeff *= 0.8;
        }
    },
    {
        id: 'timeskip',
        name: 'Temporal Compression',
        initialCost: 150,
        costMultiplier: 2.0,
        desc: 'Universe cycles 10% faster.',
        effect: (gameState) => {
            gameState.timeMultiplier *= 1.1;
        }
    }
];

// Restart button naming progression
export const RESTART_NAMES = [
    // Random pool for iteration 4+
    { name: 'Fiat Lux', language: 'Latin', translation: 'Let light be made' },
    { name: 'Kun Fayakun', language: 'Arabic', translation: 'Be, and it is' },
    { name: 'Koworo Koworo', language: 'Japanese', translation: '(Stirring sound)' },
    { name: 'Om (Aum)', language: 'Vedic', translation: '(Primal hum)' },
    { name: 'Sipapuni', language: 'Hopi', translation: 'Place of Emergence' },
    { name: 'Kai Tian Pi Di', language: 'Chinese', translation: 'Open Sky, Split Earth' },
    { name: 'Hanau ka Po', language: 'Hawaiian', translation: 'The Night births' },
    { name: 'Nigredo', language: 'Alchemy', translation: 'Blackening' },
    { name: 'Hello World', language: 'Code', translation: 'Hello World' },
    { name: 'Tathastu', language: 'Sanskrit', translation: 'So be it' },
    { name: 'Lu Shamamu', language: 'Akkadian', translation: 'Let heavens be' }
];

// Layer system configuration
export const PHASE_SHIFT_DM_THRESHOLD = 100; // Dark Matter needed to unlock next layer

export const LAYERS = [
    {
        index: 0,
        name: 'Universe',
        particleName: 'Stars',
        restartButton: 'Reignite Universe', // Uses RESTART_NAMES progression
        spawnButton: null, // No spawn button at layer 0
        timeScale: 1.0,
        texture: 'star_dot' // Using default white circle for now
    },
    {
        index: 1,
        name: 'Multiverse',
        particleName: 'Universes',
        restartButton: 'Collapse Multiverse',
        spawnButton: 'Fiat Lux', // "Let there be light" - spawn new universes
        timeScale: 0.5, // Slower, more strategic
        texture: 'universe_glow'
    },
    {
        index: 2,
        name: 'The Bulk',
        particleName: 'Multiverse Bubbles',
        restartButton: 'Reset Bulk',
        spawnButton: 'Nucleate Bubble',
        timeScale: 0.2,
        texture: 'bubble_orb'
    },
    {
        index: 3,
        name: 'The Brane',
        particleName: 'Bulk Nodes',
        restartButton: 'Reweave Brane',
        spawnButton: 'Thread Node',
        timeScale: 0.05,
        texture: 'brane_web'
    },
    {
        index: 4,
        name: 'The Absolute',
        particleName: 'Brane Sheets',
        restartButton: 'Reinitialize Absolute',
        spawnButton: 'Emanate Sheet',
        timeScale: 0.01,
        texture: 'absolute_void'
    }
];
