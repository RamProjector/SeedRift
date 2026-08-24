import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class WeaveUI {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
  }

  init() {
    // Create modal container
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'weaveModal';
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.innerHTML = `
      <div class="weave-screen">
        <div class="modal-header">
          <div class="header-row">
            <h2 class="title">The Weave</h2>
            <span class="capacity-value" id="capVal">0 / 6</span>
          </div>
          <div class="cells" id="cells"></div>
          <div class="capacity-warning" id="warning" role="status" aria-live="polite"></div>
        </div>

        <div class="splice-list" id="list"></div>

        <button class="btn-close-modal" id="closeWeaveBtn">✕ Return to Field</button>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    document.getElementById('closeWeaveBtn').onclick = () => this.close();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  showWarning(msg) {
    const w = document.getElementById('warning');
    if (w) {
      w.textContent = msg;
      w.classList.add('show');
      soundEngine.playWarning();
      setTimeout(() => w.classList.remove('show'), 3000);
    }
  }

  render() {
    const MAX = gameState.maxCapacity;
    const used = gameState.usedCapacity();

    document.getElementById('capVal').textContent = `${used} / ${MAX}`;

    const cellsEl = document.getElementById('cells');
    cellsEl.innerHTML = '';
    for (let i = 0; i < MAX; i++) {
      const c = document.createElement('div');
      c.className = 'cell' + (i < used ? ' filled' : '');
      cellsEl.appendChild(c);
    }

    const listEl = document.getElementById('list');
    listEl.innerHTML = '';

    const unlockedSplices = gameState.splices.filter(s => s.unlocked);

    if (unlockedSplices.length === 0) {
      listEl.innerHTML = `<div class="empty-msg">No splices unlocked yet. Scan and sample alien fauna & flora in the field to extract genetic splices.</div>`;
      return;
    }

    unlockedSplices.forEach(s => {
      const card = document.createElement('button');
      card.className = 'card' + (s.equipped ? ' equipped' : '');
      card.setAttribute('aria-pressed', s.equipped ? 'true' : 'false');
      card.onclick = () => {
        const res = gameState.toggleSplice(s.id);
        if (!res.success) {
          this.showWarning(res.msg);
        } else {
          soundEngine.playWeaveToggle(res.equipped);
          this.render();
        }
      };

      card.innerHTML = `
        <div class="card-top">
          <div>
            <span class="card-name">${s.name}</span><span class="card-cat"> · ${s.category}</span>
            <div class="card-source">${s.source}</div>
          </div>
          <div class="dot"></div>
        </div>
        <div class="card-effect">${s.effect}</div>
        <div class="card-bottom">
          <div class="tradeoff">${s.tradeoff ? s.tradeoff : ''}</div>
          <div class="cost">${s.cost} cap</div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }
}

export const weaveUI = new WeaveUI();
