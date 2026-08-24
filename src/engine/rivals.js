import * as THREE from 'three';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class RivalManager {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;
    this.drones = [];
  }

  populateRivals(worldData) {
    this.drones.forEach(d => {
      this.scene.remove(d.group);
      if (d.laserTarget) this.scene.remove(d.laserTarget);
    });
    this.drones = [];

    for (let i = 0; i < 2; i++) {
      const droneGroup = new THREE.Group();

      const bodyGeo = new THREE.OctahedronGeometry(1.0);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: '#e6a855',
        metalness: 0.9,
        roughness: 0.2
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      droneGroup.add(body);

      const laserLight = new THREE.SpotLight('#ff3300', 2.0, 15, Math.PI / 6, 0.5);
      laserLight.position.set(0, 0, 0);
      droneGroup.add(laserLight);

      const targetObj = new THREE.Object3D();
      targetObj.position.set(0, -5, 0);
      this.scene.add(targetObj);
      laserLight.target = targetObj;

      const x = (Math.random() - 0.5) * 50 + 10;
      const z = (Math.random() - 0.5) * 50 - 10;
      const y = this.worldEngine.getTerrainHeight(x, z) + 3.0;

      droneGroup.position.set(x, y, z);
      targetObj.position.set(x, y - 5, z);
      this.scene.add(droneGroup);

      this.drones.push({
        id: `drone_${i}`,
        group: droneGroup,
        laserTarget: targetObj,
        targetPos: new THREE.Vector3(x, y, z),
        speed: 2.0,
        wanderTimer: Math.random() * 4
      });
    }
  }

  update(deltaSeconds) {
    this.drones.forEach(d => {
      d.wanderTimer -= deltaSeconds;
      if (d.wanderTimer <= 0) {
        const rx = d.group.position.x + (Math.random() - 0.5) * 20;
        const rz = d.group.position.z + (Math.random() - 0.5) * 20;
        const ry = this.worldEngine.getTerrainHeight(rx, rz) + 3.0 + Math.random() * 2.0;

        d.targetPos.set(rx, ry, rz);
        d.wanderTimer = Math.random() * 5 + 3;
      }

      const dir = new THREE.Vector3().subVectors(d.targetPos, d.group.position);
      if (dir.length() > 0.2) {
        dir.normalize();
        d.group.position.addScaledVector(dir, d.speed * deltaSeconds);
      }

      d.group.position.y += Math.sin(Date.now() * 0.003) * 0.01;
      d.group.rotation.y += deltaSeconds * 0.8;

      if (d.laserTarget) {
        d.laserTarget.position.set(d.group.position.x, d.group.position.y - 5, d.group.position.z);
      }
    });
  }

  getNearestRival(playerPos) {
    let closest = null;
    let minDist = 12.0;

    this.drones.forEach(d => {
      const dist = playerPos.distanceTo(d.group.position);
      if (dist < minDist) {
        closest = { drone: d, distance: dist };
        minDist = dist;
      }
    });

    return closest;
  }
}
