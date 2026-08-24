import * as THREE from 'three';

export class CollisionEngine {
  constructor() {
    this.playerRadius = 0.6;
  }

  // Check and resolve 3D sphere vs box / bounding box collisions
  resolveCollisions(playerPos, colliders) {
    const playerSphere = new THREE.Sphere(playerPos, this.playerRadius);

    colliders.forEach(col => {
      if (!col || !col.boundingBox) return;

      const box = col.boundingBox;
      if (box.intersectsSphere(playerSphere)) {
        // Calculate collision penetration vector
        const closestPoint = new THREE.Vector3();
        box.clampPoint(playerPos, closestPoint);

        const pushDir = new THREE.Vector3().subVectors(playerPos, closestPoint);
        const dist = pushDir.length();

        if (dist < this.playerRadius && dist > 0.0001) {
          pushDir.normalize();
          const overlap = this.playerRadius - dist;
          playerPos.addScaledVector(pushDir, overlap);
        } else if (dist === 0) {
          // If completely inside box, push outward along Z
          playerPos.z += this.playerRadius;
        }
      }
    });
  }
}

export const collisionEngine = new CollisionEngine();
