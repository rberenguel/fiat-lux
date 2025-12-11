import {
  GameState,
  g_time,
  incrementGTime,
  initializeLayerSystem,
  syncGameStateToLayer,
  loadGame,
  saveGame,
} from "./state.js";
import {
  DARK_MATTER_ENTROPY_MULTIPLIER,
  ENTROPY_DIVISOR,
  getDecayRate,
  INITIAL_PARTICLE_COUNT,
  OBSERVABLES_RATE,
} from "./config.js";
import {
  initializeRenderer,
  app,
  renderParticles,
  particleContainer,
  particleTexture,
} from "./renderer.js";
import {
  initializeUI,
  uiEntropy,
  uiSpeed,
  uiTempBar,
  nValueLabel,
  dmRow,
  dmDisplay,
  vacuumRow,
  vacuumDisplay,
  observablesRow,
  observablesDisplay,
  restartBtn,
} from "./ui.js";
import { formatNumber } from "./utils.js";
import {
  startEpoch,
  checkDeathConditions,
  setupRestartButton,
  restoreUpgradeCosts,
  initializeMenu,
  processAutoBuys,
} from "./gameplay.js";
import { initializeDebugPanel } from "./debug.js";
import {
  shouldSpawnPrimordialMatter,
  spawnPrimordialMatter,
  updateAllPrimordialMatter,
  resetPrimordialMatterCounters,
  clickPrimordialMatter,
  getActivePrimordialOrbs,
} from "./primordial.js";

