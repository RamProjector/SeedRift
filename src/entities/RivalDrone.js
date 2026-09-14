import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class RivalDroneEntity extends BaseEntity {
  constructor(id, pos) {
    super(id, "Meridian Combine Drone", pos, 1.5);
    this.speed = 2.0;
    this.wanderTimer = Math.random() * 4;
    this.targetPos = pos.clone();

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#e6a855',
      metalness: 0.9,
      roughness: 0.2
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: '#1c221a',
      metalness: 0.8,
      roughness: 0.3
    });

    const laserMat = new THREE.MeshStandardMaterial({
      color: '#ff3300',
      emissive: '#ff2200',
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.8
    });

    // Octahedron Chassis
    const bodyGeo = new THREE.OctahedronGeometry(1.0);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(body);

    // Solar Shell Trim Ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 16);
    const ring = new THREE.Mesh(ringGeo, darkMat);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);

    // 4 Rotating Hover Rotors
    this.rotors = [];
    for (let r = 0; r < 4; r++) {
      const angle = (r / 4) * Math.PI * 2;
      const rx = Math.cos(angle) * 1.3;
      const rz = Math.sin(angle) * 1.3;

      const rotorPodGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
      const pod = new THREE.Mesh(rotorPodGeo, darkMat);
      pod.position.set(rx, 0, rz);
      this.group.add(pod);

      const bladeGeo = new THREE.BoxGeometry(0.6, 0.02, 0.1);
      const blade = new THREE.Mesh(bladeGeo, bodyMat);
      blade.position.set(rx, 0.08, rz);
      this.group.add(blade);
      this.rotors.push(blade);
    }

    // Scanning Red Laser Cone
    const laserGeo = new THREE.ConeGeometry(0.8, 6.0, 12, 1, true);
    laserGeo.rotateX(Math.PI);
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.position.set(0, -3.0, 0);
    this.group.add(laserMesh);

    const laserLight = new THREE.SpotLight('#ff3300', 2.0, 15, Math.PI / 6, 0.5);
    laserLight.position.set(0, 0, 0);
    this.group.add(laserLight);
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    this.wanderTimer -= deltaSeconds;
    if (this.wanderTimer <= 0) {
      const rx = this.group.position.x + (Math.random() - 0.5) * 20;
      const rz = this.group.position.z + (Math.random() - 0.5) * 20;
      const ry = worldEngine ? worldEngine.getTerrainHeight(rx, rz) + 3.0 + Math.random() * 2.0 : 4.0;

      this.targetPos.set(rx, ry, rz);
      this.wanderTimer = Math.random() * 5 + 3;
    }

    const dir = new THREE.Vector3().subVectors(this.targetPos, this.group.position);
    if (dir.length() > 0.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * deltaSeconds);
    }

    this.group.position.y += Math.sin(this.animTime * 3.0) * 0.01;
    this.group.rotation.y += deltaSeconds * 0.8;

    // Spin Rotor Blades
    this.rotors.forEach(b => {
      b.rotation.y += deltaSeconds * 15.0;
    });
  }
}
