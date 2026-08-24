import { gameState } from './systems/state.js';
import { vitalsSystem } from './systems/vitals.js';
import { eventSystem } from './systems/events.js';
import { ecologySim } from './systems/ecology.js';
import { loreSystem } from './systems/lore.js';
import { wardenProgress } from './systems/codex.js';
import { biosecuritySystem } from './systems/contamination.js';
import { encounterSystem } from './systems/encounters.js';
import { storageSystem } from './systems/storage.js';
import { WorldEngine } from './engine/world.js';
import { SkyboxEngine } from './engine/skybox.js';
import { EntityManager } from './engine/entities.js';
import { PlayerController } from './engine/player.js';
import { BuildingManager } from './engine/building.js';
import { RivalManager } from './engine/rivals.js';
import { HaulingManager } from './engine/hauling.js';
import { WeatherSystem } from './engine/weather.js';
import { HUDManager } from './ui/hud.js';
import { minimapRadar } from './ui/minimap.js';
import { weaveUI } from './ui/weave.js';
import { shipUI } from './ui/ship.js';
import { BuildUI } from './ui/buildModal.js';
import { helpUI } from './ui/helpModal.js';
import { soundEngine } from './audio/sound.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvasContainer');
    this.worldEngine = new WorldEngine(this.container);
    this.skyboxEngine = new SkyboxEngine(this.worldEngine.scene);
    this.entityManager = new EntityManager(this.worldEngine.scene, this.worldEngine);
    this.player = new PlayerController(this.worldEngine.scene, this.worldEngine.camera, this.worldEngine);
    this.buildingManager = new BuildingManager(this.worldEngine.scene, this.worldEngine);
    this.rivalManager = new RivalManager(this.worldEngine.scene, this.worldEngine);
    this.haulingManager = new HaulingManager(this.worldEngine.scene, this.worldEngine);
    this.weatherSystem = new WeatherSystem(this.worldEngine);

    this.hud = new HUDManager();
    this.buildUI = new BuildUI(this.buildingManager);
    this.lastTime = performance.now();
  }

  init() {
    storageSystem.load();
    ecologySim.init();

    weaveUI.init();
    shipUI.init((newWorld) => this.onWorldChange(newWorld), this.haulingManager);
    this.buildUI.init();
    helpUI.init();

    this.hud.init(
      () => this.buildUI.toggle(),
      () => {
        const res = this.buildingManager.confirmPlacement(this.player.position, this.player.group.rotation.y);
        if (res && res.msg) this.hud.showToast(res.msg, res.success ? 'info' : 'warn');
      },
      () => this.buildingManager.cancelPlacement()
    );

    const radarContainer = document.getElementById('radarContainer');
    if (radarContainer) minimapRadar.init(radarContainer);

    const worldData = gameState.getCurrentWorld();
    this.worldEngine.buildWorld(worldData);
    this.entityManager.populateWorld(worldData);
    this.rivalManager.populateRivals(worldData);

    window.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.resume();
    }, { once: true });

    requestAnimationFrame((t) => this.loop(t));
  }

  onWorldChange(newWorldData) {
    biosecuritySystem.checkContaminationOnWorldChange(newWorldData.id);
    this.worldEngine.buildWorld(newWorldData);
    this.entityManager.populateWorld(newWorldData);
    this.rivalManager.populateRivals(newWorldData);
    this.buildingManager.cancelPlacement();
    this.player.position.set(0, 5, 0);
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const deltaSeconds = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    gameState.updateTime(deltaSeconds * 0.8);
    gameState.updateExtractors(deltaSeconds);
    ecologySim.update(deltaSeconds);
    vitalsSystem.update(deltaSeconds);
    eventSystem.update(deltaSeconds);
    encounterSystem.update(deltaSeconds);
    storageSystem.update(deltaSeconds);
    this.weatherSystem.update(deltaSeconds);
    this.skyboxEngine.update(deltaSeconds);
    wardenProgress.checkRankUpgrade();

    this.player.update(deltaSeconds);
    this.entityManager.update(deltaSeconds, this.player.position);
    this.rivalManager.update(deltaSeconds);
    this.haulingManager.update(deltaSeconds);
    this.worldEngine.update(deltaSeconds, this.player.position);

    minimapRadar.update(
      this.player.position,
      this.player.group.rotation.y,
      this.entityManager,
      this.entityManager.ruinMonolith,
      this.rivalManager
    );

    if (this.buildingManager.isPlacing) {
      this.buildingManager.updatePreview(this.player.position, this.player.group.rotation.y);
    }
    this.buildingManager.updateStructures(deltaSeconds, this.player.position);

    const scannable = this.entityManager.getNearestScannable(
      this.player.position,
      this.rivalManager
    );
    this.hud.updateScannable(scannable, this.buildingManager.isPlacing);

    this.hud.update(deltaSeconds);

    this.worldEngine.render(
      this.player.position,
      this.player.group.rotation.y,
      this.entityManager,
      this.entityManager.ruinMonolith,
      this.rivalManager,
      this.buildingManager
    );
  }
}

function start() {
  try {
    const game = new Game();
    game.init();
  } catch (err) {
    console.error("Game Init Failed:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
