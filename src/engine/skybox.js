import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class SkyboxEngine {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

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

    // Twin Moons
    const moon1Geo = new THREE.SphereGeometry(12, 16, 16);
    const moon1Mat = new THREE.MeshBasicMaterial({ color: '#5fe6d0', wireframe: true });
    this.moon1 = new THREE.Mesh(moon1Geo, moon1Mat);
    this.moon1.position.set(180, 120, -200);
    this.group.add(this.moon1);

    const moon2Geo = new THREE.SphereGeometry(6, 12, 12);
    const moon2Mat = new THREE.MeshBasicMaterial({ color: '#ffc857', wireframe: true });
    this.moon2 = new THREE.Mesh(moon2Geo, moon2Mat);
    this.moon2.position.set(-150, 160, -180);
    this.group.add(this.moon2);

    this.scene.add(this.group);
  }

  update(deltaSeconds) {
    this.group.rotation.y += deltaSeconds * 0.01;
    this.moon1.rotation.y += deltaSeconds * 0.02;

    const time = gameState.timeOfDay;
    // Stars fade during day (6am to 18pm) and brighten at night
    const isNight = time < 6 || time > 18;
    this.stars.material.opacity = isNight ? 0.95 : 0.15;
  }
}
