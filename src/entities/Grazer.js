import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class GrazerEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.2);
    this.data = speciesData;
    this.speed = 1.4;
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
    const length = Math.max(0.8, Math.min(4.0, phys.size?.length || 1.4));
    const height = Math.max(0.8, Math.min(3.0, phys.size?.height || 1.2));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.5,
      metalness: 0.2
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 0.8
    });

    // Body Capsule
    const bodyGeo = new THREE.CapsuleGeometry(height * 0.35, length * 0.6, 8, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = height * 0.5;
    this.group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(height * 0.3, 10, 10);
    this.head = new THREE.Mesh(headGeo, mat);
    this.head.position.set(0, height * 0.65, length * 0.45);
    this.group.add(this.head);

    // 4 Animated Leg Joints
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const legGroup = new THREE.Group();
      const legGeo = new THREE.CylinderGeometry(0.08, 0.05, height * 0.6);
      const legMesh = new THREE.Mesh(legGeo, mat);
      legMesh.position.y = -height * 0.3;
      legGroup.add(legMesh);

      const side = (i % 2 === 0) ? 1 : -1;
      const front = (i < 2) ? 1 : -1;
      legGroup.position.set(side * height * 0.3, height * 0.5, front * length * 0.3);

      this.group.add(legGroup);
      this.legs.push(legGroup);
    }

    // Bioluminescent Spine Plates
    for (let j = 0; j < 3; j++) {
      const plateGeo = new THREE.BoxGeometry(0.06, height * 0.2, length * 0.15);
      const plate = new THREE.Mesh(plateGeo, glowMat);
      plate.position.set(0, height * 0.85, (j - 1) * length * 0.2);
      this.group.add(plate);
    }
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 30;
      const rz = this.group.position.z + (Math.random() - 0.5) * 30;
      const ry = worldEngine.getTerrainHeight(rx, rz);

      this.targetPos.set(rx, ry, rz);
      this.wanderTimer = Math.random() * 6 + 4;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    const dist = dir.length();
    let isWalking = false;

    if (dist > 0.2) {
      isWalking = true;
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Walking Leg Swing Animations
    if (this.legs && this.legs.length === 4) {
      const walkCycle = Math.sin(this.animTime * 8.0) * (isWalking ? 0.4 : 0.05);
      this.legs[0].rotation.x = walkCycle;
      this.legs[1].rotation.x = -walkCycle;
      this.legs[2].rotation.x = -walkCycle;
      this.legs[3].rotation.x = walkCycle;

      // Head bob animation
      if (this.head) {
        this.head.position.y = 1.2 + Math.sin(this.animTime * 4.0) * 0.05;
      }
    }
  }
}
