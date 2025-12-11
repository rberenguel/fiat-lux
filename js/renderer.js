import {
  MAX_RENDER_CAPACITY,
  SYSTEM_SCALE,
  TAU,
  COLOR_WHITE,
  COLOR_DEAD_GREY,
} from "./constants.js";
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
  PHASE_SHIFT_PER_PRESTIGE,
} from "./config.js";
import { GameState, g_x, g_y, setGX, setGY } from "./state.js";
import { hslToHex } from "./utils.js";

// Renderer state
export let app;
export let particleContainer;
export let particleTexture;
export let blobTexture;

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
    preference: "webgpu",
  });
  document.body.appendChild(app.canvas);

  // Handle window resize
  window.addEventListener("resize", () => {
    const newSize = calculateCanvasSize();
    app.renderer.resize(newSize, newSize);
  });

  // Create particle container
  particleContainer = new PIXI.Container();
  particleContainer.isRenderGroup = true;
  app.stage.addChild(particleContainer);

  // Generate particle texture (radius 10 × sprite scale 0.1 = 1px effective)
  const particleGraphics = new PIXI.Graphics()
    .circle(0, 0, 10)
    .fill(COLOR_WHITE);
  particleTexture = app.renderer.generateTexture(particleGraphics);
  particleGraphics.destroy();

  // Generate blob texture for high particle counts (larger, softer)
  const blobGraphics = new PIXI.Graphics()
    .circle(0, 0, 15) // Larger radius than dots
    .fill({ color: COLOR_WHITE, alpha: 0.8 }); // Semi-transparent
  blobTexture = app.renderer.generateTexture(blobGraphics);
  blobGraphics.destroy();
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
  const W = app.canvas.width;
  const H = app.canvas.height;
  // Particles extend ±dynamicScale from center, so use 0.45 to fill 90% of canvas
  const dynamicScale = W * 0.45;
  const r = TAU / dynamicScale;

  // Determine texture and scale based on particle count
  const useBlobs = totalParticles > 300;
  const currentTexture = useBlobs ? blobTexture : particleTexture;

  // Scale particles proportionally: 1px when sphere radius = 250px
  // Base texture radius is 10 for dots, 15 for blobs
  const baseParticleScale = useBlobs
    ? (dynamicScale / 2500) * 2.5 // Blobs are larger
    : dynamicScale / 2500; // Dots normal size

  // Calculate temperature ratio for heat death visuals
  const tempRatio = Math.max(
    0,
    Math.min(1, GameState.currentTimeSpeed / GameState.baseTimeSpeed),
  );
  const currentBaseLightness =
    PARTICLE_LIGHTNESS_BASE * (0.2 + 0.8 * tempRatio); // Dims to 20% at heat death
  const currentExplodeLightness =
    PARTICLE_LIGHTNESS_EXPLODE * (0.3 + 0.7 * tempRatio); // Dims to 30% at heat death

  let spriteIndex = 0;
  let current_g_x = g_x;
  let current_g_y = g_y;

  for (let i = 0; i < totalParticles; i++) {
    let baseTint = COLOR_WHITE;
    let explodeTint = COLOR_WHITE;

    if (i > 0 && i % 50 !== 0) {
      baseTint = hslToHex(
        (i / totalParticles) * 360 +
          GameState.prestigeLevel * PARTICLE_HUE_OFFSET,
        PARTICLE_SATURATION,
        currentBaseLightness, // Use dynamic lightness based on temperature
      );
      explodeTint = hslToHex(
        (i / totalParticles) * 360 +
          GameState.prestigeLevel * PARTICLE_HUE_OFFSET,
        PARTICLE_SATURATION,
        currentExplodeLightness, // Use dynamic lightness based on temperature
      );
    }

    for (let j = 0; j < totalParticles; j++) {
      const maxIndex = Math.max(i, j);

      // Add pseudo-random offset to make death less uniform
      // Using a simple deterministic noise based on particle indices
      const randomOffset =
        (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
      const lifeMargin = activeLimit - maxIndex + randomOffset * 1.5;

      const u =
        Math.sin(i + current_g_y + phaseShift) + Math.sin(r * i + current_g_x);
      const v =
        Math.cos(i + current_g_y + phaseShift) + Math.cos(r * i + current_g_x);

      current_g_x = u + g_time;
      current_g_y = v;

      if (spriteIndex >= MAX_RENDER_CAPACITY) break;

      const sprite = spritePool[spriteIndex];

      // Update texture if it has changed (for blob vs dot switching)
      if (sprite.texture !== currentTexture) {
        sprite.texture = currentTexture;
      }

      sprite.x = (u * dynamicScale) / 2 + W / 2;
      sprite.y = (v * dynamicScale) / 2 + H / 2;

      // Color and scale logic based on life margin
      if (lifeMargin <= 0) {
        // DEAD: Dark Void Grey
        sprite.tint = COLOR_DEAD_GREY;
        sprite.scale = baseParticleScale;
      } else if (
        lifeMargin < DYING_THRESHOLD_MAX &&
        lifeMargin > DYING_THRESHOLD_MIN
      ) {
        // DYING (upper threshold): Supernova Flash
        sprite.tint = explodeTint;
        sprite.scale = baseParticleScale / (0.5 + lifeMargin);
      } else if (lifeMargin < DYING_THRESHOLD_MIN) {
        // DYING (lower threshold): Supernova Flash
        sprite.tint = explodeTint;
        sprite.scale = lifeMargin * baseParticleScale * 5;
      } else {
        // ALIVE: Normal Star Color
        sprite.tint = baseTint;
        sprite.scale = baseParticleScale;
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
