import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { gameState } from '../systems/state.js';

export class WorldEngine {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 12);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight('#ffffff', 1.2);
    this.sunLight.position.set(30, 50, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Atmosphere fog & sky
    this.noise2D = createNoise2D();
    this.terrainMesh = null;
    this.waterMesh = null;
    this.particleSystem = null;

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  buildWorld(worldData) {
    // Clear previous world elements
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    if (this.waterMesh) this.scene.remove(this.waterMesh);
    if (this.particleSystem) this.scene.remove(this.particleSystem);

    // Set colors & fog
    this.scene.background = new THREE.Color(worldData.skyColor);
    this.scene.fog = new THREE.FogExp2(worldData.fogColor, worldData.fogDensity);

    this.ambientLight.color.set(worldData.ambientLight);
    this.sunLight.color.set(worldData.sunLight);

    // Generate terrain grid
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
        h = this.noise2D(x * 0.02, z * 0.02) * 4.0 + this.noise2D(x * 0.08, z * 0.08) * 1.0;
      } else if (worldData.id === 'ashfields-coreth') {
        h = Math.abs(this.noise2D(x * 0.03, z * 0.03)) * 6.0 - 1.5;
      } else if (worldData.id === 'hollow-steppe') {
        h = this.noise2D(x * 0.015, z * 0.015) * 2.5;
      } else if (worldData.id === 'pallid-reach') {
        h = this.noise2D(x * 0.04, z * 0.04) * 5.0;
      } else if (worldData.id === 'vantauri-deep') {
        h = this.noise2D(x * 0.02, z * 0.02) * 3.0 - 4.0; // ocean floor
      }
      pos.setY(i, h);
    }
    geometry.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(worldData.groundColor),
      roughness: 0.85,
      metalness: 0.1
    });

    this.terrainMesh = new THREE.Mesh(geometry, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Ocean plane for Vantauri Deep
    if (worldData.id === 'vantauri-deep') {
      const waterGeo = new THREE.PlaneGeometry(size, size);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#105577',
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.8
      });
      this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.waterMesh.position.y = 3.0; // Water surface
      this.scene.add(this.waterMesh);
    }

    // Build environmental particle system
    this.buildParticles(worldData);
  }

  buildParticles(worldData) {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      scales[i] = Math.random() * 0.3 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    let pColor = '#5fe6b4';
    if (worldData.id === 'ashfields-coreth') pColor = '#ff6b35';
    if (worldData.id === 'hollow-steppe') pColor = '#e6c675';
    if (worldData.id === 'pallid-reach') pColor = '#5fe6d0';
    if (worldData.id === 'vantauri-deep') pColor = '#4ce0d2';

    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(pColor),
      size: 0.3,
      transparent: true,
      opacity: 0.7
    });

    this.particleSystem = new THREE.Points(geometry, pMat);
    this.scene.add(this.particleSystem);
  }

  update(deltaSeconds, playerPos) {
    // Animate particles
    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        let x = pos.getX(i);

        // Drift up or down based on world
        y += deltaSeconds * 0.8;
        if (y > 22) y = 0.5;

        // Keep centered around player
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

    // Dynamic sun position matching in-game time
    const time = gameState.timeOfDay;
    const sunAngle = ((time - 6) / 24) * Math.PI * 2;
    this.sunLight.position.x = Math.cos(sunAngle) * 50;
    this.sunLight.position.y = Math.sin(sunAngle) * 50;
    this.sunLight.intensity = Math.max(0.1, Math.sin(sunAngle) * 1.4);
  }

  getTerrainHeight(x, z) {
    if (!this.terrainMesh) return 0;
    const world = gameState.getCurrentWorld();
    let h = 0;
    if (world.id === 'kharon-bloomfields') {
      h = this.noise2D(x * 0.02, z * 0.02) * 4.0 + this.noise2D(x * 0.08, z * 0.08) * 1.0;
    } else if (world.id === 'ashfields-coreth') {
      h = Math.abs(this.noise2D(x * 0.03, z * 0.03)) * 6.0 - 1.5;
    } else if (world.id === 'hollow-steppe') {
      h = this.noise2D(x * 0.015, z * 0.015) * 2.5;
    } else if (world.id === 'pallid-reach') {
      h = this.noise2D(x * 0.04, z * 0.04) * 5.0;
    } else if (world.id === 'vantauri-deep') {
      h = this.noise2D(x * 0.02, z * 0.02) * 3.0 - 4.0;
    }
    return h;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
