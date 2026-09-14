import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class GliderEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.0);
    this.data = speciesData;
    this.speed = 2.8;
    this.wanderTimer = Math.random() * 5;
    this.targetPos = pos.clone();
    this.hoverAltitude = 5.0 + Math.random() * 3.0;

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const phys = this.data.physical || {};
    const color = phys.coloration || {};
    const primary = color.primary || '#5FE6B4';
    const secondary = color.secondary || '#4C9C7C';
    const length = Math.max(0.6, Math.min(3.0, phys.size?.length || 1.2));
    const height = Math.max(0.6, Math.min(2.5, phys.size?.height || 1.0));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.3,
      metalness: 0.3
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 1.4,
      roughness: 0.1
    });

    // Sleek Aerodynamic Thorax
    const thoraxGeo = new THREE.ConeGeometry(height * 0.35, length, 12);
    thoraxGeo.rotateX(-Math.PI / 2);
    const thorax = new THREE.Mesh(thoraxGeo, mat);
    this.group.add(thorax);

    // Glowing Bioluminescent Abdomen Pod
    const abGeo = new THREE.SphereGeometry(height * 0.28, 12, 12);
    const ab = new THREE.Mesh(abGeo, glowMat);
    ab.position.set(0, 0, length * 0.5);
    this.group.add(ab);

    // Bilateral Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(height * 1.5, length * 0.4, height * 2.0, -length * 0.2);
    wingShape.quadraticCurveTo(height * 1.0, -length * 0.8, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    this.wingL = new THREE.Mesh(wingGeo, wingMat);
    this.wingL.position.set(0.1, 0, 0);
    this.group.add(this.wingL);

    this.wingR = new THREE.Mesh(wingGeo, wingMat);
    this.wingR.scale.x = -1;
    this.wingR.position.set(-0.1, 0, 0);
    this.group.add(this.wingR);

    // Fluttering Tail Streamer Ribbons
    this.ribbonL = new THREE.Mesh(new THREE.PlaneGeometry(0.1, length * 0.8), wingMat);
    this.ribbonL.position.set(0.12, -0.05, length * 0.8);
    this.group.add(this.ribbonL);

    this.ribbonR = new THREE.Mesh(new THREE.PlaneGeometry(0.1, length * 0.8), wingMat);
    this.ribbonR.position.set(-0.12, -0.05, length * 0.8);
    this.group.add(this.ribbonR);

    // Forward Antennae
    const antGeo = new THREE.CylinderGeometry(0.02, 0.04, height * 0.9);
    antGeo.rotateX(Math.PI / 3);

    const antL = new THREE.Mesh(antGeo, glowMat);
    antL.position.set(0.12, height * 0.2, -length * 0.4);
    antL.rotation.y = -0.2;
    this.group.add(antL);

    const antR = new THREE.Mesh(antGeo, glowMat);
    antR.position.set(-0.12, height * 0.2, -length * 0.4);
    antR.rotation.y = 0.2;
    this.group.add(antR);
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH + this.hoverAltitude + Math.sin(this.animTime * 2.5) * 0.4;
    }

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 40;
      const rz = this.group.position.z + (Math.random() - 0.5) * 40;

      this.targetPos.set(rx, 0, rz);
      this.wanderTimer = Math.random() * 6 + 4;
    }

    const dir = new THREE.Vector3(
      this.targetPos.x - this.group.position.x,
      0,
      this.targetPos.z - this.group.position.z
    );

    if (dir.length() > 0.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);

      const forwardAngle = Math.atan2(dir.x, dir.z) + Math.PI;
      this.group.rotation.y = forwardAngle;

      this.group.rotation.z = Math.sin(this.animTime * 3.0) * 0.1;
    }

    // High-Frequency Flapping Wings & Tail Streamer Motion
    if (this.wingL && this.wingR) {
      const flap = Math.sin(this.animTime * 12.0) * 0.45;
      this.wingL.rotation.z = flap;
      this.wingR.rotation.z = -flap;
    }

    if (this.ribbonL && this.ribbonR) {
      const wave = Math.sin(this.animTime * 8.0) * 0.2;
      this.ribbonL.rotation.x = wave;
      this.ribbonR.rotation.x = -wave;
    }
  }
}
