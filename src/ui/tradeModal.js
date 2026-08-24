import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class TradeUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'tradeModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="build-screen">
        <div class="modal-header">
          <h2>⚖️ Concord Resource Refinery Terminal</h2>
          <button class="btn-close-modal" id="closeTradeBtn">✕ Close Terminal</button>
        </div>

        <div class="resource-counter" style="margin:12px 0;">
          <div class="res-box">🌾 Spores: <strong id="trSpores">0</strong></div>
          <div class="res-box">💎 Crystals: <strong id="trCrystals">0</strong></div>
          <div class="res-box">🧬 Organics: <strong id="trOrganics">0</strong></div>
          <div class="res-box">⚡ Ancient DNA: <strong id="trDNA">0</strong></div>
        </div>

        <div class="build-grid">
          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">Refine 20 Spores → 10 Crystals</span>
            </div>
            <button class="btn-select-build" id="btnTrade1">Refine Spores</button>
          </div>

          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">Refine 20 Organics → 1 Ancient DNA</span>
            </div>
            <button class="btn-select-build" id="btnTrade2">Synthesize DNA</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    document.getElementById('closeTradeBtn').onclick = () => this.close();

    document.getElementById('btnTrade1').onclick = () => {
      if (gameState.extractedResources.spores >= 20) {
        gameState.extractedResources.spores -= 20;
        gameState.extractedResources.crystal += 10;
        soundEngine.playSampleAcquired();
        this.render();
      } else {
        soundEngine.playWarning();
      }
    };

    document.getElementById('btnTrade2').onclick = () => {
      if (gameState.extractedResources.organics >= 20) {
        gameState.extractedResources.organics -= 20;
        gameState.extractedResources.ancientDNA += 1;
        soundEngine.playSampleAcquired();
        this.render();
      } else {
        soundEngine.playWarning();
      }
    };
  }

  render() {
    const res = gameState.extractedResources;
    document.getElementById('trSpores').textContent = Math.floor(res.spores);
    document.getElementById('trCrystals').textContent = Math.floor(res.crystal);
    document.getElementById('trOrganics').textContent = Math.floor(res.organics);
    document.getElementById('trDNA').textContent = Math.floor(res.ancientDNA);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.render();
    this.modalEl.classList.remove('hidden');
    soundEngine.playChirp();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }
}

export const tradeUI = new TradeUI();
