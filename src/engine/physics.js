import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class PhysicsEngine {
  constructor() {
    this.gravityBase = 18.0;
  }

  getGravity() {
    const world = gameState.getCurrentWorld();
    return this.gravityBase * (world.gravity || 1.0);
  }

  getThermalUpdraft(pos) {
    const world = gameState.getCurrentWorld();
    if (world.id === 'kharon-bloomfields' || world.id === 'ashfields-coreth') {
      const updraftFactor = Math.sin(pos.x * 0.1) * Math.cos(pos.z * 0.1);
      if (updraftFactor > 0.4) {
        return (updraftFactor - 0.4) * 12.0;
      }
    }
    return 0.0;
  }

  isUnderwater(pos) {
    const world = gameState.getCurrentWorld();
    return world.id === 'vantauri-deep' && pos.y < 3.0;
  }

  // Calculate Terrain Surface Normal Vector for Gravity Magnetization
  getTerrainNormal(x, z, worldEngine) {
    if (!worldEngine) return new THREE.Vector3(0, 1, 0);

    const delta = 0.5;
    const hCenter = worldEngine.getTerrainHeight(x, z);
    const hRight = worldEngine.getTerrainHeight(x + delta, z);
    const hForward = worldEngine.getTerrainHeight(x, z + delta);

    const vecRight = new THREE.Vector3(delta, hRight - hCenter, 0);
    const vecForward = new THREE.Vector3(0, hForward - hCenter, delta);

    // Cross product gives surface normal vector
    const normal = new THREE.Vector3().crossVectors(vecForward, vecRight).normalize();
    return normal;
  }

  // Align Object Quaternion to Terrain Surface Normal Vector (Gravity Magnetization)
  alignToTerrainNormal(objectGroup, position, yaw, worldEngine) {
    if (!objectGroup || !worldEngine) return;

    const normal = this.getTerrainNormal(position.x, position.z, worldEngine);

    // Base orientation from yaw
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    // Normal alignment quaternion
    const up = new THREE.Vector3(0, 1, 0);
    const normalQuaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);

    // Combine yaw and normal alignment
    const finalQuaternion = normalQuaternion.multiply(yawQuaternion);
    objectGroup.quaternion.slerp(finalQuaternion, 0.2); // Smooth magnetization
  }
}

export const physicsEngine = new PhysicsEngine();
