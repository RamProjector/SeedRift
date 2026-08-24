import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class FloraEntity extends BaseEntity {
  constructor(id, type, pos, scale = 1.0) {
    super(id, `Wild Flora (${type})`, pos, 1.2 * scale);
    this.type = type;
    this.scale = scale;
    this.harvested = false;

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const scale = this.scale;

    if (this.type === 'sporeStalk') {
      const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.8 * scale, 12 * scale, 12);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#2a442e', roughness: 0.8 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 6 * scale;
      this.group.add(trunk);

      const capGeo = new THREE.SphereGeometry(3.5 * scale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const capMat = new THREE.MeshStandardMaterial({
        color: '#4ce0a5',
        emissive: '#33aa77',
        emissiveIntensity: 0.7,
        roughness: 0.3
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 12 * scale;
      this.group.add(cap);

    } else if (this.type === 'crystalNode' || this.type === 'glowCrystal') {
      const crystalGeo = new THREE.ConeGeometry(1.5 * scale, 5 * scale, 6);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: '#5fe6d0',
        emissive: '#2cbda8',
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.8
      });
      const main = new THREE.Mesh(crystalGeo, crystalMat);
      main.position.y = 2.5 * scale;
      this.group.add(main);

    } else {
      const bushGeo = new THREE.DodecahedronGeometry(1.2 * scale);
      const bushMat = new THREE.MeshStandardMaterial({ color: '#8a9e42', roughness: 0.8 });
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.y = 1.0 * scale;
      this.group.add(bush);
    }
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    // Wind Sway Animation
    const sway = Math.sin(this.animTime * 1.5) * 0.05;
    this.group.rotation.z = sway;
  }
}
