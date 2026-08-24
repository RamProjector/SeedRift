import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

export const FIRSTSEED_THEORIES = {
  withdrawal: {
    id: "withdrawal",
    name: "The Withdrawal Theory",
    summary: "The Firstseed departed this star cluster intentionally millions of years ago, leaving planetary ecosystems to self-regulate.",
    fragments: [
      {
        id: "frag_w1",
        world: "Kharon's Bloomfields",
        title: "Canopy Spire Resonant Log 01",
        text: "Log 884-C: Firstseed automated spires transitioned to autonomous stewardship. Primary biological seeding complete. No further direct intervention required."
      },
      {
        id: "frag_w2",
        world: "The Hollow Steppe",
        title: "Obelisk Navigation Log 04",
        text: "Log 912-A: Magnetic guide obelisks aligned to continental migration routes. Stellar departure sequence initiated."
      }
    ]
  },
  collapse: {
    id: "collapse",
    name: "The Collapse Theory",
    summary: "A cascade imbalance in Firstseed ecological spires led to the collapse of their civilization, leaving automated ruins running down.",
    fragments: [
      {
        id: "frag_c1",
        world: "Ashfields of Coreth",
        title: "Thermal Vault Diagnostic 02",
        text: "Diagnostic 404: Terraforming spire overload detected in crust. Chemosynthetic feedback loop exceeding containment thresholds."
      },
      {
        id: "frag_c2",
        world: "Pallid Reach",
        title: "Citadel Vault Fragment 09",
        text: "Alert: Radiation surge cascades uncontained. Spires operating on residual emergency energy grids."
      }
    ]
  },
  absorption: {
    id: "absorption",
    name: "The Absorption Theory",
    summary: "The Firstseed did not leave — they spliced their own genetic code directly into the native flora and fauna of each world, creating the biological Weave.",
    fragments: [
      {
        id: "frag_a1",
        world: "Vantauri Deep",
        title: "Abyssal Vault Genetic Trace 03",
        text: "Trace 108: Hydro-siphon DNA sequences matched against Firstseed Warden genome. Biological integration complete."
      },
      {
        id: "frag_a2",
        world: "Kharon's Bloomfields",
        title: "Spore Matrix Sequence 07",
        text: "Sequence 512: Suit Weave matrix origin verified. The living suite is not technology — it is an extension of ancestral Firstseed cells."
      }
    ]
  }
};

class LoreSystem {
  constructor() {
    this.unlockedFragments = new Set(["frag_w1"]);
  }

  unlockFragment(fragId) {
    if (!this.unlockedFragments.has(fragId)) {
      this.unlockedFragments.add(fragId);
      soundEngine.playSampleAcquired();
      return true;
    }
    return false;
  }

  isUnlocked(fragId) {
    return this.unlockedFragments.has(fragId);
  }
}

export const loreSystem = new LoreSystem();
