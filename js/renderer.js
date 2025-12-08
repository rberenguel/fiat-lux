import {
    MAX_RENDER_CAPACITY,
    SYSTEM_SCALE,
    TAU,
    COLOR_WHITE,
    COLOR_DEAD_GREY
} from './constants.js';
import {
    SPRITE_POOL_BATCH_SIZE,
    SPRITE_SCALE_DEAD,
    SPRITE_SCALE_ALIVE,
    DYING_THRESHOLD_MAX,
    DYING_THRESHOLD_MIN,
    PARTICLE_HUE_OFFSET,
    PARTICLE_SATURATION,
    PARTICLE_LIGHTNESS_BASE,
    PARTICLE_LIGHTNESS_EXPLODE,
    PHASE_SHIFT_PER_PRESTIGE
} from './config.js';
import { GameState, g_x, g_y, setGX, setGY } from './state.js';
import { hslToHex } from './utils.js';

// Renderer state
export let app;
export let particleContainer;
export let particleTexture;

const spritePool = [];
let previousSpriteCount = 0;

/**
 * Calculate canvas size as 80% of smallest viewport dimension
 */
function calculateCanvasSize() {
    const minDimension = Math.min(window.innerWidth, window.innerHeight);
    return Math.floor(minDimension * 0.8);
}

/**
 * Initialize PIXI application and rendering assets
 */
export async function initializeRenderer() {
    const size = calculateCanvasSize();

    app = new PIXI.Application();
    await app.init({
        width: size,
        height: size,
        backgroundColor: 0x000000,
        antialias: true,
        preference: 'webgpu'
    });
    document.body.appendChild(app.canvas);

    // Handle window resize
    window.addEventListener('resize', () => {
        const newSize = calculateCanvasSize();
        app.renderer.resize(newSize, newSize);
    });

    // Create particle container
    particleContainer = new PIXI.Container();
    particleContainer.isRenderGroup = true;
    app.stage.addChild(particleContainer);

    // Generate particle texture
    const particleGraphics = new PIXI.Graphics().circle(0, 0, 10).fill(COLOR_WHITE);
    particleTexture = app.renderer.generateTexture(particleGraphics);
    particleGraphics.destroy();
}

/**
 * Ensure sprite pool has enough capacity
 * @param {number} count - Required sprite count
 */
function ensurePoolCapacity(count) {
    if (count < spritePool.length) return;
    const target = count + SPRITE_POOL_BATCH_SIZE;
    for (let i = spritePool.length; i < target; i++) {
        const sprite = new PIXI.Sprite(particleTexture);
        sprite.anchor.set(0.5);
        sprite.visible = false;
        sprite.scale = SPRITE_SCALE_ALIVE;
        spritePool.push(sprite);
        particleContainer.addChild(sprite);
    }
}

/**
 * Render all particles for current frame
 * @param {number} g_time - Global time variable
 */
export function renderParticles(g_time) {
    const totalParticles = GameState.particleCount;
    const activeLimit = GameState.currentActiveParticles;
    ensurePoolCapacity(totalParticles * totalParticles);

    const phaseShift = GameState.prestigeLevel * PHASE_SHIFT_PER_PRESTIGE;
    const W = app.screen.width;
    const H = app.screen.height;
    const r = TAU / SYSTEM_SCALE;

    let spriteIndex = 0;
    let current_g_x = g_x;
    let current_g_y = g_y;

    for (let i = 0; i < totalParticles; i++) {
        let baseTint = COLOR_WHITE;
        let explodeTint = COLOR_WHITE;

        if (i > 0 && i % 50 !== 0) {
            baseTint = hslToHex(
                ((i / totalParticles) * 360) + (GameState.prestigeLevel * PARTICLE_HUE_OFFSET),
                PARTICLE_SATURATION,
                PARTICLE_LIGHTNESS_BASE
            );
            explodeTint = hslToHex(
                ((i / totalParticles) * 360) + (GameState.prestigeLevel * PARTICLE_HUE_OFFSET),
                PARTICLE_SATURATION,
                PARTICLE_LIGHTNESS_EXPLODE
            );
        }

        for (let j = 0; j < totalParticles; j++) {
            const maxIndex = Math.max(i, j);

            // Add pseudo-random offset to make death less uniform
            // Using a simple deterministic noise based on particle indices
            const randomOffset = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
            const lifeMargin = activeLimit - maxIndex + (randomOffset * 1.5);

            const u = Math.sin(i + current_g_y + phaseShift) + Math.sin(r * i + current_g_x);
            const v = Math.cos(i + current_g_y + phaseShift) + Math.cos(r * i + current_g_x);

            current_g_x = u + g_time;
            current_g_y = v;

            if (spriteIndex >= MAX_RENDER_CAPACITY) break;

            const sprite = spritePool[spriteIndex];
            sprite.x = (u * SYSTEM_SCALE / 2) + (W / 2);
            sprite.y = (v * SYSTEM_SCALE / 2) + (H / 2);

            // Color and scale logic based on life margin
            if (lifeMargin <= 0) {
                // DEAD: Dark Void Grey
                sprite.tint = COLOR_DEAD_GREY;
                sprite.scale = SPRITE_SCALE_DEAD;
            } else if (lifeMargin < DYING_THRESHOLD_MAX && lifeMargin > DYING_THRESHOLD_MIN) {
                // DYING (upper threshold): Supernova Flash
                sprite.tint = explodeTint;
                sprite.scale = 0.1 / (0.5 + lifeMargin);
            } else if (lifeMargin < DYING_THRESHOLD_MIN) {
                // DYING (lower threshold): Supernova Flash
                sprite.tint = explodeTint;
                sprite.scale = lifeMargin * 0.5;
            } else {
                // ALIVE: Normal Star Color
                sprite.tint = baseTint;
                sprite.scale = SPRITE_SCALE_ALIVE;
            }

            sprite.alpha = 1.0;
            sprite.visible = true;
            spriteIndex++;
        }
    }

    // Update global animation variables
    setGX(current_g_x);
    setGY(current_g_y);

    // Hide unused sprites
    const maxClean = Math.max(spriteIndex, previousSpriteCount);
    for (let i = spriteIndex; i < maxClean; i++) {
        if (spritePool[i]) spritePool[i].visible = false;
    }
    previousSpriteCount = spriteIndex;
}
