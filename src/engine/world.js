import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { gameState } from '../systems/state.js';

export class WorldEngine {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 6, 12);

    this.renderer = null;
    this.hasWebGL = false;
    this.canvas2D = null;
    this.ctx2D = null;

    // Try WebGL context creation with maximum compatibility
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');

    if (gl) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: testCanvas,
          antialias: false,
          alpha: false,
          powerPreference: "default"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(this.renderer.domElement);
        this.hasWebGL = true;
      } catch (e) {
        console.warn("WebGLRenderer failed despite context test, using 2D Canvas fallback:", e);
      }
    }

    if (!this.hasWebGL) {
      console.log("Initializing SEEDRIFT Tactical 2D Survey Canvas Engine");
      this.canvas2D = document.createElement('canvas');
      this.canvas2D.width = width;
      this.canvas2D.height = height;
      this.canvas2D.style.cssText = 'width:100%;height:100%;display:block;';
      this.ctx2D = this.canvas2D.getContext('2d');
      container.appendChild(this.canvas2D);
    }

    // Hide fallback error card if present
    const errCard = document.getElementById('webglErrorFallback');
    if (errCard) errCard.classList.add('hidden');

    // Lights
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#334433', 1.0);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight('#ffffff', 1.4);
    this.sunLight.position.set(30, 50, 20);
    this.scene.add(this.sunLight);

    this.noise2D = createNoise2D();
    this.terrainMesh = null;
    this.waterMesh = null;
    this.particleSystem = null;

    if (window.ResizeObserver && container) {
      const ro = new ResizeObserver(() => this.onWindowResize());
      ro.observe(container);
    }
    window.addEventListener('resize', () => this.onWindowResize());
  }

  buildWorld(worldData) {
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    if (this.waterMesh) this.scene.remove(this.waterMesh);
    if (this.particleSystem) this.scene.remove(this.particleSystem);

    this.scene.background = new THREE.Color(worldData.skyColor || '#1a2b20');
    this.scene.fog = new THREE.FogExp2(worldData.fogColor || '#1a2b20', 0.003);

    this.ambientLight.color.set(worldData.ambientLight || '#ffffff');
    this.sunLight.color.set(worldData.sunLight || '#ffffff');

    if (this.hasWebGL) {
      const size = 120;
      const segments = 64;
      const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
      geometry.rotateX(-Math.PI / 2);

      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);

        let h = 0;
        if (worldData.id === 'kharon-bloomfields') {
          h = this.noise2D(x * 0.02, z * 0.02) * 3.5 + this.noise2D(x * 0.08, z * 0.08) * 0.8;
        } else if (worldData.id === 'ashfields-coreth') {
          h = Math.abs(this.noise2D(x * 0.03, z * 0.03)) * 5.0 - 1.0;
        } else if (worldData.id === 'hollow-steppe') {
          h = this.noise2D(x * 0.015, z * 0.015) * 2.0;
        } else if (worldData.id === 'pallid-reach') {
          h = this.noise2D(x * 0.04, z * 0.04) * 4.0;
        } else if (worldData.id === 'vantauri-deep') {
          h = this.noise2D(x * 0.02, z * 0.02) * 2.5 - 3.0;
        }
        pos.setY(i, h);
      }
      geometry.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(worldData.groundColor || '#2a3b20'),
        roughness: 0.7,
        metalness: 0.1
      });

      this.terrainMesh = new THREE.Mesh(geometry, terrainMat);
      this.scene.add(this.terrainMesh);
    }

    this.buildParticles(worldData);
  }

  buildParticles(worldData) {
    if (!this.hasWebGL) return;
    const count = 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    let pColor = '#5fe6b4';
    if (worldData.id === 'ashfields-coreth') pColor = '#ff6b35';
    if (worldData.id === 'hollow-steppe') pColor = '#e6c675';
    if (worldData.id === 'pallid-reach') pColor = '#5fe6d0';
    if (worldData.id === 'vantauri-deep') pColor = '#4ce0d2';

    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(pColor),
      size: 0.35,
      transparent: true,
      opacity: 0.75
    });

    this.particleSystem = new THREE.Points(geometry, pMat);
    this.scene.add(this.particleSystem);
  }

  update(deltaSeconds, playerPos) {
    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        let x = pos.getX(i);

        y += deltaSeconds * 0.8;
        if (y > 22) y = 0.5;

        if (playerPos) {
          if (Math.abs(x - playerPos.x) > 40) {
            x = playerPos.x + (Math.random() - 0.5) * 60;
          }
        }
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }

    const time = gameState.timeOfDay;
    const sunAngle = ((time - 6) / 24) * Math.PI * 2;
    this.sunLight.position.x = Math.cos(sunAngle) * 50;
    this.sunLight.position.y = Math.sin(sunAngle) * 50;
    this.sunLight.intensity = Math.max(0.4, Math.sin(sunAngle) * 1.4);
  }

  getTerrainHeight(x, z) {
    const world = gameState.getCurrentWorld();
    let h = 0;
    if (world.id === 'kharon-bloomfields') {
      h = this.noise2D(x * 0.02, z * 0.02) * 3.5 + this.noise2D(x * 0.08, z * 0.08) * 0.8;
    } else if (world.id === 'ashfields-coreth') {
      h = Math.abs(this.noise2D(x * 0.03, z * 0.03)) * 5.0 - 1.0;
    } else if (world.id === 'hollow-steppe') {
      h = this.noise2D(x * 0.015, z * 0.015) * 2.0;
    } else if (world.id === 'pallid-reach') {
      h = this.noise2D(x * 0.04, z * 0.04) * 4.0;
    } else if (world.id === 'vantauri-deep') {
      h = this.noise2D(x * 0.02, z * 0.02) * 2.5 - 3.0;
    }
    return h;
  }

  onWindowResize() {
    const w = this.container.clientWidth || window.innerWidth || 800;
    const h = this.container.clientHeight || window.innerHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(w, h);
    }
    if (this.canvas2D) {
      this.canvas2D.width = w;
      this.canvas2D.height = h;
    }
  }

  render(playerPos, playerYaw, entities, ruinMonolith, rivals, structures) {
    if (this.hasWebGL && this.renderer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 2D Tactical World Renderer Fallback
    const ctx = this.ctx2D;
    if (!ctx) return;

    const w = this.canvas2D.width;
    const h = this.canvas2D.height;
    const world = gameState.getCurrentWorld();

    // Fill background sky/ground color
    ctx.fillStyle = world.groundColor || '#172b1d';
    ctx.fillRect(0, 0, w, h);

    // Grid scale
    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 12; // 1 unit = 12 pixels

    // Draw Terrain Contour Grid
    ctx.strokeStyle = world.ambientLight || '#2a3d2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -60; x <= 60; x += 10) {
      const px = centerX + (x - (playerPos?.x || 0)) * scale;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    for (let z = -60; z <= 60; z += 10) {
      const py = centerY + (z - (playerPos?.z || 0)) * scale;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();

    // Draw Firstseed Monolith Ruin
    if (ruinMonolith) {
      const rx = centerX + (ruinMonolith.pos.x - (playerPos?.x || 0)) * scale;
      const ry = centerY + (ruinMonolith.pos.z - (playerPos?.z || 0)) * scale;

      ctx.fillStyle = '#ffc857';
      ctx.beginPath();
      ctx.arc(rx, ry, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#5fe6b4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, 22 + Math.sin(Date.now() * 0.005) * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ece9e0';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillText(`🏛️ ${ruinMonolith.type}`, rx - 40, ry - 28);
    }

    // Draw Meridian Combine Drones
    if (rivals && rivals.drones) {
      rivals.drones.forEach(d => {
        const dx = centerX + (d.group.position.x - (playerPos?.x || 0)) * scale;
        const dy = centerY + (d.group.position.z - (playerPos?.x || 0)) * scale;

        ctx.fillStyle = '#e6a855';
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(dx, dy, 16, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    // Draw Wild Fauna Entities
    if (entities && entities.entities) {
      entities.entities.forEach(e => {
        const ex = centerX + (e.group.position.x - (playerPos?.x || 0)) * scale;
        const ey = centerY + (e.group.position.z - (playerPos?.z || 0)) * scale;

        const color = e.data.physical?.coloration?.secondary || '#5fe6b4';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ece9e0';
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillText(e.data.commonName, ex - 20, ey - 10);
      });
    }

    // Draw Placed Habitat Structures
    if (structures && structures.placedStructures) {
      structures.placedStructures.forEach(st => {
        const sx = centerX + (st.pos.x - (playerPos?.x || 0)) * scale;
        const sy = centerY + (st.pos.z - (playerPos?.z || 0)) * scale;

        ctx.fillStyle = '#5fe6b4';
        ctx.fillRect(sx - 10, sy - 10, 20, 20);

        ctx.fillStyle = '#10150F';
        ctx.font = '10px monospace';
        ctx.fillText(st.type.toUpperCase(), sx - 12, sy + 3);
      });
    }

    // Draw Warden Player Character
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(playerYaw || 0);

    // Warden Suit Circle
    ctx.fillStyle = '#5fe6b4';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Directional Visor Arrow
    ctx.fillStyle = '#10150F';
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(0, -10);
    ctx.lineTo(4, -4);
    ctx.fill();

    ctx.restore();

    // Warden Glow Aura if Glow skin equipped
    if (gameState.hasSplice('s4')) {
      ctx.strokeStyle = 'rgba(95, 230, 180, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Canvas Title Overlay
    ctx.fillStyle = '#5fe6b4';
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.fillText(`📡 TACTICAL SURVEY MAP · ${world.name.toUpperCase()}`, 16, 26);
  }
}