(async () => {
  // Initialize all systems
  await initializeRenderer();
  initializeUI();

  // Check for ?new URL parameter to force fresh start
  const urlParams = new URLSearchParams(window.location.search);
  const forceNew = urlParams.has("new");

  // Try to load saved game, otherwise initialize fresh
  const saveLoaded = !forceNew && (await loadGame());
  if (!saveLoaded) {
    initializeLayerSystem(); // Initialize layer system (starts at Layer 0)
  } else {
    // Restore upgrade costs from save data
    restoreUpgradeCosts(GameState.upgradePurchaseCounts || {});
  }

  setupRestartButton(restartBtn);
  initializeMenu(); // Initialize menu modal and keyboard shortcuts
  initializeDebugPanel(); // Add debug panel if ?debug is in URL

  // Hide particles initially (do this AFTER renderer is initialized)
  particleContainer.alpha = 0;

  // Setup click handler for primordial matter
  particleContainer.interactive = true;
  particleContainer.on("pointerdown", (event) => {
    const orbs = getActivePrimordialOrbs();
    for (const orb of orbs) {
      if (orb.containsPoint) {
        const localPoint = orb.toLocal(event.data.global);
        const bounds = new PIXI.Rectangle(
          -orb.width / 2,
          -orb.height / 2,
          orb.width,
          orb.height,
        );
        if (bounds.contains(localPoint.x, localPoint.y)) {
          clickPrimordialMatter(orb);
          break;
        }
      }
    }
  });

  // Setup start modal
  const startModal = document.getElementById("startModal");
  const startBtn = document.getElementById("startBtn");

  startBtn.onclick = () => {
    // Trigger fade out
    startModal.classList.add("fade-out");

    // Wait for fade to complete, then start game with fade-in
    startModal.addEventListener(
      "transitionend",
      () => {
        startModal.style.display = "none";
        startEpoch();

        // Fade in particles over 2 seconds
        const fadeInDuration = 2000;
        const fadeInStart = Date.now();

        const animateFadeIn = () => {
          const elapsed = Date.now() - fadeInStart;
          const progress = Math.min(elapsed / fadeInDuration, 1);
          particleContainer.alpha = progress;

          if (progress < 1) {
            requestAnimationFrame(animateFadeIn);
          }
        };

        animateFadeIn();
      },
      { once: true },
    );
  };

  // Don't start automatically - wait for user to click
  // startEpoch();

  // Auto-save when window loses focus
  window.addEventListener("blur", () => {
    saveGame(); // Auto-save when leaving tab
  });

  // Auto-save every 30 seconds
  setInterval(() => {
    saveGame();
  }, 30000);

  // --- CORE GAME LOOP ---
  app.ticker.add((ticker) => {
    if (!GameState.isRunning) return;

    // Track total playtime (deltaTime is 1.0 at 60fps = 1/60 second)
    GameState.totalPlayTime += ticker.deltaTime / 60;

    // Track universe run duration (for vacuum energy calculation)
    GameState.universeRunDuration += ticker.deltaTime / 60;

    // Normalize for frame rate - deltaTime is 1.0 at 60fps
    // Apply time multiplier for fast forward
    const dt = ticker.deltaTime * GameState.timeMultiplier;

    // 1. PHYSICS: Decay & Friction (time-normalized)
    const totalDrag = GameState.particleCount * GameState.frictionCoeff;
    GameState.currentTimeSpeed -= totalDrag * dt;

    // Dynamic decay: slows as particle count increases
    const dynamicDecayRate = getDecayRate(
      Math.floor(GameState.currentActiveParticles),
    );
    GameState.currentActiveParticles -= dynamicDecayRate * dt;

    // 2. UPDATE UI: Visual Status
    const tempRatio = Math.max(
      0,
      GameState.currentTimeSpeed / GameState.baseTimeSpeed,
    );
    uiTempBar.style.transform = `scaleX(${tempRatio})`;
    uiSpeed.textContent = Math.floor(tempRatio * 100) + "%";

    // 3. CHECK: Death Conditions
    if (checkDeathConditions()) {
      return;
    }

    // 4. RENDER: Particles
    const activeLimit = GameState.currentActiveParticles;
    renderParticles(g_time);

    // 4.5 PRIMORDIAL MATTER: Spawn and update
    if (shouldSpawnPrimordialMatter()) {
      spawnPrimordialMatter(app, particleContainer, particleTexture);
    }
    updateAllPrimordialMatter(ticker.deltaTime);

    // 5. CALCULATE: Entropy Income (time-normalized)
    if (GameState.currentTimeSpeed > 0 && activeLimit > 0) {
      // Base entropy multiplier from dark matter
      let entropyMult =
        1 + GameState.darkMatter * DARK_MATTER_ENTROPY_MULTIPLIER;

      // Apply Stellar Nucleosynthesis time bonus if unlocked
      if (GameState.hasNucleosynthesis) {
        // Bonus: +5% per 10x playtime (logarithmic scaling)
        // Examples: 1 min = 1.00x, 10 min = 1.05x, 100 min = 1.10x, 1000 min = 1.15x
        const timeBonus =
          1 + Math.log10(GameState.totalPlayTime / 60 + 1) * 0.05;
        entropyMult *= timeBonus;
      }

      let currentOutput;
      if (GameState.activeLayerIndex === 0) {
        // Layer 0: Grid-based (quadratic scaling)
        const activeSpritesApprox = activeLimit * activeLimit;
        currentOutput =
          (activeSpritesApprox / ENTROPY_DIVISOR) *
          (GameState.currentTimeSpeed / GameState.baseTimeSpeed) *
          entropyMult *
          dt;
      } else {
        // Layer 1+: Per-universe (linear scaling)
        // Each universe generates roughly the same as a full Layer 0 cycle
        const LAYER0_BASE_ENTROPY =
          (INITIAL_PARTICLE_COUNT * INITIAL_PARTICLE_COUNT) / ENTROPY_DIVISOR;
        currentOutput =
          GameState.particleCount *
          LAYER0_BASE_ENTROPY *
          (GameState.currentTimeSpeed / GameState.baseTimeSpeed) *
          entropyMult *
          dt;
      }

      GameState.entropy += currentOutput;
      GameState.lifetimeEntropy += currentOutput;

      // Process auto-buys
      processAutoBuys();
    }

    // 5.5. LAYER 1: Observables Generation (outside entropy check, always ticks in Layer 1)
    if (GameState.activeLayerIndex > 0 && GameState.particleCount > 0) {
      GameState.observables +=
        GameState.particleCount * OBSERVABLES_RATE * (ticker.deltaTime / 60);
    }

    // Continue with UI updates if we generated entropy
    if (GameState.currentTimeSpeed > 0 && activeLimit > 0) {
      // 6. UPDATE UI: Stats
      uiEntropy.textContent = formatNumber(GameState.entropy);

      const currentExponent = Math.floor(activeLimit);
      nValueLabel.innerHTML = `10<sup>${currentExponent}</sup>`;

      if (GameState.darkMatter > 0) {
        dmRow.style.display = "block";
        dmDisplay.textContent = GameState.darkMatter;
      }

      if (GameState.vacuumEnergy > 0) {
        vacuumRow.style.display = "block";
        vacuumDisplay.textContent = GameState.vacuumEnergy.toFixed(3);
      }

      if (GameState.observables > 0) {
        observablesRow.style.display = "block";
        observablesDisplay.textContent = GameState.observables.toFixed(2);
      }

      incrementGTime(GameState.currentTimeSpeed * dt); // Normalize for frame rate
    }

    // Sync GameState changes to active layer
    syncGameStateToLayer();
  });
})();
