import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class PredatorEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.4);
    this.data = speciesData;
    this.speed = 2.8;
    this.wanderTimer = Math.random() * 5;
    this.targetPos = pos.clone();

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const phys = this.data.physical || {};
    const color = phys.coloration || {};
    const primary = color.primary || '#5FE6B4';
    const secondary = color.secondary || '#4C9C7C';
    const length = Math.max(0.8, Math.min(4.0, phys.size?.length || 1.6));
    const height = Math.max(0.8, Math.min(3.0, phys.size?.height || 1.2));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.3,
      metalness: 0.4
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 1.2
    });

    const bodyGeo = new THREE.BoxGeometry(length * 0.45, height * 0.45, length * 1.1);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = height * 0.55;
    this.group.add(body);

    const headGeo = new THREE.ConeGeometry(height * 0.35, length * 0.55, 8);
    headGeo.rotateX(-Math.PI / 2);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, height * 0.55, length * 0.65);
    this.group.add(head);

    const eyeGeo = new THREE.SphereGeometry(length * 0.07, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, glowMat);
    eyeL.position.set(length * 0.14, height * 0.65, length * 0.75);
    const eyeR = new THREE.Mesh(eyeGeo, glowMat);
    eyeR.position.set(-length * 0.14, height * 0.65, length * 0.75);
    this.group.add(eyeL);
    this.group.add(eyeR);

    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const legGroup = new THREE.Group();
      const legGeo = new THREE.CylinderGeometry(0.05, 0.03, height * 0.9);
      const legMesh = new THREE.Mesh(legGeo, mat);
      legMesh.position.y = -height * 0.45;
      legGroup.add(legMesh);

      const side = (i % 2 === 0) ? 1 : -1;
      const front = (i < 2) ? 1 : -1;
      legGroup.position.set(side * length * 0.28, height * 0.55, front * length * 0.35);

      this.group.add(legGroup);
      this.legs.push(legGroup);
    }
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH;
    }

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 35;
      const rz = this.group.position.z + (Math.random() - 0.5) * 35;
      const ry = worldEngine ? worldEngine.getTerrainHeight(rx, rz) : 0;

      this.targetPos.set(rx, ry, rz);
      this.wanderTimer = Math.random() * 5 + 3;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();
    let isRunning = false;

    if (dist > 0.2) {
      isRunning = true;
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    if (this.legs && this.legs.length === 4) {
      const stride = Math.sin(this.animTime * 12.0) * (isRunning ? 0.55 : 0.1);
      this.legs[0].rotation.x = stride;
      this.legs[1].rotation.x = -stride;
      this.legs[2].rotation.x = -stride;
      this.legs[3].rotation.x = stride;
    }
  }
}
