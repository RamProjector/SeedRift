import { gameState } from './state.js';
import { ALL_SPECIES } from '../data/speciesData.js';
import { soundEngine } from '../audio/sound.js';

class WardenProgress {
  constructor() {
    this.totalSpeciesCount = ALL_SPECIES.length;
  }

  getScannedCount() {
    return gameState.scannedSpecies.size;
  }

  getRank() {
    const count = this.getScannedCount();
    if (count >= 30) {
      return { title: "High Warden of Concord", capacityBonus: 3, level: 4 };
    } else if (count >= 15) {
      return { title: "Ecological Specialist", capacityBonus: 2, level: 3 };
    } else if (count >= 5) {
      return { title: "Field Surveyor", capacityBonus: 1, level: 2 };
    }
    return { title: "Novice Warden", capacityBonus: 0, level: 1 };
  }

  checkRankUpgrade() {
    const rank = this.getRank();
    const targetCap = 6 + rank.capacityBonus;
    if (gameState.maxCapacity !== targetCap) {
      gameState.maxCapacity = targetCap;
      soundEngine.playSampleAcquired();
      const evt = new CustomEvent('seedrift-rank-up', { detail: rank });
      window.dispatchEvent(evt);
    }
  }
}

export const wardenProgress = new WardenProgress();
