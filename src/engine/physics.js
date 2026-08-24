import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class PhysicsEngine {
  constructor() {
    this.gravityBase = 18.0;
    this.fixedTimeStep = 1.0 / 60.0; // 60Hz Deterministic Physics Tick
    this.accumulator = 0.0;
    this.alpha = 1.0; // Physics interpolation ratio for rendering
    this.substeps = 4;
    this.dynamicFriction = 0.85;
    this.staticFriction = 0.95;
    this.restitution = 0.05;

    // Pelvis Suspension Spring Physics Constants
    this.springStiffness = 180.0;
    this.springDamping = 18.0;
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

  getTerrainNormal(x, z, worldEngine) {
    if (!worldEngine) return new THREE.Vector3(0, 1, 0);

    const delta = 0.5;
    const hCenter = worldEngine.getTerrainHeight(x, z);
    const hRight = worldEngine.getTerrainHeight(x + delta, z);
    const hForward = worldEngine.getTerrainHeight(x, z + delta);

    const vecRight = new THREE.Vector3(delta, hRight - hCenter, 0);
    const vecForward = new THREE.Vector3(0, hForward - hCenter, delta);

    const normal = new THREE.Vector3().crossVectors(vecForward, vecRight).normalize();
    return normal;
  }

  alignToTerrainNormal(objectGroup, position, yaw, worldEngine) {
    if (!objectGroup || !worldEngine) return;

    const normal = this.getTerrainNormal(position.x, position.z, worldEngine);

    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const up = new THREE.Vector3(0, 1, 0);
    const normalQuaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);

    const finalQuaternion = normalQuaternion.multiply(yawQuaternion);
    objectGroup.quaternion.slerp(finalQuaternion, 0.2);
  }

  // Critically Damped Pelvis Spring Suspension
  applyPelvisSpringSuspension(currentY, targetY, currentVelY, deltaSeconds) {
    const displacement = currentY - targetY;
    const springForce = -this.springStiffness * displacement - this.springDamping * currentVelY;
    const newVelY = currentVelY + springForce * deltaSeconds;
    const newY = currentY + newVelY * deltaSeconds;

    return { y: newY, velY: newVelY };
  }

  applyContinuousCollisionDetection(prevPos, nextPos, worldEngine) {
    if (!worldEngine) return nextPos;

    const rayDir = new THREE.Vector3().subVectors(nextPos, prevPos);
    const rayLength = rayDir.length();

    if (rayLength > 0.001) {
      rayDir.normalize();

      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const testPoint = new THREE.Vector3().lerpVectors(prevPos, nextPos, t);
        const groundY = worldEngine.getTerrainHeight(testPoint.x, testPoint.z);

        if (testPoint.y < groundY) {
          nextPos.y = groundY;
          break;
        }
      }
    }

    return nextPos;
  }
}

export const physicsEngine = new PhysicsEngine();
