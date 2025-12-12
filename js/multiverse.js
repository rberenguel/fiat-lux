/**
 * Multiverse Visualization
 * Shows a particle simulation like the universe, but with NO decay
 * Particles run continuously forever based on multiverseParticleCount
 */

import { GameState } from "./state.js";
import { MAX_RENDER_CAPACITY, TAU, COLOR_WHITE } from "./constants.js";
import {
  SPRITE_POOL_BATCH_SIZE,
  PARTICLE_HUE_OFFSET,
  PARTICLE_SATURATION,
  PARTICLE_LIGHTNESS_BASE,
  PHASE_SHIFT_PER_PRESTIGE,
} from "./config.js";
import { hslToHex } from "./utils.js";

let multiverseApp = null;
let multiverseContainer = null;
let multiverseTexture = null;
let multiverseBlobTexture = null;
const multiverseSpritePool = [];
let multiversePreviousSpriteCount = 0;

// Multiverse animation time (separate from universe time)
let multiverseTime = 0;
let multiverseX = 0;
let multiverseY = 0;

/**
 * Calculate canvas size as 80% of smallest viewport dimension
 */
function calculateCanvasSize() {
  const minDimension = Math.min(window.innerWidth, window.innerHeight);
  return Math.floor(minDimension * 0.8);
}

/**
 * Initialize the multiverse canvas
 */
export async function initializeMultiverseRenderer() {
  const size = calculateCanvasSize();

  // Create PIXI application for multiverse
  multiverseApp = new PIXI.Application();
  await multiverseApp.init({
    width: size,
    height: size,
    backgroundColor: 0x000000,
    antialias: true,
    preference: "webgpu",
  });

  multiverseApp.canvas.id = "multiverseCanvas";
  multiverseApp.canvas.style.display = "none"; // Hidden by default
  multiverseApp.canvas.style.position = "absolute";
  multiverseApp.canvas.style.top = "0";
  multiverseApp.canvas.style.left = "50%";
  multiverseApp.canvas.style.transform = "translateX(-50%)";
  document.body.appendChild(multiverseApp.canvas);

  // Handle window resize
  window.addEventListener("resize", () => {
    const newSize = calculateCanvasSize();
    multiverseApp.renderer.resize(newSize, newSize);
  });

  // Create container for particles
  multiverseContainer = new PIXI.Container();
  multiverseContainer.isRenderGroup = true;
  multiverseApp.stage.addChild(multiverseContainer);

  // Generate particle texture (same as universe)
  const particleGraphics = new PIXI.Graphics()
    .circle(0, 0, 10)
    .fill(COLOR_WHITE);
  multiverseTexture = multiverseApp.renderer.generateTexture(particleGraphics);
  particleGraphics.destroy();

  // Generate blob texture for high particle counts
  const blobGraphics = new PIXI.Graphics()
    .circle(0, 0, 15)
    .fill({ color: COLOR_WHITE, alpha: 0.8 });
  multiverseBlobTexture = multiverseApp.renderer.generateTexture(blobGraphics);
  blobGraphics.destroy();

  // Initialize animation time with random offset
  multiverseTime = -10 + 20 * Math.random();

  // Start the animation loop
  multiverseApp.ticker.add((ticker) => {
    if (multiverseApp.canvas.style.display !== "none") {
      renderMultiverseParticles(ticker.deltaTime);
    }
  });

  console.log("✨ Multiverse renderer initialized");
}

/**
 * Ensure sprite pool has enough capacity
 */
function ensurePoolCapacity(count) {
  if (count < multiverseSpritePool.length) return;
  const target = count + SPRITE_POOL_BATCH_SIZE;
  for (let i = multiverseSpritePool.length; i < target; i++) {
    const sprite = new PIXI.Sprite(multiverseTexture);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    sprite.scale = 0.1;
    multiverseSpritePool.push(sprite);
    multiverseContainer.addChild(sprite);
  }
}

/**
 * Render multiverse particles (like universe, but NO decay)
 */
