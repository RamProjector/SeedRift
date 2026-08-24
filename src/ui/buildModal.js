import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class BuildUI {
  constructor(buildingManager) {
    this.buildingManager = buildingManager;
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'buildModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="build-screen">
        <div class="modal-header">
          <h2>Habitat & Field Construction</h2>
          <button class="btn-close-modal" id="closeBuildBtn">✕ Close</button>
        </div>

        <div class="build-grid">
          <div class="build-card" data-type="biodome">
            <div class="build-card-top">
              <span class="build-title">🏡 Forward Base Biodome</span>
              <span class="build-cost">15 Organics · 10 Crystals</span>
            </div>
            <p>Creates a safe pressurized climate enclosure. Standing inside heals suit health and restores atmosphere.</p>
            <button class="btn-select-build">Build Ghost Structure</button>
          </div>

          <div class="build-card" data-type="farm">
            <div class="build-card-top">
              <span class="build-title">🌾 Organic Cultivation Farm Plot</span>
              <span class="build-cost">8 Organics · 4 Crystals</span>
            </div>
            <p>Cultivates harvested flora species into a renewable source of organic material over time.</p>
            <button class="btn-select-build">Build Ghost Structure</button>
          </div>

          <div class="build-card" data-type="extractor">
            <div class="build-card-top">
              <span class="build-title">💎 Deep Crust Mineral Extractor</span>
              <span class="build-cost">10 Organics · 12 Crystals</span>
            </div>
            <p>Drills into geothermal vents and rock veins to harvest crystals and minerals automatically.</p>
            <button class="btn-select-build">Build Ghost Structure</button>
          </div>

          <div class="build-card" data-type="relay">
            <div class="build-card-top">
              <span class="build-title">📡 Scanner Relay Spire</span>
              <span class="build-cost">5 Organics · 15 Crystals</span>
            </div>
            <p>Extends scanner field range, highlighting hidden Firstseed ruins and rare species migration routes.</p>
            <button class="btn-select-build">Build Ghost Structure</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    document.getElementById('closeBuildBtn').onclick = () => this.close();

    this.modalEl.querySelectorAll('.build-card').forEach(card => {
      card.querySelector('.btn-select-build').onclick = () => {
        const type = card.dataset.type;
        this.buildingManager.startPlacement(type);
        this.close();
      };
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }
}
