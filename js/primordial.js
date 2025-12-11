import { GameState, saveGame } from "./state.js";
import { primordialTutorialModal, primordialTutorialBtn } from "./ui.js";

// Active primordial matter orbs
let activePrimordialOrbs = [];

/**
 * Show the primordial matter tutorial modal (first time only)
 */
export function showPrimordialMatterTutorial() {
  if (GameState.primordialMatterSeen) {
    return false; // Already seen
  }

  GameState.isRunning = false; // Pause game
  primordialTutorialModal.style.display = "block";

  primordialTutorialBtn.onclick = () => {
    primordialTutorialModal.style.display = "none";
    GameState.primordialMatterSeen = true;
    GameState.isRunning = true; // Resume game
    saveGame();
  };

  return true; // Tutorial shown
}

/**
 * Reset primordial matter counters for new universe
 */
export function resetPrimordialMatterCounters() {
  GameState.primordialMatterSpawned = 0;
  GameState.primordialMatterLastSpawn = 0;

  // Remove all active primordial matter orbs
  activePrimordialOrbs.forEach((orb) => {
    if (orb.parent) {
      orb.parent.removeChild(orb);
    }
  });
  activePrimordialOrbs = [];
}

/**
 * Check if primordial matter should spawn
 * Max 2 per universe, minimum 10 seconds between spawns
 * No spawn in first universe or within first 5 seconds after shop
 */
export function shouldSpawnPrimordialMatter() {
  // Don't spawn in first universe (restartCount === 0)
  if (GameState.restartCount === 0) {
    return false;
  }

  // Don't spawn within first 5 seconds after shop closes
  const now = Date.now();
  if (now - GameState.universeStartTime < 5000) {
    return false;
  }

  // Don't spawn if universe is dying (< 30% energy)
  const energyRatio = GameState.currentTimeSpeed / GameState.baseTimeSpeed;
  if (energyRatio < 0.3) {
    return false;
  }

  // Max 2 per universe
  if (GameState.primordialMatterSpawned >= 2) {
    return false;
  }

  // Must be at least 10 seconds since last spawn
  if (now - GameState.primordialMatterLastSpawn < 10000) {
    return false;
  }

  // Random chance: 1% per second (checked every frame)
  // At 60fps, this is ~0.0167% per frame = 1% per second
  // Average first spawn: ~100 seconds
  // Can be increased with Primordial Attunement upgrade
  let baseChance = 0.01 / 60;

  // If upgrade is unlocked, double the spawn rate
  if (GameState.hasPrimordialAttunement) {
    baseChance *= 2; // 2% per second
  }

  return Math.random() < baseChance;
}

/**
 * Get active primordial orbs array
 */
export function getActivePrimordialOrbs() {
  return activePrimordialOrbs;
}

/**
 * Spawn primordial matter orb at random position
 * Returns the sprite object for click handling
 */
export function spawnPrimordialMatter(app, particleContainer, particleTexture) {
  console.log(
    "🔧 SPAWN CALLED - app:",
    app.screen.width,
    "x",
    app.screen.height,
  );

  // Use the SAME particle texture as everything else
  const sprite = new PIXI.Sprite(particleTexture);

  // Random position within canvas
  sprite.x = Math.random() * app.screen.width;
  sprite.y = Math.random() * app.screen.height;

  // Make it large and golden
  sprite.scale.set(12); // Much bigger than regular particles (which are ~0.1)
  sprite.anchor.set(0.5);
  sprite.tint = 0xffff00; // Bright yellow
  sprite.alpha = 1; // Start fully visible
  sprite.interactive = true;
  sprite.buttonMode = true;

  // Animation properties
  sprite.primordialData = {
    lifetime: 0,
    maxLifetime: 5000, // 5 seconds to click
    pulsePhase: Math.random() * Math.PI * 2,
  };

  // Add to the SAME container as particles
  particleContainer.addChild(sprite);
  activePrimordialOrbs.push(sprite);

  console.log(
    "⚡ PRIMORDIAL MATTER SPAWNED at",
    sprite.x.toFixed(0),
    sprite.y.toFixed(0),
    "| Count:",
    GameState.primordialMatterSpawned + 1,
    "/2",
    "| Sprite added to STAGE, total children:",
    app.stage.children.length,
    "| Alpha:",
    sprite.alpha,
    "| Tint:",
    sprite.tint.toString(16),
  );

  // Update tracking
  GameState.primordialMatterSpawned++;
  GameState.primordialMatterLastSpawn = Date.now();

  // Show tutorial on first spawn
  if (!GameState.primordialMatterSeen) {
    showPrimordialMatterTutorial();
  }

  // Fade in animation
  let fadeIn = 0;
  const fadeInterval = setInterval(() => {
    fadeIn += 0.05;
    sprite.alpha = Math.min(1, fadeIn);
    if (fadeIn >= 1) {
      clearInterval(fadeInterval);
      console.log(
        "✨ Primordial matter fade-in complete, alpha:",
        sprite.alpha,
      );
    }
  }, 16);

  return sprite;
}

