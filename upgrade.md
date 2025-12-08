Here is the consolidated design document for the **Layer 1 & Infinite Recursion** model.

# **LAYER 1: FIAT LUX & THE INFINITE STAIRCASE**

## **1\. The Phase Shift: Vacuum Phase Transition**

The transition from the initial game (Universe Simulator) to the meta-game is not a prestige loop where you restart; it is a permanent **Zoom Out**.

* **Trigger:** Accumulation of Critical Dark Matter (e.g., Threshold 100 DM).  
* **Event:** "The Vacuum Collapse."  
* **Visual:** The camera performs a permanent "Zoom Out." The entire screen that previously contained your single Universe shrinks into a single, glowing "dot" (Particle) in a vast, empty black void.  
* **State Change:** The player never returns to "Layer 0" (Micro-management). Layer 0 is now treated as a solved, atomic unit.

## **2\. The Abstraction: Fractal Recursion**

The game logic remains identical, but the semantic meaning of every variable shifts up one Order of Magnitude. We stop writing custom logic for "Universes" or "Multiverses" and instead define a generic SystemLayer class.

| Concept | Layer 0 (Micro) | Layer 1 (Macro) | Layer N (Generic) |
| :---- | :---- | :---- | :---- |
| **The Atom** | A Star | A Universe | Particle from Layer\_{N-1} |
| **The Container** | The Universe | The Multiverse | The Container of Layer\_N |
| **Resource A (Flow)** | Entropy | Dark Energy | Local Energy |
| **Resource B (Stock)** | Energy (Time Speed) | Vacuum Energy | Stability |
| **Decay Mechanism** | Cooling / Friction | Heat Death / Evaporation | Entropy Leak |
| **Creation Act** | Baryogenesis (Spawning Stars) | Fiat Lux (Spawning Universes) | Injection |
| **Reset Event** | The Big Crunch | The Big Rip | Collapse |

## **3\. The Gameplay Loop: Cosmic Churn**

The player now operates as a "Multiverse Generator" (or Layer N Generator). The goal is not to save a unit, but to maintain a high density of active units.

1. **Generate:** Resources accumulate automatically from active Particles (Universes).  
2. **Spend:** Player clicks **"Fiat Lux"** (Let there be light).  
   * *Cost:* Flow Resource.  
   * *Effect:* Instantiates a new Universe particle in the simulation.  
   * *Visual:* A new glowing dot joins the fractal swirl.  
3. **Decay:**  
   * Each Particle has a lifespan.  
   * As lifespan decreases, the particle's Alpha (brightness) fades.  
   * At lifespan \== 0, the particle vanishes (Garbage Collected).  
4. **Balance:** The player must spawn Particles faster than they evaporate to trigger the next Phase Shift.

## **4\. The Infinite Hierarchy (The Stack)**

To prevent the game from feeling identical at every layer, we introduce **Time Dilation** and **Stability Shifts**. As you ascend, the simulation becomes heavier and slower.

| Layer | Name | The "Particle" | Time Scale | Player Role |
| :---- | :---- | :---- | :---- | :---- |
| **0** | **Universe** | Star | **Chaos (Seconds)** | Micro-management (Clicker) |
| **1** | **Multiverse** | Universe | **Fluid (Minutes)** | Fleet Management (Strategy) |
| **2** | **The Bulk** | Multiverse Bubble | **Tectonic (Hours)** | Architecture (Planning) |
| **3** | **The Brane** | Bulk Node | **Glacial (Days)** | Gardening (Idle) |
| **4** | **The Absolute** | Brane Sheet | **Eternal** | Observation |

## **5\. The Economy: Fractal Upgrades**

Upgrades allow the player to automate the "Churn" of the current layer. They are functionally identical across layers but thematically scaled.

* **Stability Constant (Life):** Reduces the decay rate of particles.  
  * *Layer 0:* Strong Force.  
  * *Layer 1:* Cosmological Constant.  
* **Injection Velocity (Speed):** Increases the initial speed/energy of spawned particles.  
  * *Layer 0:* Big Bang Energy.  
  * *Layer 1:* Inflationary Epoch.  
* **Mass Generation (Yield):** "Fiat Lux" spawns a cluster of particles (2x, 10x) per click.  
  * *Layer 0:* Baryogenesis.  
  * *Layer 1:* Vacuum Genesis.

## **6\. Technical Implementation (PixiJS 8\)**

### **A. Data / View Separation**

We decouple the Renderer from the Simulation. The Renderer only cares about (x, y, alpha, texture).  
`const LAYERS = {`  
    `0: { name: "Universe", texture: "star_dot", decay: 0.1, physics: { speed: 2.0 } },`  
    `1: { name: "Multiverse", texture: "galaxy_spiral", decay: 0.01, physics: { speed: 0.5 } },`  
    `2: { name: "The Bulk", texture: "bubble_orb", decay: 0.001, physics: { speed: 0.1 } }`  
`};`

`class GameLayer {`  
    `constructor(levelIndex) {`  
        `this.config = LAYERS[levelIndex];`  
        `this.particles = [];`   
        `this.resource = 0;`     
    `}`

    `tick(dt) {`  
        `// 1. Generate Resource based on active particles`  
        `this.resource += this.particles.length * dt;`

        `// 2. Decay Particles`  
        `this.particles.forEach(p => p.life -= this.config.decay * dt);`

        `// 3. GC Dead Particles`  
        `this.particles = this.particles.filter(p => p.life > 0);`  
    `}`  
`}`

### **B. Visual Transition Strategy**

Since we cannot simulate infinite detail, we use **Texture Substitution**.

1. **Level N View:** The screen is full of complex sprites (e.g., Galaxies).  
2. **Phase Shift Trigger:** Screen flashes white.  
3. **Data Swap:** The GameLayer is destroyed and replaced with new GameLayer(N+1).  
4. **Visual Swap:** The Renderer switches textures from galaxy\_spiral to bubble\_orb. The 100 galaxies that were on screen are conceptually "compressed" into the first single bubble\_orb of the new layer.