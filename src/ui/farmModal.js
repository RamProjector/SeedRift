import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class FarmUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.activeFarm = null;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'farmModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="build-screen">
        <div class="modal-header">
          <h2>🌾 Hydroponic Farm Crop Selection</h2>
          <button class="btn-close-modal" id="closeFarmBtn">✕ Close</button>
        </div>

        <div class="build-grid">
          <div class="build-card" data-crop="frostmoss">
            <div class="build-card-top">
              <span class="build-title">🌱 Cultivate Frostmoss</span>
              <span class="build-cost">+3 Organics / 10s</span>
            </div>
            <p>Cultivates frost-resistant lichen. Produces steady organic compounds for Weave suit synthesis.</p>
            <button class="btn-select-build">Select Crop</button>
          </div>

          <div class="build-card" data-crop="sporestalk">
            <div class="build-card-top">
              <span class="build-title">🍄 Cultivate Kharon Spore Stalk</span>
              <span class="build-cost">+4 Spores / 10s</span>
            </div>
            <p>Cultivates low-gravity spore stalk cuttings. Produces high-grade spores for atmosphere filters.</p>
            <button class="btn-select-build">Select Crop</button>
          </div>

          <div class="build-card" data-crop="crystal">
            <div class="build-card-top">
              <span class="build-title">💎 Cultivate Glow Crystal Cluster</span>
              <span class="build-cost">+2 Crystals / 10s</span>
            </div>
            <p>Seeds bioluminescent quartz nodes. Harvests refined crystals for building extractors and relays.</p>
            <button class="btn-select-build">Select Crop</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    document.getElementById('closeFarmBtn').onclick = () => this.close();

    this.modalEl.querySelectorAll('.build-card').forEach(card => {
      card.querySelector('.btn-select-build').onclick = () => {
        const crop = card.dataset.crop;
        if (this.activeFarm) {
          this.activeFarm.cropType = crop;
          soundEngine.playSampleAcquired();
        }
        this.close();
      };
    });
  }

  open(farmStructure) {
    this.activeFarm = farmStructure;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    soundEngine.playChirp();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }
}

export const farmUI = new FarmUI();
