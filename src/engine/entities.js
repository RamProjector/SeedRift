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
  }

  populateWorld(worldData) {
    this.entities.forEach(e => this.scene.remove(e.group));
    this.flora.forEach(f => this.scene.remove(f.group));
    if (this.ruinMonolith) this.scene.remove(this.ruinMonolith.group);

    this.entities = [];
    this.flora = [];
    this.ruinMonolith = null;

    const speciesList = SPECIES_BY_WORLD[worldData.id] || [];

    const countToSpawn = Math.min(18, speciesList.length);
    for (let i = 0; i < countToSpawn; i++) {
      const speciesData = speciesList[i % speciesList.length];
      const meshGroup = ProceduralMeshGenerator.createCreatureMesh(speciesData);

      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const y = this.worldEngine.getTerrainHeight(x, z);

      meshGroup.position.set(x, y, z);
      this.scene.add(meshGroup);

      const trophic = speciesData.ecology?.trophicLevel || 'producer';

      this.entities.push({
        id: speciesData.id,
        data: speciesData,
        trophic,
        group: meshGroup,
        targetPos: new THREE.Vector3(x, y, z),
        speed: trophic === 'predator' || trophic === 'secondary' ? 2.2 : 1.2,
        wanderTimer: Math.random() * 5
      });
    }

    const floraTypes = worldData.floraTypes || ['goldenGrass'];
    for (let i = 0; i < 25; i++) {
      const type = floraTypes[i % floraTypes.length];
      const floraMesh = ProceduralMeshGenerator.createFloraMesh(type, Math.random() * 0.5 + 0.8);
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      const y = this.worldEngine.getTerrainHeight(x, z);

      floraMesh.position.set(x, y, z);
      this.scene.add(floraMesh);
      this.flora.push({ group: floraMesh, type, pos: new THREE.Vector3(x, y, z) });
    }

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
    // Dynamic Predator-Prey Pursuit AI
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];

      // Check predator pursuit
      if (e.trophic === 'predator' || e.trophic === 'secondary') {
        let nearestPrey = null;
        let minDist = 12.0;

        for (let j = 0; j < this.entities.length; j++) {
          const prey = this.entities[j];
          if (prey.trophic === 'producer' || prey.trophic === 'primary' || prey.trophic === 'herbivore') {
            const dist = e.group.position.distanceTo(prey.group.position);
            if (dist < minDist) {
              nearestPrey = prey;
              minDist = dist;
            }
          }
        }

        if (nearestPrey) {
          // Pursue prey
          e.targetPos.copy(nearestPrey.group.position);
          // Prey flees
          nearestPrey.targetPos.addScaledVector(
            new THREE.Vector3().subVectors(nearestPrey.group.position, e.group.position).normalize(),
            4.0
          );
        }
      }

      e.wanderTimer -= deltaSeconds;
      if (e.wanderTimer <= 0) {
        const rx = e.group.position.x + (Math.random() - 0.5) * 20;
        const rz = e.group.position.z + (Math.random() - 0.5) * 20;
        const ry = this.worldEngine.getTerrainHeight(rx, rz);

        const name = e.data.commonName.toLowerCase();
        let altBoost = 0;
        if (name.includes('drift') || name.includes('moth') || name.includes('fin') || name.includes('flyer')) {
          altBoost = Math.random() * 6 + 3;
        }
        e.targetPos.set(rx, ry + altBoost, rz);
        e.wanderTimer = Math.random() * 6 + 4;
      }

      const dir = new THREE.Vector3().subVectors(e.targetPos, e.group.position);
      const dist = dir.length();
      if (dist > 0.2) {
        dir.normalize();
        e.group.position.addScaledVector(dir, e.speed * deltaSeconds);
        e.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      const wingL = e.group.getObjectByName('wingLeft');
      const wingR = e.group.getObjectByName('wingRight');
      if (wingL && wingR) {
        const flap = Math.sin(Date.now() * 0.008) * 0.4;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      }
    }

    if (this.ruinMonolith) {
      const ring1 = this.ruinMonolith.group.getObjectByName('glyphRing1');
      const ring2 = this.ruinMonolith.group.getObjectByName('glyphRing2');
      const core = this.ruinMonolith.group.getObjectByName('ruinCore');
      if (ring1) ring1.rotation.z += deltaSeconds * 0.5;
      if (ring2) ring2.rotation.z -= deltaSeconds * 0.8;
      if (core) core.rotation.y += deltaSeconds * 1.0;
    }
  }

  getNearestScannable(playerPos, rivalManager) {
    let closest = null;
    let minDistance = 15;

    for (const e of this.entities) {
      const dist = playerPos.distanceTo(e.group.position);
      if (dist < minDistance) {
        closest = { type: 'creature', entity: e, distance: dist };
        minDistance = dist;
      }
    }

    if (this.ruinMonolith) {
      const dist = playerPos.distanceTo(this.ruinMonolith.pos);
      if (dist < minDistance && dist < 12) {
        closest = { type: 'ruin', monolith: this.ruinMonolith, distance: dist };
        minDistance = dist;
      }
    }

    if (rivalManager) {
      const riv = rivalManager.getNearestRival(playerPos);
      if (riv && riv.distance < minDistance) {
        closest = { type: 'rival', drone: riv.drone, distance: riv.distance };
      }
    }

    return closest;
  }
}
