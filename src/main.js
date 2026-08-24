import { gameState } from './systems/state.js';
import { vitalsSystem } from './systems/vitals.js';
import { eventSystem } from './systems/events.js';
import { WorldEngine } from './engine/world.js';
import { EntityManager } from './engine/entities.js';
import { PlayerController } from './engine/player.js';
import { HUDManager } from './ui/hud.js';
import { weaveUI } from './ui/weave.js';
import { shipUI } from './ui/ship.js';
import { soundEngine } from './audio/sound.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvasContainer');
    this.worldEngine = new WorldEngine(this.container);
    this.entityManager = new EntityManager(this.worldEngine.scene, this.worldEngine);
    this.player = new PlayerController(this.worldEngine.scene, this.worldEngine.camera, this.worldEngine);

    this.hud = new HUDManager();
    this.lastTime = performance.now();
  }

  init() {
    // 1. Initialize UI Modals
    weaveUI.init();
    shipUI.init((newWorld) => this.onWorldChange(newWorld));
    this.hud.init();

    // 2. Build initial world
    const worldData = gameState.getCurrentWorld();
    this.worldEngine.buildWorld(worldData);
    this.entityManager.populateWorld(worldData);

    // Initial audio resume trigger on first user click
    window.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.resume();
    }, { once: true });

    // 3. Start game loop
    requestAnimationFrame((t) => this.loop(t));
  }

  onWorldChange(newWorldData) {
    this.worldEngine.buildWorld(newWorldData);
    this.entityManager.populateWorld(newWorldData);
    this.player.position.set(0, 5, 0); // Reset player position
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const deltaSeconds = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // 1. Systems Update
    gameState.updateTime(deltaSeconds * 0.8); // 1 in-game min per 1.2 real sec
    gameState.updateExtractors(deltaSeconds);
    vitalsSystem.update(deltaSeconds);
    eventSystem.update(deltaSeconds);

    // 2. Player & Entities Update
    this.player.update(deltaSeconds);
    this.entityManager.update(deltaSeconds, this.player.position);
    this.worldEngine.update(deltaSeconds, this.player.position);

    // 3. Scanner Raycast Check
    const scannable = this.entityManager.getNearestScannable(
      this.player.position,
      this.worldEngine.camera.getWorldDirection(this.player.position.clone())
    );
    this.hud.updateScannable(scannable);

    // 4. HUD Update
    this.hud.update(deltaSeconds);

    // 5. Render Scene
    this.worldEngine.render();
  }
}

const game = new Game();
game.init();
