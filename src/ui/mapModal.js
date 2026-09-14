import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class MapUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'mapModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="ship-screen">
        <div class="ship-header">
          <h2>🗺️ Planetary Sector Topography Map</h2>
          <button class="btn-close-modal" id="closeMapBtn">✕ Close Sector Map</button>
        </div>

        <div class="ship-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div id="fullMapCanvasContainer" style="width:100%;max-width:600px;height:400px;background:#10150f;border:1px solid var(--border-active);border-radius:12px;position:relative;overflow:hidden;cursor:crosshair;"></div>
          <div style="margin-top:14px;font-size:12.5px;color:var(--text-secondary);display:flex;gap:16px;">
            <span>📍 Click Map to Set Waypoint</span>
            <span>🟡 Monolith</span>
            <span>🟢 Warden</span>
            <span>🟠 Combine Drone</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    document.getElementById('closeMapBtn').onclick = () => this.close();

    const mapContainer = document.getElementById('fullMapCanvasContainer');
    if (mapContainer) {
      mapContainer.onclick = (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Map pixel to world coordinates
        const worldX = (clickX - rect.width / 2) * 1.2;
        const worldZ = (clickY - rect.height / 2) * 1.2;

        gameState.customWaypoint = { x: worldX, z: worldZ };
        soundEngine.playSampleAcquired();
      };
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN') {
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

export const mapUI = new MapUI();
