import { INITIAL_SPLICES } from '../data/splicesData.js';
import { WORLDS } from '../data/worlds.js';

class GameState {
  constructor() {
    this.currentWorldId = 'kharon-bloomfields';
    this.timeOfDay = 8.0; // 0 to 24 hours
    this.dayCount = 1;
    this.season = 'Spring';
    
    this.splices = JSON.parse(JSON.stringify(INITIAL_SPLICES));
    this.maxCapacity = 6;

    this.vitals = {
      health: 100,
      maxHealth: 100,
      temp: 37, // Celsius
      tempStatus: 'safe', // safe, warning, critical
      atmosphere: 100, // oxygen/filter
      hydration: 100,
      radiation: 0, // 0-100
      pressure: 1, // atmosphere pressure unit
      battery: 100
    };

    this.samplesCollected = {}; // { speciesId: count }
    this.scannedSpecies = new Set();
    this.extractedResources = {
      spores: 15,
      crystal: 5,
      organics: 25,
      ancientDNA: 2
    };

    this.extractors = {
      'kharon-bloomfields': { active: true, rate: 1.2, resource: 'spores' },
      'ashfields-coreth': { active: false, rate: 0.8, resource: 'crystal' },
      'hollow-steppe': { active: true, rate: 2.0, resource: 'organics' },
      'pallid-reach': { active: false, rate: 0.5, resource: 'ancientDNA' },
      'vantauri-deep': { active: false, rate: 1.0, resource: 'crystal' }
    };

    this.ruinsDiscovered = {
      'kharon-bloomfields': false,
      'ashfields-coreth': false,
      'hollow-steppe': false,
      'pallid-reach': false,
      'vantauri-deep': false
    };

    this.eventActive = false;
    this.eventTimer = 0;
    this.listeners = [];
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  getCurrentWorld() {
    return WORLDS[this.currentWorldId] || WORLDS['kharon-bloomfields'];
  }

  usedCapacity() {
    return this.splices.filter(s => s.equipped).reduce((sum, s) => sum + s.cost, 0);
  }

  getEquippedSplices() {
    return this.splices.filter(s => s.equipped);
  }

  hasSplice(id) {
    return this.splices.some(s => s.id === id && s.equipped);
  }

  toggleSplice(id) {
    const s = this.splices.find(x => x.id === id);
    if (!s) return { success: false, msg: "Splice not found" };

    const used = this.usedCapacity();
    if (!s.equipped && used + s.cost > this.maxCapacity) {
      return {
        success: false,
        msg: `Not enough capacity for ${s.name} — needs ${s.cost}, only ${this.maxCapacity - used} free.`
      };
    }

    s.equipped = !s.equipped;
    this.notify();
    return { success: true, equipped: s.equipped, name: s.name };
  }

  collectSample(species) {
    const id = species.id;
    this.samplesCollected[id] = (this.samplesCollected[id] || 0) + 1;
    this.scannedSpecies.add(id);

    // Check if this unlocks any splice
    let unlockedNew = false;
    let unlockedName = '';

    this.splices.forEach(s => {
      if (s.speciesId === id && !s.unlocked) {
        s.unlocked = true;
        unlockedNew = true;
        unlockedName = s.name;
      }
    });

    this.notify();
    return {
      count: this.samplesCollected[id],
      unlockedNew,
      unlockedName
    };
  }

  setWorld(worldId) {
    if (WORLDS[worldId]) {
      this.currentWorldId = worldId;
      this.notify();
      return true;
    }
    return false;
  }

  updateTime(deltaMinutes) {
    this.timeOfDay += deltaMinutes / 60;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
      this.dayCount += 1;
      const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
      this.season = seasons[Math.floor((this.dayCount / 8) % 4)];
    }
  }

  // Update automated extractor yields over time
  updateExtractors(deltaSeconds) {
    Object.keys(this.extractors).forEach(wId => {
      const ext = this.extractors[wId];
      if (ext.active) {
        this.extractedResources[ext.resource] = (this.extractedResources[ext.resource] || 0) + (ext.rate * deltaSeconds * 0.1);
      }
    });
  }
}

export const gameState = new GameState();
