import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

export const ENCOUNTER_TYPES = [
  {
    id: "distress_ping",
    title: "📡 Concord Automated Route Distress Ping",
    description: "An automated pack-fauna hauling route pinged an emergency beacon after encountering aggressive territorial predators.",
    reward: "+15 Crystals & +10 Organics"
  },
  {
    id: "uncovered_ruin",
    title: "🏛️ Unsealed Firstseed Sub-Spire",
    description: "A recent seismic storm unsealed an ancient Firstseed sub-spire in this region. High energy resonance detected.",
    reward: "+1 Ancient Firstseed DNA"
  },
  {
    id: "keystone_migration",
    title: "🐘 Keystone Megafauna Unmapped Migration",
    description: "A massive herd of rare primary grazers has deviated from their continent route into this sector.",
    reward: "+25 Organics & Rare Splice Material"
  }
];

class EncounterSystem {
  constructor() {
    this.activeEncounter = null;
    this.encounterTimer = 75; // Trigger encounter every 75 sec
  }

  update(deltaSeconds) {
    this.encounterTimer -= deltaSeconds;
    if (this.encounterTimer <= 0) {
      this.triggerEncounter();
      this.encounterTimer = 90 + Math.random() * 60;
    }
  }

  triggerEncounter() {
    const enc = ENCOUNTER_TYPES[Math.floor(Math.random() * ENCOUNTER_TYPES.length)];
    this.activeEncounter = enc;

    soundEngine.playSampleAcquired();

    const evt = new CustomEvent('seedrift-encounter', { detail: enc });
    window.dispatchEvent(evt);
  }

  resolveEncounter() {
    if (!this.activeEncounter) return;

    if (this.activeEncounter.id === "distress_ping") {
      gameState.extractedResources.crystal += 15;
      gameState.extractedResources.organics += 10;
    } else if (this.activeEncounter.id === "uncovered_ruin") {
      gameState.extractedResources.ancientDNA += 1;
    } else if (this.activeEncounter.id === "keystone_migration") {
      gameState.extractedResources.organics += 25;
    }

    soundEngine.playSampleAcquired();
    const resolved = this.activeEncounter;
    this.activeEncounter = null;
    return resolved;
  }
}

export const encounterSystem = new EncounterSystem();
