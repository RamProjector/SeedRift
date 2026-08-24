import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { gameState } from '../systems/state.js';

export class WorldEngine {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // Camera
    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 6, 12);

    // Renderer with robust fallback
    this.renderer = null;
    this.hasWebGL = true;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      console.warn("First WebGL attempt failed, trying fallback options:", e);
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          precision: "mediump"
        });
      } catch (e2) {
        console.error("WebGL unavailable:", e2);
        this.hasWebGL = false;
        const errCard = document.getElementById('webglErrorFallback');
        if (errCard) errCard.classList.remove('hidden');
      }
    }

    if (this.renderer) {
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      try {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
      } catch (e) {
        console.warn("Shadow maps not supported on this WebGL context");
      }

      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      container.appendChild(this.renderer.domElement);
    }

    // Hemispheric & Directional Lighting for bright visibility
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#334433', 1.0);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight('#ffffff', 1.4);
    this.sunLight.position.set(30, 50, 20);

    if (this.renderer && this.renderer.shadowMap.enabled) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
    }
    this.scene.add(this.sunLight);

    // Atmosphere fog & sky
    this.noise2D = createNoise2D();
    this.terrainMesh = null;
    this.waterMesh = null;
    this.particleSystem = null;

    // ResizeObserver for dynamic iframe sizing
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
    // Reduced fog density so terrain and character are bright and visible!
    const fogDensity = Math.min(0.005, worldData.fogDensity || 0.005);
    this.scene.fog = new THREE.FogExp2(worldData.fogColor || '#1a2b20', fogDensity);

    this.ambientLight.color.set(worldData.ambientLight || '#ffffff');
    this.sunLight.color.set(worldData.sunLight || '#ffffff');

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
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    if (worldData.id === 'vantauri-deep') {
      const waterGeo = new THREE.PlaneGeometry(size, size);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#105577',
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.8
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.position.y = 3.0;
      this.scene.add(this.waterMesh);
    }

    this.buildParticles(worldData);
  }

  buildParticles(worldData) {
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
  }

  render() {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
