import * as THREE from 'three';
import { SPECIES_BY_WORLD } from '../data/speciesData.js';
import { ProceduralMeshGenerator } from './procedural.js';
import { gameState } from '../systems/state.js';

export class EntityManager {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;
    this.entities = [];
    this.flora = [];
    this.ruinMonolith = null;
    this.scanTarget = null;
  }

  populateWorld(worldData) {
    // Clear previous entities
    this.entities.forEach(e => this.scene.remove(e.group));
    this.flora.forEach(f => this.scene.remove(f.group));
    if (this.ruinMonolith) this.scene.remove(this.ruinMonolith.group);

    this.entities = [];
    this.flora = [];
    this.ruinMonolith = null;

    const speciesList = SPECIES_BY_WORLD[worldData.id] || [];

    // 1. Spawn subset of 12-18 creatures
    const countToSpawn = Math.min(18, speciesList.length);
    for (let i = 0; i < countToSpawn; i++) {
      const speciesData = speciesList[i % speciesList.length];
      const meshGroup = ProceduralMeshGenerator.createCreatureMesh(speciesData);

      // Random placement around scene
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const y = this.worldEngine.getTerrainHeight(x, z);

      meshGroup.position.set(x, y, z);
      this.scene.add(meshGroup);

      this.entities.push({
        id: speciesData.id,
        data: speciesData,
        group: meshGroup,
        targetPos: new THREE.Vector3(x, y, z),
        speed: Math.random() * 1.2 + 0.8,
        wanderTimer: Math.random() * 5
      });
    }

    // 2. Spawn Flora
    const floraTypes = worldData.floraTypes || ['goldenGrass'];
    for (let i = 0; i < 25; i++) {
      const type = floraTypes[i % floraTypes.length];
      const floraMesh = ProceduralMeshGenerator.createFloraMesh(type, Math.random() * 0.5 + 0.8);
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      const y = this.worldEngine.getTerrainHeight(x, z);

      floraMesh.position.set(x, y, z);
      this.scene.add(floraMesh);
      this.flora.push({ group: floraMesh, type });
    }

    // 3. Spawn Firstseed Monolith Ruin
    const ruinGroup = ProceduralMeshGenerator.createFirstseedMonolith(worldData.ruinType);
    const rx = 15;
    const rz = -20;
    const ry = this.worldEngine.getTerrainHeight(rx, rz);
    ruinGroup.position.set(rx, ry, rz);
    this.scene.add(ruinGroup);

    this.ruinMonolith = {
      group: ruinGroup,
      type: worldData.ruinType,
      unlocked: gameState.ruinsDiscovered[worldData.id],
      pos: new THREE.Vector3(rx, ry, rz)
    };
  }

  update(deltaSeconds, playerPos) {
    // 1. Creature AI & Animations
    this.entities.forEach(e => {
      e.wanderTimer -= deltaSeconds;
      if (e.wanderTimer <= 0) {
        // Pick new wander target near current pos
        const rx = e.group.position.x + (Math.random() - 0.5) * 20;
        const rz = e.group.position.z + (Math.random() - 0.5) * 20;
        const ry = this.worldEngine.getTerrainHeight(rx, rz);

        // Flier / Glider altitude boost
        const name = e.data.commonName.toLowerCase();
        let altBoost = 0;
        if (name.includes('drift') || name.includes('moth') || name.includes('fin') || name.includes('flyer')) {
          altBoost = Math.random() * 6 + 3;
        }
        e.targetPos.set(rx, ry + altBoost, rz);
        e.wanderTimer = Math.random() * 6 + 4;
      }

      // Smooth move towards target
      const dir = new THREE.Vector3().subVectors(e.targetPos, e.group.position);
      const dist = dir.length();
      if (dist > 0.2) {
        dir.normalize();
        e.group.position.addScaledVector(dir, e.speed * deltaSeconds);
        e.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // Wing flapping for gliders
      const wingL = e.group.getObjectByName('wingLeft');
      const wingR = e.group.getObjectByName('wingRight');
      if (wingL && wingR) {
        const flap = Math.sin(Date.now() * 0.008) * 0.4;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      }
    });

    // 2. Ruin Monolith rotation
    if (this.ruinMonolith) {
      const ring1 = this.ruinMonolith.group.getObjectByName('glyphRing1');
      const ring2 = this.ruinMonolith.group.getObjectByName('glyphRing2');
      const core = this.ruinMonolith.group.getObjectByName('ruinCore');
      if (ring1) ring1.rotation.z += deltaSeconds * 0.5;
      if (ring2) ring2.rotation.z -= deltaSeconds * 0.8;
      if (core) core.rotation.y += deltaSeconds * 1.0;
    }
  }

  // Find nearest creature or ruin in front of camera/player for scanner reticle
  getNearestScannable(playerPos, cameraDir) {
    let closest = null;
    let minDistance = 15; // scan range limit

    // Check creatures
    for (const e of this.entities) {
      const dist = playerPos.distanceTo(e.group.position);
      if (dist < minDistance) {
        closest = { type: 'creature', entity: e, distance: dist };
        minDistance = dist;
      }
    }

    // Check Ruin Monolith
    if (this.ruinMonolith) {
      const dist = playerPos.distanceTo(this.ruinMonolith.pos);
      if (dist < minDistance && dist < 12) {
        closest = { type: 'ruin', monolith: this.ruinMonolith, distance: dist };
      }
    }

    return closest;
  }
}
