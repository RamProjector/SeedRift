import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';
import { physicsEngine } from '../engine/physics.js';

export class FloraEntity extends BaseEntity {
  constructor(id, type, pos, scale = 1.0) {
    super(id, `Wild Flora (${type})`, pos, 1.4 * scale);
    this.type = type;
    this.scale = scale;
    this.harvested = false;

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const scale = this.scale;

    const rootMat = new THREE.MeshStandardMaterial({ color: '#1f2d1e', roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const rootGeo = new THREE.CylinderGeometry(0.15 * scale, 0.35 * scale, 1.8 * scale, 8);
      const root = new THREE.Mesh(rootGeo, rootMat);
      const angle = (i / 4) * Math.PI * 2;
      root.position.set(Math.cos(angle) * 0.8 * scale, -0.4 * scale, Math.sin(angle) * 0.8 * scale);
      root.rotation.z = Math.cos(angle) * 0.5;
      root.rotation.x = Math.sin(angle) * 0.5;
      this.group.add(root);
    }

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

      for (let i = 0; i < 3; i++) {
        const bracketGeo = new THREE.CylinderGeometry(1.2 * scale, 0.2 * scale, 0.3 * scale, 8, 1, false, 0, Math.PI);
        const bracketMat = new THREE.MeshStandardMaterial({ color: '#88b577', roughness: 0.6 });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.position.y = (3 + i * 3) * scale;
        bracket.rotation.y = (i * 1.5);
        this.group.add(bracket);
      }

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

    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH;

      const yaw = this.group.rotation.y;
      physicsEngine.alignToTerrainNormal(this.group, this.group.position, yaw, worldEngine);
    }

    const sway = Math.sin(this.animTime * 1.5) * 0.04;
    this.group.rotation.z = sway;
  }
}
