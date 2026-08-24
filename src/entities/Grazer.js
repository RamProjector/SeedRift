import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';
import { physicsEngine } from '../engine/physics.js';

export class GrazerEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.4);
    this.data = speciesData;
    this.speed = 1.5;
    this.actionState = 'IDLE'; // IDLE, GRAZING, WALKING
    this.actionTimer = Math.random() * 4;
    this.targetPos = pos.clone();

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const phys = this.data.physical || {};
    const color = phys.coloration || {};
    const primary = color.primary || '#5FE6B4';
    const secondary = color.secondary || '#4C9C7C';
    const length = Math.max(1.0, Math.min(4.0, phys.size?.length || 1.6));
    const height = Math.max(0.9, Math.min(3.0, phys.size?.height || 1.3));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.4,
      metalness: 0.3
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#224433'),
      roughness: 0.25,
      metalness: 0.7
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 1.3,
      roughness: 0.1
    });

    // Torso Capsule
    const bodyGeo = new THREE.CapsuleGeometry(height * 0.38, length * 0.65, 8, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = height * 0.55;
    this.group.add(body);

    // Segmented Shell Armor Plates
    for (let p = 0; p < 3; p++) {
      const plateGeo = new THREE.CylinderGeometry(height * 0.42, height * 0.45, length * 0.2, 8);
      plateGeo.rotateX(Math.PI / 2);
      const plate = new THREE.Mesh(plateGeo, armorMat);
      plate.position.set(0, height * 0.6, (p - 1) * length * 0.22);
      this.group.add(plate);
    }

    // Head with Chewing Mandibles
    const headGeo = new THREE.SphereGeometry(height * 0.32, 12, 12);
    this.head = new THREE.Mesh(headGeo, mat);
    this.head.position.set(0, height * 0.7, length * 0.48);
    this.group.add(this.head);

    const mandLGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
    mandLGeo.rotateX(Math.PI / 2);
    this.mandL = new THREE.Mesh(mandLGeo, glowMat);
    this.mandL.position.set(0.12, -0.1, 0.25);
    this.head.add(this.mandL);

    this.mandR = new THREE.Mesh(mandLGeo, glowMat);
    this.mandR.position.set(-0.12, -0.1, 0.25);
    this.head.add(this.mandR);

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, glowMat);
    eyeL.position.set(0.15, 0.1, 0.2);
    const eyeR = new THREE.Mesh(eyeGeo, glowMat);
    eyeR.position.set(-0.15, 0.1, 0.2);
    this.head.add(eyeL);
    this.head.add(eyeR);

    // 4 Multi-Jointed Legs (Hip, Knee, Hoof)
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const legGroup = new THREE.Group();

      const thighGeo = new THREE.CylinderGeometry(0.09, 0.07, height * 0.4, 8);
      const thigh = new THREE.Mesh(thighGeo, armorMat);
      thigh.position.y = -height * 0.2;
      legGroup.add(thigh);

      const shinGeo = new THREE.CylinderGeometry(0.06, 0.04, height * 0.4, 8);
      const shin = new THREE.Mesh(shinGeo, mat);
      shin.position.y = -height * 0.45;
      legGroup.add(shin);

      const hoofGeo = new THREE.BoxGeometry(0.12, 0.08, 0.16);
      const hoof = new THREE.Mesh(hoofGeo, glowMat);
      hoof.position.set(0, -height * 0.65, 0.02);
      legGroup.add(hoof);

      const side = (i % 2 === 0) ? 1 : -1;
      const front = (i < 2) ? 1 : -1;
      legGroup.position.set(side * height * 0.32, height * 0.55, front * length * 0.32);

      this.group.add(legGroup);
      this.legs.push(legGroup);
    }
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    // 1. Action State AI
    this.actionTimer -= deltaSeconds;
    if (this.actionTimer <= 0) {
      const states = ['IDLE', 'GRAZING', 'WALKING', 'WALKING'];
      this.actionState = states[Math.floor(Math.random() * states.length)];
      this.actionTimer = Math.random() * 5 + 3;

      if (this.actionState === 'WALKING') {
        const rx = this.group.position.x + (Math.random() - 0.5) * 28;
        const rz = this.group.position.z + (Math.random() - 0.5) * 28;
        this.targetPos.set(rx, 0, rz);
      }
    }

    // 2. Movement & Position Update BEFORE Terrain Height Evaluation
    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (this.actionState === 'WALKING' && dist > 0.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // 3. Terrain Height Ground Contact & Smooth Normal Alignment (Zero Glitch)
    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH;

      const yaw = this.group.rotation.y;
      physicsEngine.alignToTerrainNormal(this.group, this.group.position, yaw, worldEngine);
    }

    // 4. Expressive Animations
    if (this.actionState === 'GRAZING') {
      if (this.head) {
        this.head.position.y = 0.3 + Math.sin(this.animTime * 6.0) * 0.08;
        this.head.rotation.x = 0.5;
      }
      if (this.mandL && this.mandR) {
        const chew = Math.sin(this.animTime * 12.0) * 0.15;
        this.mandL.rotation.y = chew;
        this.mandR.rotation.y = -chew;
      }
    } else {
      if (this.head) {
        this.head.position.y = 0.8 + Math.sin(this.animTime * 3.0) * 0.03;
        this.head.rotation.x = 0;
      }
    }

    if (this.legs && this.legs.length === 4) {
      const isWalking = (this.actionState === 'WALKING' && dist > 0.2);
      const walkCycle = Math.sin(this.animTime * (isWalking ? 9.0 : 2.0)) * (isWalking ? 0.45 : 0.04);
      this.legs[0].rotation.x = walkCycle;
      this.legs[1].rotation.x = -walkCycle;
      this.legs[2].rotation.x = -walkCycle;
      this.legs[3].rotation.x = walkCycle;
    }
  }
}
