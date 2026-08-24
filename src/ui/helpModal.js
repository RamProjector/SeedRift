import { soundEngine } from '../audio/sound.js';

export class HelpUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'helpModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="build-screen">
        <div class="modal-header">
          <h2>📖 Warden Field Survival Guide & Controls</h2>
          <button class="btn-close-modal" id="closeHelpBtn">✕ Close Guide</button>
        </div>

        <div class="build-grid">
          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">🎮 Movement & Controls</span>
            </div>
            <ul style="font-size:13px;line-height:1.6;margin:6px 0;padding-left:18px;">
              <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Arrow Keys — Walk & Navigate</li>
              <li><kbd>Shift</kbd> — Sprint (+50% Speed)</li>
              <li><kbd>Space</kbd> — Jump / Hold in Air to Glide (with Driftmoth membrane)</li>
              <li><kbd>C</kbd> — Underground Tunneling (with Burrower claws)</li>
              <li><kbd>Q</kbd> — Kinetic Mineral Shockwave Stomp (with Feldspar carapace)</li>
              <li><kbd>E</kbd> — Bio-Scanner Lock-On & Non-Lethal Sampling</li>
              <li><kbd>B</kbd> — Habitat Construction Menu</li>
              <li><kbd>Tab</kbd> — The Weave Suit Matrix</li>
              <li><kbd>M</kbd> — Warden Command Hub & Star Map</li>
            </ul>
          </div>

          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">🧬 The Adaptive Weave Matrix</span>
            </div>
            <p style="font-size:13px;line-height:1.4;">
              Unlike traditional tech trees, SEEDRIFT uses biological traits. Observe wild fauna & flora, extract non-lethal samples, and weave their genetic traits into your suit to survive planetary environmental hazards (Freezing Cold, Volcanic Heat, Spore Toxicity, Radiation, Hydrostatic Ocean Pressure).
            </p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    document.getElementById('closeHelpBtn').onclick = () => this.close();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' || e.code === 'Slash') {
        this.toggle();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    soundEngine.playChirp();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }
}

export const helpUI = new HelpUI();
