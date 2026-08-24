import * as THREE from 'three';
import { SPECIES_BY_WORLD } from '../data/speciesData.js';
import { GrazerEntity } from '../entities/Grazer.js';
import { GliderEntity } from '../entities/Glider.js';
import { PredatorEntity } from '../entities/Predator.js';
import { FloraEntity } from '../entities/Flora.js';
import { RuinEntity } from '../entities/Ruin.js';
import { RivalDroneEntity } from '../entities/RivalDrone.js';

export class EntityManager {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;
    this.entities = [];
    this.flora = [];
    this.drones = [];
    this.ruinMonolith = null;
    this.worldLimit = 300.0;
  }

  populateWorld(worldData) {
    this.entities.forEach(e => this.scene.remove(e.group));
    this.flora.forEach(f => this.scene.remove(f.group));
    this.drones.forEach(d => this.scene.remove(d.group));
    if (this.ruinMonolith) this.scene.remove(this.ruinMonolith.group);

    this.entities = [];
    this.flora = [];
    this.drones = [];
    this.ruinMonolith = null;

    const speciesList = SPECIES_BY_WORLD[worldData.id] || [];

    // 1. Immediate Starting Cluster (12 creatures spawned right in front of Warden spawn point!)
    const countToSpawn = Math.min(36, speciesList.length);
    for (let i = 0; i < countToSpawn; i++) {
      const speciesData = speciesList[i % speciesList.length];

      // First 12 creatures spawn within 35 meters of player spawn point!
      let x = (Math.random() - 0.5) * 60;
      let z = (Math.random() - 0.5) * 60;
      if (i >= 12) {
        x = (Math.random() - 0.5) * 350;
        z = (Math.random() - 0.5) * 350;
      }

      const y = this.worldEngine.getTerrainHeight(x, z);
      const pos = new THREE.Vector3(x, y, z);

      const name = speciesData.commonName.toLowerCase();
      let entity = null;

      if (name.includes('drift') || name.includes('moth') || name.includes('fin') || name.includes('flyer')) {
        entity = new GliderEntity(speciesData.id, speciesData, pos);
      } else if (name.includes('stalker') || name.includes('hunter') || name.includes('scout') || name.includes('runner')) {
        entity = new PredatorEntity(speciesData.id, speciesData, pos);
      } else {
        entity = new GrazerEntity(speciesData.id, speciesData, pos);
      }

      this.scene.add(entity.group);
      this.entities.push(entity);
    }

    // 2. Spawn 60 Flora Elements (Trees, Spore Stalks, Crystal Nodes)
    const floraTypes = worldData.floraTypes || ['goldenGrass'];
    for (let i = 0; i < 60; i++) {
      const type = floraTypes[i % floraTypes.length];

      let x = (Math.random() - 0.5) * 70;
      let z = (Math.random() - 0.5) * 70;
      if (i >= 15) {
        x = (Math.random() - 0.5) * 400;
        z = (Math.random() - 0.5) * 400;
      }

      const y = this.worldEngine.getTerrainHeight(x, z);
      const pos = new THREE.Vector3(x, y, z);

      const floraEntity = new FloraEntity(`flora_${i}`, type, pos, Math.random() * 0.5 + 0.8);
      this.scene.add(floraEntity.group);
      this.flora.push(floraEntity);
    }

    // 3. Firstseed Monolith Ruin Plaza
    const rx = 25;
    const rz = -30;
    const ry = this.worldEngine.getTerrainHeight(rx, rz);
    this.ruinMonolith = new RuinEntity(`ruin_${worldData.id}`, worldData.ruinType, new THREE.Vector3(rx, ry, rz));
    this.scene.add(this.ruinMonolith.group);

    // 4. Meridian Combine Drones
    for (let d = 0; d < 3; d++) {
      const dx = (Math.random() - 0.5) * 60 + 10;
      const dz = (Math.random() - 0.5) * 60 - 10;
      const dy = this.worldEngine.getTerrainHeight(dx, dz) + 3.0;
      const drone = new RivalDroneEntity(`drone_${d}`, new THREE.Vector3(dx, dy, dz));
      this.scene.add(drone.group);
      this.drones.push(drone);
    }
  }

  getColliders() {
    const colliders = [];
    this.entities.forEach(e => colliders.push(e));
    this.flora.forEach(f => colliders.push(f));
    this.drones.forEach(d => colliders.push(d));
    if (this.ruinMonolith) colliders.push(this.ruinMonolith);
    return colliders;
  }

  update(deltaSeconds) {
    this.entities.forEach(e => {
      e.update(deltaSeconds, this.worldEngine);

      // Columbus Toroidal World Loop Wrapping for Entities
      if (e.group.position.x > this.worldLimit) e.group.position.x = -this.worldLimit;
      if (e.group.position.x < -this.worldLimit) e.group.position.x = this.worldLimit;
      if (e.group.position.z > this.worldLimit) e.group.position.z = -this.worldLimit;
      if (e.group.position.z < -this.worldLimit) e.group.position.z = this.worldLimit;
    });

    this.flora.forEach(f => f.update(deltaSeconds, this.worldEngine));
    this.drones.forEach(d => d.update(deltaSeconds, this.worldEngine));
    if (this.ruinMonolith) this.ruinMonolith.update(deltaSeconds, this.worldEngine);
  }

  getNearestScannable(playerPos) {
    let closest = null;
    let minDistance = 18;

    for (const e of this.entities) {
      const dist = playerPos.distanceTo(e.group.position);
      if (dist < minDistance) {
        closest = { type: 'creature', entity: e, distance: dist };
        minDistance = dist;
      }
    }

    for (const f of this.flora) {
      if (!f.harvested) {
        const dist = playerPos.distanceTo(f.group.position);
        if (dist < minDistance && dist < 12) {
          closest = { type: 'flora', flora: f, distance: dist };
          minDistance = dist;
        }
      }
    }

    if (this.ruinMonolith) {
      const dist = playerPos.distanceTo(this.ruinMonolith.group.position);
      if (dist < minDistance && dist < 18) {
        closest = { type: 'ruin', monolith: this.ruinMonolith, distance: dist };
        minDistance = dist;
      }
    }

    for (const d of this.drones) {
      const dist = playerPos.distanceTo(d.group.position);
      if (dist < minDistance && dist < 12) {
        closest = { type: 'rival', drone: d, distance: dist };
        minDistance = dist;
      }
    }

    return closest;
  }
}
