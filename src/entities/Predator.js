import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';
import { physicsEngine } from '../engine/physics.js';

export class PredatorEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.4);
    this.data = speciesData;
    this.speed = 3.2;
    this.actionState = 'STALKING'; // IDLE, STALKING, PURSUIT
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
    const length = Math.max(0.8, Math.min(4.0, phys.size?.length || 1.6));
    const height = Math.max(0.8, Math.min(3.0, phys.size?.height || 1.2));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.25,
      metalness: 0.5
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c3328'),
      roughness: 0.2,
      metalness: 0.8
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 1.4,
      roughness: 0.1
    });

    // Sleek Quad Chassis
    const bodyGeo = new THREE.BoxGeometry(length * 0.45, height * 0.45, length * 1.1);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = height * 0.55;
    this.group.add(body);

    // Spine Plates
    for (let p = 0; p < 4; p++) {
      const spGeo = new THREE.ConeGeometry(0.08, height * 0.35, 4);
      const sp = new THREE.Mesh(spGeo, glowMat);
      sp.position.set(0, height * 0.8, (p - 1.5) * length * 0.22);
      this.group.add(sp);
    }

    // Predatory Head & Snapping Jaws
    const headGeo = new THREE.ConeGeometry(height * 0.38, length * 0.6, 8);
    headGeo.rotateX(-Math.PI / 2);
    this.head = new THREE.Mesh(headGeo, armorMat);
    this.head.position.set(0, height * 0.55, length * 0.65);
    this.group.add(this.head);

    // Lower Jaw
    const jawGeo = new THREE.BoxGeometry(height * 0.22, 0.08, length * 0.4);
    this.jaw = new THREE.Mesh(jawGeo, mat);
    this.jaw.position.set(0, -0.15, 0.1);
    this.head.add(this.jaw);

    // Quad Glowing Eyes
    for (let e = 0; e < 4; e++) {
      const eyeGeo = new THREE.SphereGeometry(length * 0.05, 8, 8);
      const eye = new THREE.Mesh(eyeGeo, glowMat);
      const side = (e % 2 === 0) ? 1 : -1;
      const heightOffset = (e < 2) ? 0.08 : -0.04;
      eye.position.set(side * length * 0.14, heightOffset, length * 0.25);
      this.head.add(eye);
    }

    // Multi-Segment Whip Tail
    this.tail = new THREE.Group();
    for (let t = 0; t < 3; t++) {
      const tGeo = new THREE.CylinderGeometry(0.08 - t * 0.02, 0.1 - t * 0.02, length * 0.3, 6);
      const tMesh = new THREE.Mesh(tGeo, armorMat);
      tMesh.position.set(0, 0, -t * length * 0.25);
      this.tail.add(tMesh);
    }
    this.tail.position.set(0, height * 0.6, -length * 0.55);
    this.group.add(this.tail);

    // 4 Articulated Raptor Limbs with Claws
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      const legGroup = new THREE.Group();

      const thighGeo = new THREE.CylinderGeometry(0.08, 0.05, height * 0.45, 8);
      const thigh = new THREE.Mesh(thighGeo, armorMat);
      thigh.position.y = -height * 0.22;
      legGroup.add(thigh);

      const clawGeo = new THREE.ConeGeometry(0.06, height * 0.45, 6);
      const claw = new THREE.Mesh(clawGeo, glowMat);
      claw.position.set(0, -height * 0.55, 0.08);
      claw.rotation.x = Math.PI / 4;
      legGroup.add(claw);

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

      const yaw = this.group.rotation.y;
      physicsEngine.alignToTerrainNormal(this.group, this.group.position, yaw, worldEngine);
    }

    this.actionTimer -= deltaSeconds;
    if (this.actionTimer <= 0) {
      const states = ['IDLE', 'STALKING', 'PURSUIT'];
      this.actionState = states[Math.floor(Math.random() * states.length)];
      this.actionTimer = Math.random() * 5 + 3;

      if (this.actionState !== 'IDLE') {
        const rx = this.group.position.x + (Math.random() - 0.5) * 35;
        const rz = this.group.position.z + (Math.random() - 0.5) * 35;
        const ry = worldEngine ? worldEngine.getTerrainHeight(rx, rz) : 0;
        this.targetPos.set(rx, ry, rz);
      }
    }

    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();
    let isMoving = false;

    if (this.actionState !== 'IDLE' && dist > 0.2) {
      isMoving = true;
      dir.normalize();
      const currentSpeed = (this.actionState === 'PURSUIT') ? this.speed * 1.5 : this.speed;
      this.group.position.addScaledVector(dir, currentSpeed * deltaSeconds);
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Whip Tail Sway Animation
    if (this.tail) {
      this.tail.rotation.y = Math.sin(this.animTime * 6.0) * 0.35;
    }

    // Jaw Snapping in Pursuit
    if (this.jaw && this.actionState === 'PURSUIT') {
      this.jaw.rotation.x = Math.sin(this.animTime * 14.0) * 0.25;
    }

    if (this.legs && this.legs.length === 4) {
      const strideFreq = (this.actionState === 'PURSUIT') ? 16.0 : 9.0;
      const stride = Math.sin(this.animTime * strideFreq) * (isMoving ? 0.6 : 0.05);
      this.legs[0].rotation.x = stride;
      this.legs[1].rotation.x = -stride;
      this.legs[2].rotation.x = -stride;
      this.legs[3].rotation.x = stride;
    }
  }
}
