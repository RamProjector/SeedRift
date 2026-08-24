import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { gameState } from '../systems/state.js';
import { createWaterShaderMaterial } from './shaders.js';

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

    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#445544', 1.6);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 1.4);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight('#ffffff', 3.0);
    this.sunLight.position.set(30, 120, 20);
    this.scene.add(this.sunLight);

    const sunGeo = new THREE.SphereGeometry(10, 24, 24);
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
    this.waterMat = null;

    if (window.ResizeObserver && container) {
      const ro = new ResizeObserver(() => this.onWindowResize());
      ro.observe(container);
    }
    window.addEventListener('resize', () => this.onWindowResize());
  }

  getMultiOctaveNoise(x, z, worldId) {
    let height = 0;

    if (worldId === 'kharon-bloomfields') {
      const continental = this.noise2D(x * 0.005, z * 0.005) * 18.0;
      const hills = this.noise2D(x * 0.02, z * 0.02) * 6.0;
      const detail = this.noise2D(x * 0.08, z * 0.08) * 1.5;
      height = continental + hills + detail;

    } else if (worldId === 'ashfields-coreth') {
      const craters = Math.abs(this.noise2D(x * 0.008, z * 0.008)) * 22.0 - 4.0;
      const ridges = Math.sin(this.noise2D(x * 0.03, z * 0.03) * Math.PI) * 8.0;
      const detail = this.noise2D(x * 0.1, z * 0.1) * 1.8;
      height = craters + ridges + detail;

    } else if (worldId === 'hollow-steppe') {
      const rollingHills = this.noise2D(x * 0.006, z * 0.006) * 12.0;
      const dunes = this.noise2D(x * 0.025, z * 0.025) * 3.5;
      height = rollingHills + dunes;

    } else if (worldId === 'pallid-reach') {
      const plateaus = Math.floor(this.noise2D(x * 0.007, z * 0.007) * 4.0) * 4.0;
      const crags = this.noise2D(x * 0.04, z * 0.04) * 7.0;
      height = plateaus + crags;

    } else if (worldId === 'vantauri-deep') {
      const trench = this.noise2D(x * 0.005, z * 0.005) * 15.0 - 8.0;
      const ridges = this.noise2D(x * 0.03, z * 0.03) * 4.0;
      height = trench + ridges;
    }

    return height;
  }

  getTerrainHeight(x, z) {
    const world = gameState.getCurrentWorld();
    const rawH = this.getMultiOctaveNoise(x, z, world.id);
    const radius = 800.0;
    const distSq = x * x + z * z;
    const curvatureDrop = distSq / (2.0 * radius);
    return rawH - curvatureDrop;
  }

  buildWorld(worldData) {
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    if (this.waterMesh) this.scene.remove(this.waterMesh);
    if (this.particleSystem) this.scene.remove(this.particleSystem);

    this.scene.background = new THREE.Color(worldData.daySkyColor || '#528bb8');
    this.scene.fog = new THREE.FogExp2(worldData.fogColor || '#456a73', 0.0018);

    this.ambientLight.color.set(worldData.ambientLight || '#ffffff');
    this.sunLight.color.set(worldData.sunLight || '#ffffff');
    this.sunMesh.material.color.set(worldData.sunLight || '#ffea9f');
    this.sunMesh.material.emissive.set(worldData.sunLight || '#ffea9f');

    if (this.hasWebGL) {
      const size = 500;
      const segments = 128;
      const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
      geometry.rotateX(-Math.PI / 2);

      const pos = geometry.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const h = this.getTerrainHeight(x, z);
        pos.setY(i, h);
      }
      geometry.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(worldData.groundColor || '#3d6332'),
        roughness: 0.6,
        metalness: 0.1
      });

      this.terrainMesh = new THREE.Mesh(geometry, terrainMat);
      this.terrainMesh.position.set(0, 0, 0);
      this.terrainMesh.receiveShadow = true;
      this.scene.add(this.terrainMesh);

      if (worldData.id === 'vantauri-deep' || worldData.id === 'thessyras-veil') {
        const waterGeo = new THREE.PlaneGeometry(size, size, 64, 64);
        waterGeo.rotateX(-Math.PI / 2);
        this.waterMat = createWaterShaderMaterial();
        this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
        this.waterMesh.position.set(0, 3.0, 0);
        this.scene.add(this.waterMesh);
      }
    }

    this.buildParticles(worldData);
  }

  buildParticles(worldData) {
    if (!this.hasWebGL) return;
    const count = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    let pColor = '#5fe6b4';
    if (worldData.id === 'ashfields-coreth') pColor = '#ff6b35';
    if (worldData.id === 'hollow-steppe') pColor = '#e6c675';
    if (worldData.id === 'pallid-reach' || worldData.id === 'thessyras-veil') pColor = '#5fe6d0';
    if (worldData.id === 'vantauri-deep') pColor = '#4ce0d2';

    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(pColor),
      size: 0.4,
      transparent: true,
      opacity: 0.75
    });

    this.particleSystem = new THREE.Points(geometry, pMat);
    this.scene.add(this.particleSystem);
  }

  update(deltaSeconds, playerPos) {
    const worldData = gameState.getCurrentWorld();
    const time = gameState.timeOfDay;

    if (this.waterMat) {
      this.waterMat.uniforms.time.value += deltaSeconds;
    }

    const sunAngle = ((time - 6) / 24) * Math.PI * 2;
    const sunDistance = 280;

    const px = playerPos ? playerPos.x : 0;
    const py = playerPos ? playerPos.y : 0;
    const pz = playerPos ? playerPos.z : 0;

    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = Math.sin(sunAngle) * sunDistance;
    const sunZ = Math.sin(sunAngle * 0.5) * 100;

    this.sunLight.position.set(px + sunX, py + Math.max(10, sunY), pz + sunZ);
    this.sunMesh.position.set(px + sunX, py + sunY, pz + sunZ);

    const dayRatio = Math.max(0.0, Math.sin(sunAngle));

    this.sunLight.intensity = Math.max(0.5, dayRatio * 3.0);
    this.hemiLight.intensity = Math.max(0.5, dayRatio * 1.4);
    this.ambientLight.intensity = Math.max(0.4, dayRatio * 1.4);

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
        if (y > 30) y = 0.5;

        if (playerPos) {
          if (Math.abs(x - playerPos.x) > 100) {
            x = playerPos.x + (Math.random() - 0.5) * 180;
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
    return this.getMultiOctaveNoise(x, z, world.id);
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
    const scale = 8;

    const px = playerPos?.x || 0;
    const pz = playerPos?.z || 0;

    ctx.strokeStyle = world.ambientLight || '#2a3d2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -150; x <= 150; x += 20) {
      const gx = centerX + (x - px) * scale;
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
    }
    for (let z = -150; z <= 150; z += 20) {
      const gy = centerY + (z - pz) * scale;
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
    }
    ctx.stroke();

    if (ruinMonolith) {
      const rPos = ruinMonolith.group ? ruinMonolith.group.position : (ruinMonolith.pos || new THREE.Vector3());
      const rx = centerX + (rPos.x - px) * scale;
      const ry = centerY + (rPos.z - pz) * scale;

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
      ctx.fillText(`🏛️ ${ruinMonolith.ruinType || ruinMonolith.type || 'Monolith'}`, rx - 40, ry - 28);
    }

    if (rivals && rivals.drones) {
      rivals.drones.forEach(d => {
        const dPos = d.group ? d.group.position : (d.pos || new THREE.Vector3());
        const dx = centerX + (dPos.x - px) * scale;
        const dy = centerY + (dPos.z - pz) * scale;

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
        const ePos = e.group ? e.group.position : (e.pos || new THREE.Vector3());
        const ex = centerX + (ePos.x - px) * scale;
        const ey = centerY + (ePos.z - pz) * scale;

        const color = e.data?.physical?.coloration?.secondary || '#5fe6b4';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ece9e0';
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillText(e.data?.commonName || e.name || 'Species', ex - 20, ey - 10);
      });
    }

    if (structures && structures.placedStructures) {
      structures.placedStructures.forEach(st => {
        const sx = centerX + (st.pos.x - px) * scale;
        const sy = centerY + (st.pos.z - pz) * scale;

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
