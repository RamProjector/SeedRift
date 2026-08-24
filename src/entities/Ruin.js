import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class RuinEntity extends BaseEntity {
  constructor(id, ruinType, pos) {
    super(id, ruinType, pos, 3.5);
    this.ruinType = ruinType;

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const baseGeo = new THREE.BoxGeometry(4, 1.5, 4);
    const monolithGeo = new THREE.ConeGeometry(2.5, 14, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: '#0d131a',
      metalness: 0.9,
      roughness: 0.15
    });

    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 0.75;
    this.group.add(base);

    const pillar = new THREE.Mesh(monolithGeo, mat);
    pillar.position.y = 8;
    pillar.rotation.y = Math.PI / 4;
    this.group.add(pillar);

    const ringGeo = new THREE.TorusGeometry(2.0, 0.12, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 1.2
    });

    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring1.rotation.x = Math.PI / 2;
    this.ring1.position.y = 4.0;
    this.group.add(this.ring1);

    this.ring2 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2.rotation.x = Math.PI / 2;
    this.ring2.scale.set(0.7, 0.7, 0.7);
    this.ring2.position.y = 9.0;
    this.group.add(this.ring2);

    const coreGeo = new THREE.OctahedronGeometry(0.8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#ffc857',
      emissive: '#ff9f1c',
      emissiveIntensity: 1.4
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.y = 2.5;
    this.group.add(this.core);
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    if (this.ring1) this.ring1.rotation.z += deltaSeconds * 0.5;
    if (this.ring2) this.ring2.rotation.z -= deltaSeconds * 0.8;
    if (this.core) this.core.rotation.y += deltaSeconds * 1.0;
  }
}
