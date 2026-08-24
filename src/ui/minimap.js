import { gameState } from '../systems/state.js';
import * as THREE from 'three';

export class MinimapRadar {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  init(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hudMinimapCanvas';
    this.canvas.width = 120;
    this.canvas.height = 120;
    this.canvas.style.cssText = 'width:120px;height:120px;border-radius:50%;border:1.5px solid var(--border-active);background:rgba(16,21,15,0.85);backdrop-filter:blur(4px);pointer-events:auto;cursor:pointer;';

    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  update(playerPos, playerYaw, entities, ruinMonolith, rivals) {
    const ctx = this.ctx;
    if (!ctx) return;

    const size = 120;
    const center = size / 2;
    const radarRange = 40.0;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.clip();

    const sweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(95, 230, 180, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(sweepAngle) * center, center + Math.sin(sweepAngle) * center);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(42, 51, 44, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, center * 0.4, 0, Math.PI * 2);
    ctx.arc(center, center, center * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    const px = playerPos?.x || 0;
    const pz = playerPos?.z || 0;

    // Draw Ruin Monolith
    if (ruinMonolith) {
      const rPos = ruinMonolith.group ? ruinMonolith.group.position : (ruinMonolith.pos || new THREE.Vector3());
      const dx = rPos.x - px;
      const dz = rPos.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < radarRange) {
        const mx = center + (dx / radarRange) * (center - 10);
        const my = center + (dz / radarRange) * (center - 10);

        ctx.fillStyle = '#ffc857';
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Meridian Combine Drones
    if (rivals && rivals.drones) {
      rivals.drones.forEach(d => {
        const dPos = d?.group ? d.group.position : (d?.pos || new THREE.Vector3());
        const dx = dPos.x - px;
        const dz = dPos.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radarRange) {
          const rx = center + (dx / radarRange) * (center - 10);
          const ry = center + (dz / radarRange) * (center - 10);

          ctx.fillStyle = '#e6a855';
          ctx.beginPath();
          ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Wild Fauna Entities
    if (entities && entities.entities) {
      entities.entities.forEach(e => {
        const ePos = e?.group ? e.group.position : (e?.pos || new THREE.Vector3());
        const dx = ePos.x - px;
        const dz = ePos.z - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radarRange) {
          const fx = center + (dx / radarRange) * (center - 10);
          const fy = center + (dz / radarRange) * (center - 10);

          ctx.fillStyle = e.data?.physical?.coloration?.secondary || '#5fe6b4';
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Player Center Dot & Heading Vector
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(playerYaw || 0);

    ctx.fillStyle = '#5fe6b4';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(0, -6);
    ctx.lineTo(2, -2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

export const minimapRadar = new MinimapRadar();