function renderMultiverseParticles(deltaTime) {
  const particleCount = GameState.multiverseParticleCount;

  // Show message if no particles yet
  if (particleCount === 0) {
    multiverseContainer.removeChildren();
    const message = new PIXI.Text({
      text: "No timelines crystallized yet.\n\nCrystallize a timeline from the Universe\nto see particles here.",
      style: {
        fontFamily: "Cinzel, serif",
        fontSize: 24,
        fill: 0x888888,
        align: "center",
      },
    });
    message.anchor.set(0.5);
    message.position.set(
      multiverseApp.screen.width / 2,
      multiverseApp.screen.height / 2,
    );
    multiverseContainer.addChild(message);
    return;
  }

  ensurePoolCapacity(particleCount * particleCount);

  // Update animation time (multiverse runs at constant speed, no decay)
  const MULTIVERSE_TIME_SPEED = 0.0005; // Same as initial universe speed
  multiverseTime += MULTIVERSE_TIME_SPEED * deltaTime;

  const phaseShift = GameState.prestigeLevel * PHASE_SHIFT_PER_PRESTIGE;
  const W = multiverseApp.canvas.width;
  const H = multiverseApp.canvas.height;
  const dynamicScale = W * 0.45;
  const r = TAU / dynamicScale;

  // Determine texture and scale based on particle count
  const useBlobs = particleCount > 300;
  const currentTexture = useBlobs ? multiverseBlobTexture : multiverseTexture;
  const baseParticleScale = useBlobs
    ? (dynamicScale / 2500) * 2.5
    : dynamicScale / 2500;

  // Multiverse particles are always at full brightness (no heat death)
  const currentBaseLightness = PARTICLE_LIGHTNESS_BASE;

  let spriteIndex = 0;
  let current_g_x = multiverseX;
  let current_g_y = multiverseY;

  for (let i = 0; i < particleCount; i++) {
    let baseTint = COLOR_WHITE;

    // Color particles based on their index (same as universe)
    if (i > 0 && i % 50 !== 0) {
      baseTint = hslToHex(
        (i / particleCount) * 360 +
          GameState.prestigeLevel * PARTICLE_HUE_OFFSET,
        PARTICLE_SATURATION,
        currentBaseLightness,
      );
    }

    for (let j = 0; j < particleCount; j++) {
      const u =
        Math.sin(i + current_g_y + phaseShift) + Math.sin(r * i + current_g_x);
      const v =
        Math.cos(i + current_g_y + phaseShift) + Math.cos(r * i + current_g_x);

      current_g_x = u + multiverseTime;
      current_g_y = v;

      if (spriteIndex >= MAX_RENDER_CAPACITY) break;

      const sprite = multiverseSpritePool[spriteIndex];

      // Update texture if it has changed
      if (sprite.texture !== currentTexture) {
        sprite.texture = currentTexture;
      }

      sprite.x = (u * dynamicScale) / 2 + W / 2;
      sprite.y = (v * dynamicScale) / 2 + H / 2;

      // NO DECAY: All particles are always alive and full color
      sprite.tint = baseTint;
      sprite.scale = baseParticleScale;
      sprite.alpha = 1.0;
      sprite.visible = true;
      spriteIndex++;
    }
  }

  // Update animation variables
  multiverseX = current_g_x;
  multiverseY = current_g_y;

  // Hide unused sprites
  const maxClean = Math.max(spriteIndex, multiversePreviousSpriteCount);
  for (let i = spriteIndex; i < maxClean; i++) {
    if (multiverseSpritePool[i]) multiverseSpritePool[i].visible = false;
  }
  multiversePreviousSpriteCount = spriteIndex;
}

/**
 * Show the multiverse view
 */
export function showMultiverseView() {
  if (!multiverseApp) {
    console.error("Multiverse app not initialized!");
    return;
  }
  console.log(
    `🌌 Showing multiverse view - ${GameState.multiverseParticleCount} particles`,
  );
  multiverseApp.canvas.style.display = "block";
}

/**
 * Hide the multiverse view
 */
export function hideMultiverseView() {
  if (!multiverseApp) return;
  multiverseApp.canvas.style.display = "none";
}
