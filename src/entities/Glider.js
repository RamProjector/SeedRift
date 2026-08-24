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
      emissiveIntensity: 1.2,
      roughness: 0.1
    });

    // Sleek Aerodynamic Thorax aligned along Z-axis (Forward is -Z)
    const thoraxGeo = new THREE.ConeGeometry(height * 0.35, length, 12);
    thoraxGeo.rotateX(-Math.PI / 2); // Cone tip points FORWARD along -Z
    const thorax = new THREE.Mesh(thoraxGeo, mat);
    this.group.add(thorax);

    // Bilateral Wings extending along X-axis (Left +X, Right -X)
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

    // Left Wing (+X)
    this.wingL = new THREE.Mesh(wingGeo, wingMat);
    this.wingL.position.set(0.1, 0, 0);
    this.group.add(this.wingL);

    // Right Wing (-X)
    this.wingR = new THREE.Mesh(wingGeo, wingMat);
    this.wingR.scale.x = -1;
    this.wingR.position.set(-0.1, 0, 0);
    this.group.add(this.wingR);

    // Forward Antennae (projecting along -Z)
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

    // Delicate Landing Legs
    for (let i = 0; i < 2; i++) {
      const legGeo = new THREE.CylinderGeometry(0.03, 0.02, height * 0.5);
      const leg = new THREE.Mesh(legGeo, mat);
      const side = (i === 0) ? 1 : -1;
      leg.position.set(side * 0.15, -height * 0.25, 0);
      this.group.add(leg);
    }
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

      // Point head/nose (-Z) directly toward movement direction
      const forwardAngle = Math.atan2(dir.x, dir.z) + Math.PI;
      this.group.rotation.y = forwardAngle;

      // Add banking roll into flight turns
      this.group.rotation.z = Math.sin(this.animTime * 3.0) * 0.1;
    }

    // High-Frequency Flapping Wing Animation
    if (this.wingL && this.wingR) {
      const flap = Math.sin(this.animTime * 12.0) * 0.45;
      this.wingL.rotation.z = flap;
      this.wingR.rotation.z = -flap;
    }
  }
}
