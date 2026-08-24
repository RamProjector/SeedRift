import { soundEngine } from '../audio/sound.js';

export class SettingsUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'settingsModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="build-screen">
        <div class="modal-header">
          <h2>⚙️ SEEDRIFT Engine Settings</h2>
          <button class="btn-close-modal" id="closeSettingsBtn">✕ Close</button>
        </div>

        <div class="build-grid" style="grid-template-columns:1fr;">
          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">🔊 Audio Mute Toggle</span>
            </div>
            <p>Mute or unmute synthesized Web Audio sound effects and bio-vocals.</p>
            <button class="btn-select-build" id="btnToggleMute">🔊 Sound Enabled</button>
          </div>

          <div class="build-card">
            <div class="build-card-top">
              <span class="build-title">💾 Clear Local Save Data</span>
            </div>
            <p>Reset local save state and start a fresh Warden exploration run.</p>
            <button class="btn-select-build" id="btnResetSave" style="border-color:var(--warn);color:var(--warn);">⚠️ Reset Save Progress</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    document.getElementById('closeSettingsBtn').onclick = () => this.close();

    const muteBtn = document.getElementById('btnToggleMute');
    muteBtn.onclick = () => {
      soundEngine.muted = !soundEngine.muted;
      muteBtn.textContent = soundEngine.muted ? "🔇 Sound Muted" : "🔊 Sound Enabled";
    };

    document.getElementById('btnResetSave').onclick = () => {
      if (confirm("Reset all saved SEEDRIFT progress and restart?")) {
        localStorage.clear();
        location.reload();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyO') {
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

export const settingsUI = new SettingsUI();
