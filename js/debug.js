import { GameState, syncGameStateToLayer } from "./state.js";
import { checkPhaseShift } from "./gameplay.js";
import { LAYERS } from "./config.js";

/**
 * Initialize debug panel if ?debug is in URL
 */
export function initializeDebugPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("debug")) return;

  // Create debug panel
  const debugPanel = document.createElement("div");
  debugPanel.id = "debugPanel";
  debugPanel.innerHTML = `
        <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.9);
                    border: 2px solid #00ff00; padding: 15px; color: #00ff00;
                    font-family: monospace; font-size: 12px; z-index: 10000;
                    max-width: 300px;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #ffff00;">🐛 DEBUG PANEL</div>

            <div style="margin-bottom: 8px;">
                Layer: <span id="debugLayer">0</span> - <span id="debugLayerName">Universe</span>
            </div>
            <div style="margin-bottom: 8px;">
                DM: <span id="debugDM">0</span> / 100
            </div>
            <div style="margin-bottom: 8px;">
                Particles: <span id="debugParticles">0</span>
            </div>
            <div style="margin-bottom: 8px;">
                Observables: <span id="debugObservables">0</span>
            </div>

            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                <button id="debugAddEntropy" style="background: #003300; color: #00ff00; border: 1px solid #00ff00; padding: 5px; cursor: pointer;">
                    +10K Entropy
                </button>
                <button id="debugAddDM" style="background: #330033; color: #ff00ff; border: 1px solid #ff00ff; padding: 5px; cursor: pointer;">
                    +50 Dark Matter
                </button>
                <button id="debugAddObservables" style="background: #003333; color: #00ffaa; border: 1px solid #00ffaa; padding: 5px; cursor: pointer;">
                    +100 Observables
                </button>
                <button id="debugPhaseShift" style="background: #333300; color: #ffff00; border: 1px solid #ffff00; padding: 5px; cursor: pointer;">
                    Force Phase Shift (→L1)
                </button>
                <button id="debugAddParticle" style="background: #003366; color: #00aaff; border: 1px solid #00aaff; padding: 5px; cursor: pointer;">
                    +1 Particle
                </button>
                <button id="debugResetLayer" style="background: #330000; color: #ff0000; border: 1px solid #ff0000; padding: 5px; cursor: pointer;">
                    Reset to Layer 0
                </button>
            </div>
        </div>
    `;
  document.body.appendChild(debugPanel);

  // Update debug display
  updateDebugDisplay();

  // Button handlers
  document.getElementById("debugAddEntropy").onclick = () => {
    GameState.entropy += 10000;
    GameState.lifetimeEntropy += 10000;
    syncGameStateToLayer();
    updateDebugDisplay();
  };

  document.getElementById("debugAddDM").onclick = () => {
    GameState.darkMatter += 50;
    syncGameStateToLayer();
    updateDebugDisplay();
  };

  document.getElementById("debugAddObservables").onclick = () => {
    GameState.observables += 100;
    syncGameStateToLayer();
    updateDebugDisplay();
  };

  document.getElementById("debugPhaseShift").onclick = () => {
    checkPhaseShift();
    updateDebugDisplay();
  };

  document.getElementById("debugAddParticle").onclick = () => {
    GameState.particleCount += 1;
    syncGameStateToLayer();
    updateDebugDisplay();
  };

  document.getElementById("debugResetLayer").onclick = () => {
    if (confirm("Reset to Layer 0? This will clear all progress.")) {
      window.location.reload();
    }
  };

  // Update debug display every second
  setInterval(updateDebugDisplay, 1000);
}

/**
 * Update debug panel display
 */
function updateDebugDisplay() {
  const debugLayer = document.getElementById("debugLayer");
  const debugLayerName = document.getElementById("debugLayerName");
  const debugDM = document.getElementById("debugDM");
  const debugParticles = document.getElementById("debugParticles");
  const debugObservables = document.getElementById("debugObservables");

  if (debugLayer) {
    debugLayer.textContent = GameState.activeLayerIndex;
    debugLayerName.textContent = LAYERS[GameState.activeLayerIndex].name;
    debugDM.textContent = Math.floor(GameState.darkMatter);
    debugParticles.textContent = GameState.particleCount;
    debugObservables.textContent = GameState.observables.toFixed(2);
  }
}
