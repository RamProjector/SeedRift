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

    // Hemispheric & Ambient Lighting
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#445544', 1.4);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 1.2);
    this.scene.add(this.ambientLight);

    // Directional Sunlight
    this.sunLight = new THREE.DirectionalLight('#ffffff', 2.8);
    this.sunLight.position.set(30, 80, 20);
    this.scene.add(this.sunLight);

    // Physical 3D Sun Mesh in Sky
    const sunGeo = new THREE.SphereGeometry(6, 24, 24);
    const sunMat = new THREE.MeshStandardMaterial({
      color: '#ffea9f',
      emissive: '#ffea9f',
      emissiveIntensity: 2.5,
      roughness: 0.1
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

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

    this.scene.background = new THREE.Color(worldData.daySkyColor || '#528bb8');
    this.scene.fog = new THREE.FogExp2(worldData.fogColor || '#456a73', 0.002);

    this.ambientLight.color.set(worldData.ambientLight || '#ffffff');
    this.sunLight.color.set(worldData.sunLight || '#ffffff');
    this.sunMesh.material.color.set(worldData.sunLight || '#ffea9f');
    this.sunMesh.material.emissive.set(worldData.sunLight || '#ffea9f');

    if (this.hasWebGL) {
      const size = 140;
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
        color: new THREE.Color(worldData.groundColor || '#3d6332'),
        roughness: 0.5,
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
    const worldData = gameState.getCurrentWorld();
    const time = gameState.timeOfDay; // 0 to 24 hours

    // Calculate Sun Angle & Trajectory across the sky
    const sunAngle = ((time - 6) / 24) * Math.PI * 2; // Sunrise at 6am, Noon at 12pm
    const sunDistance = 180;

    const px = playerPos ? playerPos.x : 0;
    const py = playerPos ? playerPos.y : 0;
    const pz = playerPos ? playerPos.z : 0;

    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = Math.sin(sunAngle) * sunDistance;
    const sunZ = Math.sin(sunAngle * 0.5) * 60;

    this.sunLight.position.set(px + sunX, py + Math.max(10, sunY), pz + sunZ);
    this.sunMesh.position.set(px + sunX, py + sunY, pz + sunZ);

    // Daytime Ratio (0.0 at night, 1.0 at noon)
    const dayRatio = Math.max(0.0, Math.sin(sunAngle));

    // Dynamic Sunlight Intensity
    this.sunLight.intensity = Math.max(0.4, dayRatio * 2.8);
    this.hemiLight.intensity = Math.max(0.4, dayRatio * 1.4);
    this.ambientLight.intensity = Math.max(0.3, dayRatio * 1.2);

    // Dynamic Sky Color Transition (Lerp between daySkyColor and nightSkyColor)
    const dayColor = new THREE.Color(worldData.daySkyColor || '#528bb8');
    const nightColor = new THREE.Color(worldData.nightSkyColor || '#0f1724');
    const currentSkyColor = nightColor.clone().lerp(dayColor, dayRatio);

    this.scene.background = currentSkyColor;
    if (this.scene.fog) {
      this.scene.fog.color = currentSkyColor;
    }

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

    const ctx = this.ctx2D;
    if (!ctx) return;

    const w = this.canvas2D.width;
    const h = this.canvas2D.height;
    const world = gameState.getCurrentWorld();

    ctx.fillStyle = world.groundColor || '#172b1d';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 12;

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

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(playerYaw || 0);

    ctx.fillStyle = '#5fe6b4';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10150F';
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(0, -10);
    ctx.lineTo(4, -4);
    ctx.fill();

    ctx.restore();

    if (gameState.hasSplice('s4')) {
      ctx.strokeStyle = 'rgba(95, 230, 180, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#5fe6b4';
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.fillText(`📡 TACTICAL SURVEY MAP · ${world.name.toUpperCase()}`, 16, 26);
  }
}
