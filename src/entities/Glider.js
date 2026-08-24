import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class GliderEntity extends BaseEntity {
  constructor(id, speciesData, pos) {
    super(id, speciesData.commonName, pos, 1.0);
    this.data = speciesData;
    this.speed = 2.5;
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
      emissiveIntensity: 1.0
    });

    const thoraxGeo = new THREE.ConeGeometry(height * 0.35, length, 12);
    thoraxGeo.rotateX(Math.PI / 2);
    const thorax = new THREE.Mesh(thoraxGeo, mat);
    this.group.add(thorax);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(length * 0.8, height * 1.6, length * 1.6, height * 0.9);
    wingShape.quadraticCurveTo(length * 0.8, -height * 0.6, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary),
      emissive: new THREE.Color(secondary),
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    this.wingL = new THREE.Mesh(wingGeo, wingMat);
    this.wingL.rotation.x = Math.PI / 6;
    this.group.add(this.wingL);

    this.wingR = new THREE.Mesh(wingGeo, wingMat);
    this.wingR.scale.y = -1;
    this.wingR.rotation.x = -Math.PI / 6;
    this.group.add(this.wingR);

    const antGeo = new THREE.CylinderGeometry(0.02, 0.04, height * 0.9);
    const antL = new THREE.Mesh(antGeo, glowMat);
    antL.position.set(0.1, height * 0.2, length * 0.4);
    antL.rotation.z = -0.4;
    this.group.add(antL);

    const antR = new THREE.Mesh(antGeo, glowMat);
    antR.position.set(-0.1, height * 0.2, length * 0.4);
    antR.rotation.z = 0.4;
    this.group.add(antR);
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH + this.hoverAltitude + Math.sin(this.animTime * 2.0) * 0.5;
    }

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 35;
      const rz = this.group.position.z + (Math.random() - 0.5) * 35;

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
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }

    if (this.wingL && this.wingR) {
      const flap = Math.sin(this.animTime * 10.0) * 0.45;
      this.wingL.rotation.z = flap;
      this.wingR.rotation.z = -flap;
    }
  }
}
