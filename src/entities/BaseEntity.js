import * as THREE from 'three';

export class BaseEntity {
  constructor(id, name, pos, radius = 1.0) {
    this.id = id;
    this.name = name;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.radius = radius;
    this.boundingBox = new THREE.Box3();
    this.animTime = Math.random() * 10;
  }

  updateBoundingBox() {
    this.boundingBox.setFromObject(this.group);
  }

  update(deltaSeconds, worldEngine) {
    this.animTime += deltaSeconds;
    this.updateBoundingBox();
  }
}
