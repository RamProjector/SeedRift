import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

class StorageSystem {
  constructor() {
    this.storageKey = 'SEEDRIFT_SAVE_V1';
    this.autoSaveInterval = 30; // Auto-save every 30 sec
    this.timer = 0;
  }

  save() {
    try {
      const data = {
        currentWorldId: gameState.currentWorldId,
        timeOfDay: gameState.timeOfDay,
        dayCount: gameState.dayCount,
        season: gameState.season,
        samplesCollected: gameState.samplesCollected,
        scannedSpecies: Array.from(gameState.scannedSpecies),
        extractedResources: gameState.extractedResources,
        extractors: gameState.extractors,
        splices: gameState.splices.map(s => ({ id: s.id, equipped: s.equipped, unlocked: s.unlocked })),
        timestamp: Date.now()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Failed to save progress to LocalStorage:", e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (data.currentWorldId) gameState.currentWorldId = data.currentWorldId;
      if (data.timeOfDay) gameState.timeOfDay = data.timeOfDay;
      if (data.dayCount) gameState.dayCount = data.dayCount;
      if (data.season) gameState.season = data.season;
      if (data.samplesCollected) gameState.samplesCollected = data.samplesCollected;
      if (data.scannedSpecies) gameState.scannedSpecies = new Set(data.scannedSpecies);
      if (data.extractedResources) gameState.extractedResources = data.extractedResources;
      if (data.extractors) gameState.extractors = data.extractors;

      if (data.splices) {
        data.splices.forEach(savedS => {
          const liveS = gameState.splices.find(x => x.id === savedS.id);
          if (liveS) {
            liveS.equipped = savedS.equipped;
            liveS.unlocked = savedS.unlocked;
          }
        });
      }

      console.log("Loaded SEEDRIFT save state successfully!");
      return true;
    } catch (e) {
      console.warn("Failed to load save state:", e);
      return false;
    }
  }

  update(deltaSeconds) {
    this.timer += deltaSeconds;
    if (this.timer >= this.autoSaveInterval) {
      this.timer = 0;
      this.save();
    }
  }
}

export const storageSystem = new StorageSystem();
