import {
  INITIAL_BASE_TIME_SPEED,
  INITIAL_FRICTION_COEFF,
  INITIAL_PARTICLE_COUNT,
  INITIAL_DECAY_RATE,
  LAYERS,
} from "./config.js";
import { GameLayer } from "./layer.js";
import { get, set } from "../lib/idb-keyval.js";

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
  lifetimeEntropy: 0,
  vacuumEnergy: 0, // Earned from universe lifespan at restart
  observables: 0, // Layer 1 currency from crystallized timelines
  multiverseParticleCount: 0, // Permanent particles in multiverse (separate from layer particleCount)

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
  restartCount: 0,

  // Tutorial flags
  primordialMatterSeen: false,

  // Primordial matter tracking
  primordialMatterSpawned: 0, // Count for current universe
  primordialMatterLastSpawn: 0, // Timestamp of last spawn
  universeStartTime: 0, // Timestamp when current universe started (for 5s cooldown after shop)

  // Time tracking
  totalPlayTime: 0, // Total seconds played

  // Synergy upgrade flags
  hasNucleosynthesis: false, // Stellar Nucleosynthesis upgrade
  hasPrimordialAttunement: false, // Increases primordial matter spawn rate
  primordialEntropyBonus: 0.02, // Base 2% of current entropy as bonus

  // Universe run tracking
  universeRunDuration: 0, // Seconds the current universe has been alive
  vacuumEnergyMultiplier: 1.0, // Can be boosted by upgrades

  // Layer 1: Observables system
  observablesUpgrades: {
    frictionConstant: 0, // Levels purchased for friction reduction
    decayConstant: 0, // Levels purchased for decay reduction
    planckConstant: 0, // Levels purchased for time speed increase
    darkMatterSensitivity: 0, // Levels purchased for DM multiplier boost
  },
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

// Save/Load System
const SAVE_KEY = "fiatLuxSave";

/**
 * Save current game state to IndexedDB
 */
export async function saveGame() {
  const layer = GameState.activeLayer;
  if (!layer) return;

  const saveData = {
    version: 1, // For future migration support
    timestamp: Date.now(),

    // Layer system
    activeLayerIndex: GameState.activeLayerIndex,

    // Active layer state
    entropy: layer.entropy,
    darkMatter: layer.darkMatter,
    prestigeLevel: layer.prestigeLevel,
    lifetimeEntropy: GameState.lifetimeEntropy || 0,
    vacuumEnergy: GameState.vacuumEnergy || 0,
    observables: GameState.observables || 0,
    multiverseParticleCount: GameState.multiverseParticleCount || 0,
    particleCount: layer.particleCount,
    baseTimeSpeed: layer.baseTimeSpeed,
    frictionCoeff: layer.frictionCoeff,
    decayRate: layer.decayRate,
    timeMultiplier: layer.timeMultiplier,
    restartCount: layer.restartCount,

    // Track upgrade purchases (to restore costs)
    upgradePurchaseCounts: GameState.upgradePurchaseCounts || {},

    // Prestige upgrades (one-time purchases)
    prestigeUpgrades: GameState.prestigeUpgrades || [],

    // Auto-buy settings
    autoBuyEnabled: GameState.autoBuyEnabled || {},
    autoBuyUnlocked: GameState.autoBuyUnlocked || {},

    // Tutorial flags
    primordialMatterSeen: GameState.primordialMatterSeen || false,

    // Total playtime tracking
    totalPlayTime: GameState.totalPlayTime || 0,

    // Synergy upgrade flags
    hasNucleosynthesis: GameState.hasNucleosynthesis || false,
    hasPrimordialAttunement: GameState.hasPrimordialAttunement || false,
    primordialEntropyBonus: GameState.primordialEntropyBonus || 0.02,

    // Vacuum energy system
    vacuumEnergyMultiplier: GameState.vacuumEnergyMultiplier || 1.0,

    // Layer 1: Observables system
    observablesUpgrades: GameState.observablesUpgrades || {
      frictionConstant: 0,
      decayConstant: 0,
      planckConstant: 0,
      darkMatterSensitivity: 0,
    },
  };

  await set(SAVE_KEY, saveData);
}

/**
 * Load game state from IndexedDB
 * @returns {boolean} True if save was found and loaded
 */
export async function loadGame() {
  const saveData = await get(SAVE_KEY);
  if (!saveData) return false;

  try {
    // Restore layer system
    const layerConfig = LAYERS[saveData.activeLayerIndex];
    const layer = new GameLayer(saveData.activeLayerIndex, layerConfig);

    // Restore layer state
    layer.entropy = saveData.entropy || 0;
    layer.darkMatter = saveData.darkMatter || 0;
    layer.prestigeLevel = saveData.prestigeLevel || 0;
    layer.particleCount = saveData.particleCount || INITIAL_PARTICLE_COUNT;
    layer.baseTimeSpeed = saveData.baseTimeSpeed || INITIAL_BASE_TIME_SPEED;
    layer.frictionCoeff = saveData.frictionCoeff || INITIAL_FRICTION_COEFF;
    layer.decayRate = saveData.decayRate || INITIAL_DECAY_RATE;
    layer.timeMultiplier = saveData.timeMultiplier || 1.0;
    layer.restartCount = saveData.restartCount || 0;

    // Set active layer
    GameState.activeLayerIndex = saveData.activeLayerIndex;
    GameState.activeLayer = layer;

    // Restore upgrade tracking
    GameState.upgradePurchaseCounts = saveData.upgradePurchaseCounts || {};
    GameState.prestigeUpgrades = saveData.prestigeUpgrades || [];
    GameState.autoBuyEnabled = saveData.autoBuyEnabled || {};
    GameState.autoBuyUnlocked = saveData.autoBuyUnlocked || {};
    GameState.lifetimeEntropy = saveData.lifetimeEntropy || 0;
    GameState.vacuumEnergy = saveData.vacuumEnergy || 0;
    GameState.observables = saveData.observables || 0;
    GameState.multiverseParticleCount = saveData.multiverseParticleCount || 0;
    GameState.primordialMatterSeen = saveData.primordialMatterSeen || false;
    GameState.totalPlayTime = saveData.totalPlayTime || 0;
    GameState.hasNucleosynthesis = saveData.hasNucleosynthesis || false;
    GameState.hasPrimordialAttunement =
      saveData.hasPrimordialAttunement || false;
    GameState.primordialEntropyBonus = saveData.primordialEntropyBonus || 0.02;
    GameState.vacuumEnergyMultiplier = saveData.vacuumEnergyMultiplier || 1.0;
    GameState.observablesUpgrades = saveData.observablesUpgrades || {
      frictionConstant: 0,
      decayConstant: 0,
      planckConstant: 0,
      darkMatterSensitivity: 0,
    };

    // Sync layer to GameState
    syncLayerToGameState();

    console.log("Game loaded successfully from IndexedDB");
    return true;
  } catch (error) {
    console.error("Error loading save data:", error);
    return false;
  }
}

/**
 * Delete save data (for testing or "wipe save" feature)
 */
export async function deleteSave() {
  await set(SAVE_KEY, undefined);
  console.log("Save data deleted");
}
