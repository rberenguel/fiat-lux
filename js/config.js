// Game balance configuration - tweak these values to adjust gameplay

// Initial physics parameters
export const INITIAL_BASE_TIME_SPEED = 0.0005;
export const INITIAL_FRICTION_COEFF = 0.000000015;
export const INITIAL_PARTICLE_COUNT = 20; // Linear internal value (20 -> 380)
export const INITIAL_DECAY_RATE = 0.01;

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
export const ENTROPY_DIVISOR = 5750; // Tuned for ~30 Entropy per run
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
