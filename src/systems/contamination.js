import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

class BiosecuritySystem {
  constructor() {
    this.contaminationLevel = 0; // 0 to 100%
    this.lastWorldId = gameState.currentWorldId;
  }

  checkContaminationOnWorldChange(newWorldId) {
    if (this.lastWorldId !== newWorldId) {
      const sampleCount = Object.keys(gameState.samplesCollected).length;
      if (sampleCount > 0 && !gameState.hasSplice('s7')) {
        // Spore filter or decontamination prevents contamination
        this.contaminationLevel = Math.min(100, this.contaminationLevel + 35);
        if (this.contaminationLevel >= 50) {
          soundEngine.playWarning();
          const evt = new CustomEvent('seedrift-contamination', {
            detail: {
              msg: `⚠️ BIOSECURITY ALERT: Invasive spore cross-contamination detected on ${newWorldId}!`,
              level: this.contaminationLevel
            }
          });
          window.dispatchEvent(evt);
        }
      }
      this.lastWorldId = newWorldId;
    }
  }

  decontaminate() {
    this.contaminationLevel = 0;
    soundEngine.playSampleAcquired();
  }
}

export const biosecuritySystem = new BiosecuritySystem();
