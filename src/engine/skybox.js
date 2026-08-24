import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class SkyboxEngine {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.showMoons = true;

    // Starfield Points
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 250 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(geometry, starMat);
    this.group.add(this.stars);

    // Solid Celestial Moons
    const moon1Geo = new THREE.SphereGeometry(14, 24, 24);
    const moon1Mat = new THREE.MeshStandardMaterial({
      color: '#8ce6f0',
      emissive: '#1a4454',
      emissiveIntensity: 0.4,
      roughness: 0.7,
      metalness: 0.1
    });
    this.moon1 = new THREE.Mesh(moon1Geo, moon1Mat);
    this.moon1.position.set(220, 140, -220);
    this.group.add(this.moon1);

    const moon2Geo = new THREE.SphereGeometry(8, 20, 20);
    const moon2Mat = new THREE.MeshStandardMaterial({
      color: '#f5c878',
      emissive: '#4a3212',
      emissiveIntensity: 0.3,
      roughness: 0.8,
      metalness: 0.1
    });
    this.moon2 = new THREE.Mesh(moon2Geo, moon2Mat);
    this.moon2.position.set(-180, 180, -200);
    this.group.add(this.moon2);

    this.scene.add(this.group);
  }

  toggleMoons(visible) {
    this.showMoons = visible;
    this.moon1.visible = visible;
    this.moon2.visible = visible;
  }

  update(deltaSeconds) {
    this.group.rotation.y += deltaSeconds * 0.01;
    this.moon1.rotation.y += deltaSeconds * 0.02;

    const time = gameState.timeOfDay;
    const isNight = time < 6 || time > 18;
    this.stars.material.opacity = isNight ? 0.95 : 0.15;
  }
}
