import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class PhysicsEngine {
  constructor(worldEngine) {
    this.worldEngine = worldEngine;
    this.gravityBase = 18.0; // Base earth gravity ms^2
  }

  // Calculate planetary gravity
  getGravity() {
    const world = gameState.getCurrentWorld();
    return this.gravityBase * (world.gravity || 1.0);
  }

  // Compute thermal updrafts over spore stalks & volcanic vents
  getThermalUpdraft(pos) {
    const world = gameState.getCurrentWorld();
    if (world.id === 'kharon-bloomfields' || world.id === 'ashfields-coreth') {
      // Periodic thermal updrafts rising from ground vents
      const updraftFactor = Math.sin(pos.x * 0.1) * Math.cos(pos.z * 0.1);
      if (updraftFactor > 0.4) {
        return (updraftFactor - 0.4) * 12.0; // Upward velocity boost
      }
    }
    return 0.0;
  }

  // Compute underwater buoyancy in Vantauri Deep
  isUnderwater(pos) {
    const world = gameState.getCurrentWorld();
    return world.id === 'vantauri-deep' && pos.y < 3.0;
  }
}

export const physicsEngine = new PhysicsEngine();
