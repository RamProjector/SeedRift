import * as THREE from 'three';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';

export class HaulingManager {
  constructor(scene, worldEngine) {
    this.scene = scene;
    this.worldEngine = worldEngine;
    this.routes = [];
  }

  createRoute(startPos, endPos, speciesName = 'Shellgrazer') {
    const routeId = `route_${Date.now()}`;

    // Create 3D Hauling Pack-Creature (Shellgrazer with resource crates)
    const packGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#3b4e32', roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    packGroup.add(body);

    // Resource Crates on Back
    const crateGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
    const crateMat = new THREE.MeshStandardMaterial({ color: '#e6a855', roughness: 0.3 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(0, 2.0, 0);
    packGroup.add(crate);

    const startY = this.worldEngine.getTerrainHeight(startPos.x, startPos.z);
    packGroup.position.set(startPos.x, startY, startPos.z);
    this.scene.add(packGroup);

    const routeObj = {
      id: routeId,
      speciesName,
      startPos: startPos.clone(),
      endPos: endPos.clone(),
      packGroup,
      progress: 0,
      speed: 0.15,
      direction: 1, // 1: start to end, -1: end to start
      yieldRate: 2.0 // +2 resources per trip
    };

    this.routes.push(routeObj);
    soundEngine.playSampleAcquired();
    return routeObj;
  }

  update(deltaSeconds) {
    this.routes.forEach(r => {
      r.progress += deltaSeconds * r.speed * r.direction;

      if (r.progress >= 1.0) {
        r.progress = 1.0;
        r.direction = -1; // Turn back
        gameState.extractedResources.organics += r.yieldRate;
        gameState.extractedResources.crystal += r.yieldRate;
      } else if (r.progress <= 0.0) {
        r.progress = 0.0;
        r.direction = 1; // Head to destination
      }

      // Interpolate position along route
      const currentPos = new THREE.Vector3().lerpVectors(r.startPos, r.endPos, r.progress);
      const terrainY = this.worldEngine.getTerrainHeight(currentPos.x, currentPos.z);
      r.packGroup.position.set(currentPos.x, terrainY, currentPos.z);

      // Facing rotation
      const target = r.direction === 1 ? r.endPos : r.startPos;
      const lookDir = new THREE.Vector3().subVectors(target, currentPos);
      if (lookDir.length() > 0.1) {
        r.packGroup.rotation.y = Math.atan2(lookDir.x, lookDir.z);
      }
    });
  }
}
