import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class RivalDroneEntity extends BaseEntity {
  constructor(id, pos) {
    super(id, "Meridian Combine Drone", pos, 1.5);
    this.speed = 2.0;
    this.wanderTimer = Math.random() * 4;
    this.targetPos = pos.clone();

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const bodyGeo = new THREE.OctahedronGeometry(1.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#e6a855',
      metalness: 0.9,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(body);

    const laserLight = new THREE.SpotLight('#ff3300', 2.0, 15, Math.PI / 6, 0.5);
    laserLight.position.set(0, 0, 0);
    this.group.add(laserLight);
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 20;
      const rz = this.group.position.z + (Math.random() - 0.5) * 20;
      const ry = worldEngine.getTerrainHeight(rx, rz) + 3.0 + Math.random() * 2.0;

      this.targetPos.set(rx, ry, rz);
      this.wanderTimer = Math.random() * 5 + 3;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    if (dir.length() > 0.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);
    }

    this.group.position.y += Math.sin(this.animTime * 3.0) * 0.01;
    this.group.rotation.y += deltaSeconds * 0.8;
  }
}
