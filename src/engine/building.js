import * as THREE from 'three';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class BuildingManager {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;
    this.placedStructures = [];
    this.previewMesh = null;
    this.isPlacing = false;
    this.selectedType = null;
  }

  startPlacement(type) {
    this.selectedType = type;
    this.isPlacing = true;

    if (this.previewMesh) this.scene.remove(this.previewMesh);

    this.previewMesh = this.createStructureMesh(type, true);
    this.scene.add(this.previewMesh);
    soundEngine.playChirp();
  }

  cancelPlacement() {
    if (this.previewMesh) this.scene.remove(this.previewMesh);
    this.previewMesh = null;
    this.isPlacing = false;
    this.selectedType = null;
  }

  confirmPlacement(playerPos, playerYaw) {
    if (!this.isPlacing || !this.previewMesh) return false;

    // Cost check
    const cost = this.getStructureCost(this.selectedType);
    if (gameState.extractedResources.organics < cost.organics || gameState.extractedResources.crystal < cost.crystal) {
      soundEngine.playWarning();
      return { success: false, msg: `Insufficient resources! Needs ${cost.organics} Organics & ${cost.crystal} Crystals.` };
    }

    // Deduct resources
    gameState.extractedResources.organics -= cost.organics;
    gameState.extractedResources.crystal -= cost.crystal;

    const x = this.previewMesh.position.x;
    const z = this.previewMesh.position.z;
    const y = this.worldEngine.getTerrainHeight(x, z);

    // Create real structure
    const realMesh = this.createStructureMesh(this.selectedType, false);
    realMesh.position.set(x, y, z);
    realMesh.rotation.y = playerYaw;
    this.scene.add(realMesh);

    const structureObj = {
      id: `struct_${Date.now()}`,
      type: this.selectedType,
      worldId: gameState.currentWorldId,
      pos: new THREE.Vector3(x, y, z),
      mesh: realMesh,
      yieldTimer: 0
    };

    this.placedStructures.push(structureObj);

    // Clear preview
    this.scene.remove(this.previewMesh);
    this.previewMesh = null;
    this.isPlacing = false;
    this.selectedType = null;

    soundEngine.playSampleAcquired();
    return { success: true, msg: `Placed ${this.selectedType} successfully!` };
  }

  updatePreview(playerPos, playerYaw) {
    if (!this.isPlacing || !this.previewMesh) return;

    // Offset in front of player
    const dist = 6.0;
    const px = playerPos.x - Math.sin(playerYaw) * dist;
    const pz = playerPos.z - Math.cos(playerYaw) * dist;
    const py = this.worldEngine.getTerrainHeight(px, pz);

    this.previewMesh.position.set(px, py, pz);
    this.previewMesh.rotation.y = playerYaw;
  }

  updateStructures(deltaSeconds, playerPos) {
    this.placedStructures.forEach(st => {
      // Biodome shell heals player when nearby
      if (st.type === 'biodome' && st.worldId === gameState.currentWorldId) {
        const dist = playerPos.distanceTo(st.pos);
        if (dist < 10.0) {
          gameState.vitals.health = Math.min(100, gameState.vitals.health + deltaSeconds * 8.0);
          gameState.vitals.atmosphere = Math.min(100, gameState.vitals.atmosphere + deltaSeconds * 15.0);
        }
      }

      // Farm plot grows harvested species over time
      if (st.type === 'farm' && st.worldId === gameState.currentWorldId) {
        st.yieldTimer += deltaSeconds;
        if (st.yieldTimer >= 10.0) {
          st.yieldTimer = 0;
          gameState.extractedResources.organics += 2.0;
        }
      }

      // Extractor collects crystals / spores
      if (st.type === 'extractor' && st.worldId === gameState.currentWorldId) {
        st.yieldTimer += deltaSeconds;
        if (st.yieldTimer >= 8.0) {
          st.yieldTimer = 0;
          gameState.extractedResources.crystal += 1.5;
        }
      }
    });
  }

  getStructureCost(type) {
    if (type === 'biodome') return { organics: 15, crystal: 10 };
    if (type === 'farm') return { organics: 8, crystal: 4 };
    if (type === 'extractor') return { organics: 10, crystal: 12 };
    if (type === 'relay') return { organics: 5, crystal: 15 };
    return { organics: 5, crystal: 5 };
  }

  createStructureMesh(type, isPreview = false) {
    const group = new THREE.Group();
    const matColor = isPreview ? '#5fe6b4' : '#2a3b30';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matColor),
      transparent: isPreview,
      opacity: isPreview ? 0.6 : 1.0,
      wireframe: isPreview,
      roughness: 0.4,
      metalness: 0.8
    });

    if (type === 'biodome') {
      // Inflatable Glass Geodesic Biodome
      const domeGeo = new THREE.SphereGeometry(4.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const dome = new THREE.Mesh(domeGeo, mat);
      dome.position.y = 0;
      group.add(dome);

      const ringGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.5, 16);
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.y = 0.25;
      group.add(ring);

    } else if (type === 'farm') {
      // Hydroponic Cultivation Plot
      const baseGeo = new THREE.BoxGeometry(5.0, 0.4, 5.0);
      const base = new THREE.Mesh(baseGeo, mat);
      base.position.y = 0.2;
      group.add(base);

      // Light arches
      const archGeo = new THREE.TorusGeometry(2.5, 0.1, 8, 16, Math.PI);
      const arch = new THREE.Mesh(archGeo, mat);
      arch.position.y = 0.4;
      group.add(arch);

    } else if (type === 'extractor') {
      // Deep Crust Extractor Rig
      const baseGeo = new THREE.CylinderGeometry(1.5, 2.0, 1.0, 8);
      const base = new THREE.Mesh(baseGeo, mat);
      base.position.y = 0.5;
      group.add(base);

      const drillGeo = new THREE.ConeGeometry(0.8, 4.0, 8);
      const drill = new THREE.Mesh(drillGeo, mat);
      drill.position.y = 2.5;
      group.add(drill);

    } else if (type === 'relay') {
      // Scanner Relay Antenna Tower
      const poleGeo = new THREE.CylinderGeometry(0.15, 0.3, 10.0, 8);
      const pole = new THREE.Mesh(poleGeo, mat);
      pole.position.y = 5.0;
      group.add(pole);

      const dishGeo = new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.3);
      const dish = new THREE.Mesh(dishGeo, mat);
      dish.position.y = 9.5;
      dish.rotation.x = -Math.PI / 4;
      group.add(dish);
    }

    return group;
  }
}
