import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class RuinEntity extends BaseEntity {
  constructor(id, ruinType, pos) {
    super(id, ruinType, pos, 8.0);
    this.ruinType = ruinType;

    this.buildModel();
    this.updateBoundingBox();
  }

  buildModel() {
    const mat = new THREE.MeshStandardMaterial({
      color: '#0f1822',
      metalness: 0.85,
      roughness: 0.2
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: '#1c2936',
      metalness: 0.6,
      roughness: 0.5
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 1.4
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: '#ffc857',
      emissive: '#ff9f1c',
      emissiveIntensity: 1.6
    });

    // 1. Carved Firstseed Stone Foundation Plaza (16x16 Flat Ground Base)
    const plazaGeo = new THREE.BoxGeometry(18, 0.8, 18);
    const plaza = new THREE.Mesh(plazaGeo, stoneMat);
    plaza.position.y = 0.4;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    // Carved Glyph Step Inset
    const stepGeo = new THREE.BoxGeometry(12, 0.4, 12);
    const step = new THREE.Mesh(stepGeo, mat);
    step.position.y = 0.9;
    this.group.add(step);

    // 2. Central Ancient Obelisk Monolith
    const monolithGeo = new THREE.ConeGeometry(2.5, 14, 4);
    const pillar = new THREE.Mesh(monolithGeo, mat);
    pillar.position.y = 8.0;
    pillar.rotation.y = Math.PI / 4;
    this.group.add(pillar);

    // Rotating Firstseed Glyph Rings
    const ringGeo = new THREE.TorusGeometry(2.2, 0.14, 16, 32);

    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring1.rotation.x = Math.PI / 2;
    this.ring1.position.y = 4.2;
    this.group.add(this.ring1);

    this.ring2 = new THREE.Mesh(ringGeo, ringMat);
    this.ring2.rotation.x = Math.PI / 2;
    this.ring2.scale.set(0.7, 0.7, 0.7);
    this.ring2.position.y = 9.2;
    this.group.add(this.ring2);

    // Floating Interactive Core
    const coreGeo = new THREE.OctahedronGeometry(1.0);
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.y = 2.6;
    this.group.add(this.core);

    // 3. Surrounding Ancient Ruin Pillars & Archways
    this.pedestalCores = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const radius = 6.5;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      // Ancient Carved Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.8, 1.1, 7.0, 8);
      const ruinPillar = new THREE.Mesh(pillarGeo, stoneMat);
      ruinPillar.position.set(px, 3.9, pz);
      this.group.add(ruinPillar);

      // Glowing Pedestal Core atop pillar
      const pedCoreGeo = new THREE.OctahedronGeometry(0.4);
      const pedCore = new THREE.Mesh(pedCoreGeo, ringMat);
      pedCore.position.set(px, 8.0, pz);
      this.group.add(pedCore);
      this.pedestalCores.push(pedCore);
    }
  }

  update(deltaSeconds, worldEngine) {
    super.update(deltaSeconds, worldEngine);

    if (worldEngine) {
      const terrainH = worldEngine.getTerrainHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = terrainH;
    }

    if (this.ring1) this.ring1.rotation.z += deltaSeconds * 0.5;
    if (this.ring2) this.ring2.rotation.z -= deltaSeconds * 0.8;
    if (this.core) this.core.rotation.y += deltaSeconds * 1.0;

    this.pedestalCores.forEach((c, idx) => {
      c.rotation.y += deltaSeconds * (0.8 + idx * 0.2);
    });
  }
}
