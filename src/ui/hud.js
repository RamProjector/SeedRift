import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';
import { weaveUI } from './weave.js';
import { shipUI } from './ship.js';
import { helpUI } from './helpModal.js';
import { mapUI } from './mapModal.js';

export class HUDManager {
  constructor() {
    this.hudContainer = null;
    this.scannableTarget = null;
    this.onBuildToggleCallback = null;
    this.onConfirmBuildCallback = null;
    this.onCancelBuildCallback = null;
    this.onViewToggleCallback = null;
  }

  init(onBuildToggle, onConfirmBuild, onCancelBuild, onViewToggle) {
    this.onBuildToggleCallback = onBuildToggle;
    this.onConfirmBuildCallback = onConfirmBuild;
    this.onCancelBuildCallback = onCancelBuild;
    this.onViewToggleCallback = onViewToggle;

    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hudOverlay';
    this.hudContainer.innerHTML = `
      <div class="vitals-vignette-overlay" id="vignetteOverlay"></div>

      <!-- Vitals Panel (Top-Left) -->
      <div class="hud-vitals-panel">
        <div class="vital-row" id="vitalTemp" title="Core Temperature">
          <span class="vital-icon">🌡️</span>
          <div class="vital-bar-container">
            <div class="vital-bar" id="barTemp"></div>
          </div>
          <span class="vital-val" id="valTemp">37°C</span>
        </div>

        <div class="vital-row" id="vitalAtmo" title="Atmosphere / Oxygen Filter">
          <span class="vital-icon">💨</span>
          <div class="vital-bar-container">
            <div class="vital-bar" id="barAtmo"></div>
          </div>
          <span class="vital-val" id="valAtmo">100%</span>
        </div>

        <div class="vital-row" id="vitalHydra" title="Suit Hydration">
          <span class="vital-icon">💧</span>
          <div class="vital-bar-container">
            <div class="vital-bar" id="barHydra"></div>
          </div>
          <span class="vital-val" id="valHydra">100%</span>
        </div>

        <div class="vital-row" id="vitalRad" title="Radiation / Pressure">
          <span class="vital-icon" id="iconRad">☢️</span>
          <div class="vital-bar-container">
            <div class="vital-bar" id="barRad"></div>
          </div>
          <span class="vital-val" id="valRad">Safe</span>
        </div>

        <div class="vital-row" id="vitalHealth" title="Warden Suit Integrity">
          <span class="vital-icon">❤️</span>
          <div class="vital-bar-container">
            <div class="vital-bar" id="barHealth"></div>
          </div>
          <span class="vital-val" id="valHealth">100%</span>
        </div>
      </div>

      <!-- Time & World Clock (Top-Right) -->
      <div class="hud-time-panel">
        <div class="time-clock" id="hudClock">08:00 AM</div>
        <div class="time-details" id="hudWorldDetails">Kharon's Bloomfields · Day 1 (Spring)</div>
        <div class="event-badge hidden" id="hudEventBadge">⚡ EVENT ACTIVE</div>
        <div id="radarContainer" style="margin-top:8px;"></div>
      </div>

      <!-- Center Scanner Crosshair Reticle -->
      <div class="scanner-reticle" id="scannerReticle">
        <div class="reticle-ring"></div>
        <div class="reticle-dot"></div>
      </div>

      <!-- Right Scanner Readout Panel -->
      <div class="scanner-readout-panel hidden" id="scannerReadout">
        <div class="readout-header">
          <h3 id="readoutTitle">Unknown Organism</h3>
          <span class="readout-badge" id="readoutBadge">Photovore</span>
        </div>
        <div class="readout-body">
          <div class="sci-name" id="readoutSciName">Heliomarinor nocturnus</div>
          <p id="readoutDesc">A ground layer producer that forms the base of the food web.</p>
          <div class="readout-stats" id="readoutStats"></div>
          <button class="btn-sample" id="btnExtractSample">🧪 Extract Non-Lethal Sample</button>
        </div>
      </div>

      <!-- Bottom Toolbelt & Context Prompts -->
      <div class="hud-bottom-bar">
        <div class="context-prompt" id="contextPrompt">
          <kbd>E</kbd> Activate Bio-Scanner & Extract Sample
        </div>

        <div class="quick-nav-buttons">
          <button class="btn-nav" id="btnToggleView">📷 View [V]</button>
          <button class="btn-nav" id="btnOpenBuild">🔨 Build [B]</button>
          <button class="btn-nav" id="btnOpenWeave">🧬 Weave [Tab]</button>
          <button class="btn-nav" id="btnOpenShip">🚀 Hub [M]</button>
          <button class="btn-nav" id="btnOpenHelp">❓ Help [H]</button>
        </div>
      </div>

      <!-- Toast Notification Container -->
      <div class="notification-container" id="toastContainer"></div>
    `;

    document.body.appendChild(this.hudContainer);

    document.getElementById('btnToggleView').onclick = () => { if (this.onViewToggleCallback) this.onViewToggleCallback(); };
    document.getElementById('btnOpenBuild').onclick = () => { if (this.onBuildToggleCallback) this.onBuildToggleCallback(); };
    document.getElementById('btnOpenWeave').onclick = () => weaveUI.toggle();
    document.getElementById('btnOpenShip').onclick = () => shipUI.toggle();
    document.getElementById('btnOpenHelp').onclick = () => helpUI.toggle();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB') {
        if (this.onBuildToggleCallback) this.onBuildToggleCallback();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        weaveUI.toggle();
      } else if (e.code === 'KeyM') {
        shipUI.toggle();
      } else if (e.code === 'KeyE') {
        this.triggerScanAction();
      } else if (e.code === 'Enter') {
        if (this.onConfirmBuildCallback) this.onConfirmBuildCallback();
      } else if (e.code === 'Escape') {
        if (this.onCancelBuildCallback) this.onCancelBuildCallback();
      }
    });

    document.getElementById('btnExtractSample').onclick = () => {
      this.executeSampleExtraction();
    };

    window.addEventListener('seedrift-respawn', (e) => {
      this.showToast(e.detail.msg, 'warn');
    });

    window.addEventListener('seedrift-event-start', (e) => {
      this.showToast(`⚡ SIGNATURE EVENT ACTIVE: ${e.detail.name} on ${e.detail.worldName}!`, 'event');
    });

    window.addEventListener('seedrift-event-end', (e) => {
      this.showToast(`Signature event ${e.detail.name} concluded.`, 'info');
    });

    window.addEventListener('seedrift-rank-up', (e) => {
      this.showToast(`🎖️ WARDEN RANK UPGRADED! Title: ${e.detail.title} (+1 Weave Slot)`, 'event');
    });

    window.addEventListener('seedrift-contamination', (e) => {
      this.showToast(e.detail.msg, 'warn');
    });

    window.addEventListener('seedrift-encounter', (e) => {
      this.showToast(`📡 DYNAMIC ENCOUNTER: ${e.detail.title} (${e.detail.reward})`, 'event');
    });
  }

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  updateScannable(scannable, isBuildingPlacement = false) {
    const prompt = document.getElementById('contextPrompt');
    const reticle = document.getElementById('scannerReticle');

    if (isBuildingPlacement) {
      reticle.classList.remove('locked');
      prompt.innerHTML = `<kbd>Enter</kbd> Confirm Ghost Structure Placement &nbsp;·&nbsp; <kbd>Esc</kbd> Cancel Construction`;
      return;
    }

    if (scannable) {
      reticle.classList.add('locked');
      if (scannable.type === 'creature') {
        const name = scannable.entity.data.commonName;
        prompt.innerHTML = `<kbd>E</kbd> Scan & Extract Sample from <strong>${name}</strong> (${Math.round(scannable.distance)}m)`;
      } else if (scannable.type === 'flora') {
        prompt.innerHTML = `<kbd>E</kbd> Forage Wild Flora <strong>${scannable.flora.type}</strong> (${Math.round(scannable.distance)}m)`;
      } else if (scannable.type === 'ruin') {
        prompt.innerHTML = `<kbd>E</kbd> Access Firstseed Ancient Monolith Terminal`;
      } else if (scannable.type === 'rival') {
        prompt.innerHTML = `<kbd>E</kbd> Intercept Meridian Combine Survey Drone`;
      }
      this.scannableTarget = scannable;
    } else {
      reticle.classList.remove('locked');
      let extraKeys = '';
      if (gameState.hasSplice('s6')) extraKeys += ' &nbsp;·&nbsp; <kbd>C</kbd> Tunnel';
      if (gameState.hasSplice('s8')) extraKeys += ' &nbsp;·&nbsp; <kbd>Q</kbd> Shockwave';

      prompt.innerHTML = `<kbd>E</kbd> Scan &nbsp;·&nbsp; <kbd>V</kbd> View &nbsp;·&nbsp; <kbd>B</kbd> Build &nbsp;·&nbsp; <kbd>Tab</kbd> Weave &nbsp;·&nbsp; <kbd>M</kbd> Hub &nbsp;·&nbsp; <kbd>N</kbd> Map${extraKeys}`;
      this.scannableTarget = null;
    }
  }

  triggerScanAction() {
    if (!this.scannableTarget) {
      this.showToast("No scannable biological target, flora, ruin, or drone in range.", "info");
      return;
    }

    if (this.scannableTarget.type === 'creature') {
      const sp = this.scannableTarget.entity.data;
      this.openScanReadout(sp);
    } else if (this.scannableTarget.type === 'flora') {
      this.openFloraReadout(this.scannableTarget.flora);
    } else if (this.scannableTarget.type === 'ruin') {
      const monolith = this.scannableTarget.monolith;
      this.openRuinReadout(monolith);
    } else if (this.scannableTarget.type === 'rival') {
      this.openRivalReadout();
    }
  }

  openScanReadout(species) {
    soundEngine.playChirp();
    soundEngine.playCreatureVocal();
    this.activeSpeciesTarget = species;

    const readout = document.getElementById('scannerReadout');
    document.getElementById('readoutTitle').textContent = species.commonName;
    document.getElementById('readoutSciName').textContent = species.scientificName;
    document.getElementById('readoutBadge').textContent = species.taxonomy?.metabolicDomain || 'photovore';
    document.getElementById('readoutDesc').textContent = species.description;

    const statsEl = document.getElementById('readoutStats');
    statsEl.innerHTML = `
      <div><strong>Trophic:</strong> ${species.ecology?.trophicLevel || 'producer'}</div>
      <div><strong>Kingdom:</strong> ${species.taxonomy?.kingdom || 'fauna'}</div>
      <div><strong>Danger:</strong> ${species.gameplay?.dangerLevel || 'low'}</div>
      <div><strong>World:</strong> ${species.world}</div>
    `;

    document.getElementById('btnExtractSample').textContent = "🧪 Extract Non-Lethal Sample";
    readout.classList.remove('hidden');
  }

  openFloraReadout(floraObj) {
    soundEngine.playChirp();
    const readout = document.getElementById('scannerReadout');
    const world = gameState.getCurrentWorld();

    document.getElementById('readoutTitle').textContent = `Wild Flora: ${floraObj.type}`;
    document.getElementById('readoutSciName').textContent = "Photosynthetic Alien Flora";
    document.getElementById('readoutBadge').textContent = "Producer";
    document.getElementById('readoutDesc').textContent = "Native flora containing raw organic compounds and spore samples.";

    const statsEl = document.getElementById('readoutStats');
    statsEl.innerHTML = `
      <div><strong>Kingdom:</strong> Flora</div>
      <div><strong>Yield:</strong> +5 Organics & +3 Spores</div>
    `;

    const btn = document.getElementById('btnExtractSample');
    btn.textContent = "🌾 Forage & Collect Organic Material";
    this.activeSpeciesTarget = { isFlora: true, floraObj };

    readout.classList.remove('hidden');
  }

  openRuinReadout(monolith) {
    soundEngine.playChirp();
    const readout = document.getElementById('scannerReadout');
    const world = gameState.getCurrentWorld();

    document.getElementById('readoutTitle').textContent = world.ruinType;
    document.getElementById('readoutSciName').textContent = "Firstseed Ancient Infrastructure";
    document.getElementById('readoutBadge').textContent = "Ancient Archive";
    document.getElementById('readoutDesc').textContent = world.ruinDescription;

    const statsEl = document.getElementById('readoutStats');
    statsEl.innerHTML = `
      <div><strong>Status:</strong> Active Magnetic Resonance</div>
      <div><strong>Protocol:</strong> Firstseed Withdrawal Archive</div>
    `;

    const btn = document.getElementById('btnExtractSample');
    btn.textContent = "⚡ Download Ancient Firstseed Splice";
    this.activeSpeciesTarget = { isRuin: true, ruinUnlockSplice: world.ruinUnlockSplice };

    readout.classList.remove('hidden');
  }

  openRivalReadout() {
    soundEngine.playChirp();
    const readout = document.getElementById('scannerReadout');

    document.getElementById('readoutTitle').textContent = "Meridian Combine Drone";
    document.getElementById('readoutSciName').textContent = "Automated Survey Rig 09-B";
    document.getElementById('readoutBadge').textContent = "Rival Faction";
    document.getElementById('readoutDesc').textContent = "A high-speed Meridian Combine extraction drone running non-compliant mineral survey sweeps.";

    const statsEl = document.getElementById('readoutStats');
    statsEl.innerHTML = `
      <div><strong>Faction:</strong> Meridian Combine</div>
      <div><strong>Status:</strong> Surveying Crust</div>
    `;

    const btn = document.getElementById('btnExtractSample');
    btn.textContent = "📡 Hack Drone Core (+1 Ancient DNA)";
    this.activeSpeciesTarget = { isRival: true };

    readout.classList.remove('hidden');
  }

  executeSampleExtraction() {
    const readout = document.getElementById('scannerReadout');
    readout.classList.add('hidden');

    if (!this.activeSpeciesTarget) return;

    if (this.activeSpeciesTarget.isFlora) {
      this.activeSpeciesTarget.floraObj.harvested = true;
      gameState.extractedResources.organics += 5;
      gameState.extractedResources.spores += 3;
      soundEngine.playSampleAcquired();
      this.showToast(`🌾 Foraged ${this.activeSpeciesTarget.floraObj.type}! Collected +5 Organics & +3 Spores.`, 'event');
      return;
    }

    if (this.activeSpeciesTarget.isRival) {
      gameState.extractedResources.ancientDNA += 1;
      soundEngine.playSampleAcquired();
      this.showToast("📡 Intercepted Meridian Drone Core! Acquired +1 Ancient DNA sample.", "event");
      return;
    }

    if (this.activeSpeciesTarget.isRuin) {
      const sId = this.activeSpeciesTarget.ruinUnlockSplice;
      const splice = gameState.splices.find(s => s.id === sId);
      if (splice) {
        splice.unlocked = true;
        soundEngine.playSampleAcquired();
        this.showToast(`⚡ FIRSTSEED ARCHIVE DECODED! Unlocked ${splice.name}`, 'event');
      }
      return;
    }

    const species = this.activeSpeciesTarget;
    const res = gameState.collectSample(species);
    soundEngine.playSampleAcquired();

    if (res.unlockedNew) {
      this.showToast(`🧪 Sample Acquired: ${species.commonName}! NEW SPLICE UNLOCKED: ${res.unlockedName}`, 'event');
    } else {
      this.showToast(`🧪 Sample Acquired: ${species.commonName} (${res.count} total)`, 'info');
    }
  }

  update(deltaSeconds) {
    const v = gameState.vitals;
    const world = gameState.getCurrentWorld();

    document.getElementById('valTemp').textContent = `${Math.round(v.temp)}°C`;
    document.getElementById('barTemp').style.width = `${Math.min(100, Math.max(0, (v.temp / 60) * 100))}%`;

    document.getElementById('valAtmo').textContent = `${Math.round(v.atmosphere)}%`;
    document.getElementById('barAtmo').style.width = `${v.atmosphere}%`;

    document.getElementById('valHydra').textContent = `${Math.round(v.hydration)}%`;
    document.getElementById('barHydra').style.width = `${v.hydration}%`;

    document.getElementById('valHealth').textContent = `${Math.round(v.health)}%`;
    document.getElementById('barHealth').style.width = `${v.health}%`;

    const radVal = document.getElementById('valRad');
    if (world.hazards.radiation > 0) {
      radVal.textContent = `${Math.round(v.radiation)} rads`;
      document.getElementById('barRad').style.width = `${v.radiation}%`;
    } else if (world.hazards.pressure > 0) {
      radVal.textContent = `${Math.round(v.pressure)} atm`;
      document.getElementById('barRad').style.width = `${Math.min(100, (v.pressure / 30) * 100)}%`;
    } else {
      radVal.textContent = 'Safe';
      document.getElementById('barRad').style.width = '0%';
    }

    const vig = document.getElementById('vignetteOverlay');
    if (vig) {
      if (v.health < 35 || v.atmosphere < 25) {
        vig.className = 'vitals-vignette-overlay active-critical';
      } else if (v.health < 60) {
        vig.className = 'vitals-vignette-overlay active-warning';
      } else {
        vig.className = 'vitals-vignette-overlay';
      }
    }

    const h = Math.floor(gameState.timeOfDay);
    const m = Math.floor((gameState.timeOfDay % 1) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const strH = displayH < 10 ? `0${displayH}` : displayH;
    const strM = m < 10 ? `0${m}` : m;

    document.getElementById('hudClock').textContent = `${strH}:${strM} ${ampm}`;
    document.getElementById('hudWorldDetails').textContent = `${world.name} · Day ${gameState.dayCount} (${gameState.season})`;

    const evtBadge = document.getElementById('hudEventBadge');
    if (gameState.eventActive) {
      evtBadge.classList.remove('hidden');
    } else {
      evtBadge.classList.add('hidden');
    }
  }
}

export const hudManager = new HUDManager();