/**
 * Update all active primordial matter orbs
 * Called from game loop
 */
export function updateAllPrimordialMatter(deltaTime) {
  activePrimordialOrbs = activePrimordialOrbs.filter((sprite) => {
    if (!sprite.primordialData) return false;

    const data = sprite.primordialData;
    data.lifetime += deltaTime * 16.67; // Convert to ms

    // Check if expired
    if (data.lifetime >= data.maxLifetime) {
      // Fade out - reduce alpha each frame
      sprite.alpha *= 0.85;
      if (sprite.alpha < 0.05) {
        console.log("💀 Primordial matter expired and removed");
        sprite.parent.removeChild(sprite);
        return false; // Remove from array
      }
    } else {
      // Pulsing glow animation (only while alive)
      data.pulsePhase += 0.1;
      const pulse = Math.sin(data.pulsePhase) * 0.3 + 0.7;
      sprite.alpha = pulse;
      sprite.scale.set(0.8 + pulse * 0.4);
    }

    // Debug - log once per second
    if (
      Math.floor(data.lifetime / 1000) !==
      Math.floor((data.lifetime - deltaTime * 16.67) / 1000)
    ) {
      console.log(
        "🔄 Primordial updating:",
        "pos:",
        sprite.x.toFixed(0),
        sprite.y.toFixed(0),
        "alpha:",
        sprite.alpha.toFixed(2),
        "scale:",
        sprite.scale.x.toFixed(2),
        "visible:",
        sprite.visible,
        "parent:",
        sprite.parent
          ? sprite.parent.children.length + " siblings"
          : "NO PARENT!",
        "lifetime:",
        (data.lifetime / 1000).toFixed(1) +
          "s/" +
          data.maxLifetime / 1000 +
          "s",
      );
    }

    return true; // Keep in array
  });
}

/**
 * Handle click on primordial matter
 * Returns entropy reward based on current entropy (like Idle Slayer's mechanic)
 */
export function clickPrimordialMatter(sprite) {
  if (!sprite.primordialData) return 0;

  const data = sprite.primordialData;

  // Reward is a percentage of current entropy (encourages deeper runs)
  // Base: 2% of current entropy, can be upgraded to 4%
  const reward = Math.floor(
    GameState.entropy * GameState.primordialEntropyBonus,
  );

  // Remove from active orbs array
  const index = activePrimordialOrbs.indexOf(sprite);
  if (index > -1) {
    activePrimordialOrbs.splice(index, 1);
  }

  // Particle burst effect on click
  sprite.tint = 0xffff00; // Bright flash
  sprite.alpha = 1;
  sprite.interactive = false; // Prevent double-click

  // Explode and fade
  let scale = 1;
  const explodeInterval = setInterval(() => {
    scale += 0.3;
    sprite.scale.set(scale);
    sprite.alpha -= 0.15;
    if (sprite.alpha <= 0) {
      clearInterval(explodeInterval);
      sprite.parent.removeChild(sprite);
    }
  }, 16);

  // Add entropy to GameState
  GameState.entropy += reward;

  console.log("💰 PRIMORDIAL MATTER CLICKED! Reward:", reward, "entropy");

  return reward;
}
