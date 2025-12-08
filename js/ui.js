// UI element references and initialization

export let uiEntropy;
export let uiSpeed;
export let uiTempBar;
export let nValueLabel;
export let dmRow;
export let dmDisplay;
export let shopModal;
export let shopEntropy;
export let upgradesList;
export let prestigeBtn;
export let restartBtn;

/**
 * Initialize all UI element references
 */
export function initializeUI() {
    // Setup analysis results container
    const uiContainer = document.getElementById('analysisResults');
    uiContainer.innerHTML = `
        <div>Universe Energy: <span id="speedDisplay">100%</span></div>
        <div>Particles: <span id="nValueLabel" style="color:#00ccff">10<sup>20</sup></span></div>
        <div>Entropy: <span id="entropyDisplay">0</span></div>
        <div id="dmRow" style="display:none; color:#a100f2">Dark Matter: <span id="dmDisplay">0</span></div>
    `;

    // Get references to UI elements
    uiEntropy = document.getElementById('entropyDisplay');
    uiSpeed = document.getElementById('speedDisplay');
    uiTempBar = document.getElementById('timelineBar');
    nValueLabel = document.getElementById('nValueLabel');
    dmRow = document.getElementById('dmRow');
    dmDisplay = document.getElementById('dmDisplay');

    shopModal = document.getElementById('shopModal');
    shopEntropy = document.getElementById('shopEntropy');
    upgradesList = document.getElementById('upgradesList');
    restartBtn = document.getElementById('restartBtn');

    // Create prestige button
    prestigeBtn = document.createElement('button');
    prestigeBtn.id = "prestigeBtn";
    shopModal.insertBefore(prestigeBtn, restartBtn);
}
