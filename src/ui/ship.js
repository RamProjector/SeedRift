import * as THREE from 'three';
import { WORLDS } from '../data/worlds.js';
import { SPECIES_BY_WORLD, ALL_SPECIES } from '../data/speciesData.js';
import { ProceduralMeshGenerator } from '../engine/procedural.js';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class ShipUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.activeTab = 'starmap';
    this.selectedSpecies = ALL_SPECIES[0];
    this.onWorldChangeCallback = null;
    this.haulingManager = null;
  }

  init(onWorldChange, haulingManager) {
    this.onWorldChangeCallback = onWorldChange;
    this.haulingManager = haulingManager;

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'shipModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="ship-screen">
        <div class="ship-header">
          <h2>Warden Ship Command Hub</h2>
          <div class="ship-tabs">
            <button class="ship-tab active" data-tab="starmap">🪐 Star Map</button>
            <button class="ship-tab" data-tab="biolab">🔬 Bio-Lab</button>
            <button class="ship-tab" data-tab="codex">📖 Species Codex (${ALL_SPECIES.length})</button>
            <button class="ship-tab" data-tab="logistics">⚙️ Logistics & Hauling</button>
          </div>
          <button class="btn-close-modal" id="closeShipBtn">✕ Close Command Hub</button>
        </div>

        <div class="ship-body" id="shipTabContent"></div>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    document.getElementById('closeShipBtn').onclick = () => this.close();

    const tabs = this.modalEl.querySelectorAll('.ship-tab');
    tabs.forEach(t => {
      t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this.activeTab = t.dataset.tab;
        soundEngine.playChirp();
        this.renderTab();
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
    this.renderTab();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  renderTab() {
    const container = document.getElementById('shipTabContent');
    if (!container) return;

    if (this.activeTab === 'starmap') {
      this.renderStarMap(container);
    } else if (this.activeTab === 'biolab') {
      this.renderBioLab(container);
    } else if (this.activeTab === 'codex') {
      this.renderCodex(container);
    } else if (this.activeTab === 'logistics') {
      this.renderLogistics(container);
    }
  }

  renderStarMap(container) {
    const currentW = gameState.getCurrentWorld();
    let html = `
      <div class="starmap-grid">
        <div class="world-list">
    `;

    Object.values(WORLDS).forEach(w => {
      const isCurrent = w.id === currentW.id;
      html += `
        <div class="world-card ${isCurrent ? 'active-world' : ''}" data-id="${w.id}">
          <div class="world-card-top">
            <span class="world-name">${w.name}</span>
            ${isCurrent ? '<span class="badge-current">CURRENT LOCATION</span>' : ''}
          </div>
          <div class="world-type">${w.type}</div>
          <p class="world-desc">${w.description}</p>
          <div class="world-specs">
            <span>Gravity: <strong>${w.gravity}g</strong></span>
            <span>Ruin: <strong>${w.ruinType}</strong></span>
            <span>Event: <strong>${w.signatureEvent}</strong></span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
        <div class="starmap-preview" id="starmapPreview">
          <h3>Target Sector: ${currentW.name}</h3>
          <p>${currentW.description}</p>
          <div class="hazard-summary">
            <strong>Environmental Hazards:</strong>
            <ul>
              ${currentW.hazards.heat > 0 ? `<li>🔥 Extreme Thermal Heat (${Math.round(currentW.hazards.heat * 100)}%)</li>` : ''}
              ${currentW.hazards.cold > 0 ? `<li>❄️ Sub-zero Freeze (${Math.round(currentW.hazards.cold * 100)}%)</li>` : ''}
              ${currentW.hazards.spores > 0 ? `<li>🌫️ Spore Toxicity (${Math.round(currentW.hazards.spores * 100)}%)</li>` : ''}
              ${currentW.hazards.radiation > 0 ? `<li>☢️ Radiation Pulse (${Math.round(currentW.hazards.radiation * 100)}%)</li>` : ''}
              ${currentW.hazards.pressure > 0 ? `<li>🌊 Hydrostatic Pressure (${Math.round(currentW.hazards.pressure * 100)}%)</li>` : ''}
              ${Object.values(currentW.hazards).every(v => v === 0) ? `<li>✅ Minimal Environmental Threats</li>` : ''}
            </ul>
          </div>
          <button class="btn-travel" id="travelBtn" ${currentW.id === gameState.currentWorldId ? 'disabled' : ''}>
            ${currentW.id === gameState.currentWorldId ? 'Currently Anchored' : '🚀 Drop Pod Launch to World'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('.world-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        gameState.setWorld(id);
        soundEngine.playChirp();
        this.renderStarMap(container);
      };
    });

    const travelBtn = document.getElementById('travelBtn');
    if (travelBtn && !travelBtn.disabled) {
      travelBtn.onclick = () => {
        soundEngine.playSampleAcquired();
        if (this.onWorldChangeCallback) this.onWorldChangeCallback(gameState.getCurrentWorld());
        this.close();
      };
    }
  }

  renderBioLab(container) {
    const samples = gameState.samplesCollected;
    const unlocked = gameState.splices.filter(s => s.unlocked);

    let html = `
      <div class="biolab-container">
        <div class="biolab-section">
          <h3>Synthesized Suit Splices (${unlocked.length} Unlocked / ${gameState.splices.length} Total)</h3>
          <div class="splice-grid">
            ${unlocked.map(s => `
              <div class="biolab-card unlocked">
                <span class="splice-title">${s.name}</span>
                <span class="splice-cat">${s.category}</span>
                <p>${s.effect}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="biolab-section">
          <h3>Field Samples Inventory</h3>
          <div class="samples-list">
            ${Object.keys(samples).length === 0 ? '<p class="empty-msg">No samples collected yet. Use scanner in field.</p>' : ''}
            ${Object.entries(samples).map(([sId, count]) => {
              const sp = ALL_SPECIES.find(x => x.id === sId);
              return `
                <div class="sample-item">
                  <span>🧪 ${sp ? sp.commonName : sId}</span>
                  <span class="sample-count">${count} samples</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    container.innerHTML = html;
  }

  renderCodex(container) {
    let html = `
      <div class="codex-grid">
        <div class="codex-sidebar">
          <input type="text" id="codexSearch" placeholder="🔍 Search species..." class="codex-input" />
          <div class="codex-list" id="codexList"></div>
        </div>
        <div class="codex-detail" id="codexDetail">
          Select a species from the field log to view full taxonomy & 3D model.
        </div>
      </div>
    `;
    container.innerHTML = html;

    const listEl = document.getElementById('codexList');
    const searchInput = document.getElementById('codexSearch');

    const renderList = (filter = '') => {
      listEl.innerHTML = '';
      const query = filter.toLowerCase();
      const filtered = ALL_SPECIES.filter(s =>
        s.commonName.toLowerCase().includes(query) ||
        s.scientificName.toLowerCase().includes(query) ||
        s.world.toLowerCase().includes(query)
      );

      filtered.forEach(s => {
        const item = document.createElement('div');
        item.className = 'codex-item' + (s.id === this.selectedSpecies.id ? ' selected' : '');
        item.innerHTML = `
          <div class="codex-item-name">${s.commonName}</div>
          <div class="codex-item-sci">${s.scientificName} · ${s.world}</div>
        `;
        item.onclick = () => {
          this.selectedSpecies = s;
          renderList(searchInput.value);
          this.renderSpeciesDetail(s);
        };
        listEl.appendChild(item);
      });
    };

    searchInput.oninput = (e) => renderList(e.target.value);
    renderList('');
    this.renderSpeciesDetail(this.selectedSpecies);
  }

  renderSpeciesDetail(species) {
    const detailEl = document.getElementById('codexDetail');
    if (!detailEl || !species) return;

    const tax = species.taxonomy || {};
    const phys = species.physical || {};
    const eco = species.ecology || {};

    detailEl.innerHTML = `
      <div class="specimen-header">
        <div>
          <h2>${species.commonName}</h2>
          <div class="sci-name"><em>${species.scientificName}</em> · ${species.world}</div>
        </div>
        <div class="domain-tag">${tax.metabolicDomain || 'photovore'}</div>
      </div>

      <div class="specimen-3d-viewport" id="specimen3DCanvas"></div>

      <div class="specimen-data">
        <p class="desc">${species.description}</p>

        <div class="data-row">
          <div>
            <strong>Taxonomy:</strong>
            <ul>
              <li>Kingdom: ${tax.kingdom || 'fauna'}</li>
              <li>Phylum: ${tax.phylum || 'Unclassified'}</li>
              <li>Class: ${tax.class || 'Unclassified'}</li>
            </ul>
          </div>
          <div>
            <strong>Ecology:</strong>
            <ul>
              <li>Trophic Level: ${eco.trophicLevel || 'consumer'}</li>
              <li>Danger Level: ${species.gameplay?.dangerLevel || 'low'}</li>
              <li>Observation Difficulty: ${species.gameplay?.observationDifficulty || 'easy'}</li>
            </ul>
          </div>
        </div>

        <div class="field-entry">
          <strong>Field Log Excerpt:</strong>
          <p>"${species.gameplay?.fieldLogEntry || species.description}"</p>
        </div>
      </div>
    `;

    setTimeout(() => {
      const viewport = document.getElementById('specimen3DCanvas');
      if (viewport) {
        viewport.innerHTML = '';
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#10150F');
        const camera = new THREE.PerspectiveCamera(50, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
        camera.position.set(0, 1.5, 4);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        viewport.appendChild(renderer.domElement);

        const amb = new THREE.AmbientLight('#ffffff', 0.8);
        const dir = new THREE.DirectionalLight('#5fe6b4', 1.2);
        dir.position.set(5, 10, 5);
        scene.add(amb);
        scene.add(dir);

        const meshGroup = ProceduralMeshGenerator.createCreatureMesh(species);
        scene.add(meshGroup);

        let reqId;
        const animate = () => {
          reqId = requestAnimationFrame(animate);
          meshGroup.rotation.y += 0.01;
          renderer.render(scene, camera);
        };
        animate();
      }
    }, 50);
  }

  renderLogistics(container) {
    const ext = gameState.extractors;
    const res = gameState.extractedResources;
    const routes = this.haulingManager?.routes || [];

    let html = `
      <div class="logistics-screen">
        <h3>Automated Logistics & Pack-Fauna Supply Lines</h3>

        <div class="resource-counter">
          <div class="res-box">🌾 Spores: <strong>${Math.floor(res.spores)}</strong></div>
          <div class="res-box">💎 Crystals: <strong>${Math.floor(res.crystal)}</strong></div>
          <div class="res-box">🧬 Organics: <strong>${Math.floor(res.organics)}</strong></div>
          <div class="res-box">⚡ Ancient DNA: <strong>${Math.floor(res.ancientDNA)}</strong></div>
        </div>

        <div class="hauling-section">
          <h4>Active Pack-Fauna Supply Routes (${routes.length})</h4>
          <button class="btn-travel" id="btnDeployHauler" style="margin-bottom:12px;padding:10px;">
            🐪 Deploy Pack-Fauna Hauling Route (+2 Yield/trip)
          </button>
          <div class="hauling-list">
            ${routes.length === 0 ? '<p class="empty-msg">No active hauling routes. Click above to deploy dociled pack-fauna haulers.</p>' : ''}
            ${routes.map(r => `
              <div class="extractor-card">
                <div>
                  <strong>${r.speciesName} Supply Line</strong>
                  <div>Status: Transferring cargo (${Math.round(r.progress * 100)}%)</div>
                </div>
                <div>Yield: +${r.yieldRate}/trip</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="extractor-list">
          <h4>Planetary Harvesters</h4>
          ${Object.entries(ext).map(([wId, data]) => {
            const w = WORLDS[wId];
            return `
              <div class="extractor-card ${data.active ? 'active' : ''}">
                <div>
                  <strong>${w ? w.name : wId} Extractor</strong>
                  <div>Target Resource: ${data.resource}</div>
                </div>
                <div>
                  <span>Rate: ${data.rate}/s</span>
                  <button class="btn-toggle-ext" data-world="${wId}">
                    ${data.active ? '🟢 ACTIVE' : '🔴 OFFLINE'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    const deployBtn = document.getElementById('btnDeployHauler');
    if (deployBtn) {
      deployBtn.onclick = () => {
        if (this.haulingManager) {
          const start = new THREE.Vector3(15, 0, -20);
          const end = new THREE.Vector3(-10, 0, 10);
          this.haulingManager.createRoute(start, end, 'Shellgrazer');
          this.renderLogistics(container);
        }
      };
    }

    container.querySelectorAll('.btn-toggle-ext').forEach(btn => {
      btn.onclick = () => {
        const wId = btn.dataset.world;
        if (gameState.extractors[wId]) {
          gameState.extractors[wId].active = !gameState.extractors[wId].active;
          soundEngine.playChirp();
          this.renderLogistics(container);
        }
      };
    });
  }
}

export const shipUI = new ShipUI();
