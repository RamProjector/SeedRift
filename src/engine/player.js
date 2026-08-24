import * as THREE from 'three';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';
import { physicsEngine } from './physics.js';

export class PlayerController {
  constructor(scene, camera, worldEngine) {
    this.scene = scene;
    this.camera = camera;
    this.worldEngine = worldEngine;

    this.group = new THREE.Group();

    const torsoGeo = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
    const suitMat = new THREE.MeshStandardMaterial({
      color: '#1a2b22',
      roughness: 0.3,
      metalness: 0.8
    });
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    this.group.add(torso);

    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const visorMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });
    const head = new THREE.Mesh(headGeo, visorMat);
    head.position.set(0, 1.45, 0.05);
    this.group.add(head);

    const packGeo = new THREE.BoxGeometry(0.4, 0.6, 0.25);
    const packMat = new THREE.MeshStandardMaterial({ color: '#2a3b30', metalness: 0.9 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.95, -0.25);
    this.group.add(pack);

    const wingGeo = new THREE.PlaneGeometry(1.6, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.wings = new THREE.Mesh(wingGeo, wingMat);
    this.wings.position.set(0, 1.0, -0.3);
    this.wings.rotation.x = Math.PI / 4;
    this.group.add(this.wings);

    this.glowLight = new THREE.PointLight('#5fe6b4', 0, 15);
    this.glowLight.position.set(0, 1.2, 0);
    this.group.add(this.glowLight);

    this.scene.add(this.group);

    this.position = this.group.position;
    this.position.set(0, 2, 0);

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = false;
    this.isGliding = false;
    this.isTunneling = false;

    this.camYaw = 0;
    this.camPitch = 0.3;
    this.camDistance = 6.5;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      tunnel: false
    };

    this.setupInputs();
  }

  resetKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.keys.jump = false;
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  setupInputs() {
    window.addEventListener('blur', () => this.resetKeys());
    window.addEventListener('focus', () => this.resetKeys());

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.sprint = true;
      if (code === 'KeyC' || code === 'ControlLeft') {
        this.toggleTunneling();
      }
      if (code === 'KeyQ') {
        this.executeKineticShockwave();
      }
      if (code === 'Space') {
        this.keys.jump = true;
        this.onJump();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.sprint = false;
      if (code === 'Space') this.keys.jump = false;
    });

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'CANVAS') {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        this.camYaw -= dx * 0.005;
        this.camPitch = Math.max(0.05, Math.min(1.2, this.camPitch + dy * 0.005));
        prevX = e.clientX;
        prevY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  toggleTunneling() {
    if (gameState.hasSplice('s6')) {
      this.isTunneling = !this.isTunneling;
      soundEngine.playFootstep();
    }
  }

  executeKineticShockwave() {
    if (gameState.hasSplice('s8')) {
      soundEngine.playSampleAcquired();
      gameState.extractedResources.crystal += 3.0;
      gameState.extractedResources.organics += 3.0;
    }
  }

  onJump() {
    const isWater = physicsEngine.isUnderwater(this.position);

    if (isWater) {
      this.velocity.y = 5.0;
    } else if (this.isGrounded) {
      const gravityVal = gameState.getCurrentWorld().gravity;
      this.velocity.y = 8.5 * (1 / Math.sqrt(gravityVal));
      this.isGrounded = false;
      soundEngine.playFootstep();
    } else if (gameState.hasSplice('s3')) {
      this.isGliding = !this.isGliding;
      if (this.isGliding) {
        soundEngine.startGlideWind();
      } else {
        soundEngine.stopGlideWind();
      }
    }
  }

  update(deltaSeconds) {
    const world = gameState.getCurrentWorld();
    const equipped = gameState.getEquippedSplices();

    let targetSpeed = 7.0;
    let sprintBonus = 1.0;
    let hasGlow = gameState.hasSplice('s4');
    let hasGlide = gameState.hasSplice('s3');

    equipped.forEach(s => {
      if (s.statBonus) {
        if (s.statBonus.sprintSpeedBonus) sprintBonus += s.statBonus.sprintSpeedBonus;
        if (s.statBonus.landSpeed) targetSpeed *= s.statBonus.landSpeed;
      }
    });

    if (this.keys.sprint) targetSpeed *= (1.5 * sprintBonus);
    if (this.isTunneling) targetSpeed *= 1.4;

    if (hasGlow) {
      this.glowLight.intensity = 1.2;
    } else {
      this.glowLight.intensity = 0.0;
    }

    if (this.isGliding && hasGlide) {
      this.wings.material.opacity = 0.85;
    } else {
      this.wings.material.opacity = 0.0;
      this.isGliding = false;
    }

    // Directional input
    const moveInput = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveInput.z -= 1;
    if (this.keys.backward) moveInput.z += 1;
    if (this.keys.left) moveInput.x -= 1;
    if (this.keys.right) moveInput.x += 1;

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize();
      moveInput.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

      // Direct, crisp velocity response (zero drift when key released!)
      this.velocity.x = moveInput.x * targetSpeed;
      this.velocity.z = moveInput.z * targetSpeed;

      this.group.rotation.y = Math.atan2(moveInput.x, moveInput.z);
    } else {
      // Immediate full stop when no direction keys are pressed
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    this.position.x += this.velocity.x * deltaSeconds;
    this.position.z += this.velocity.z * deltaSeconds;

    let terrainHeight = this.worldEngine.getTerrainHeight(this.position.x, this.position.z);
    if (this.isTunneling) {
      terrainHeight -= 1.2;
    }

    const isWater = physicsEngine.isUnderwater(this.position);

    if (isWater) {
      if (this.keys.tunnel) this.velocity.y -= 4.0 * deltaSeconds;
      this.velocity.y *= 0.90;
    } else if (this.isGliding) {
      const updraft = physicsEngine.getThermalUpdraft(this.position);
      this.velocity.y = -1.2 + updraft;
    } else {
      const gravityAcc = physicsEngine.getGravity();
      this.velocity.y -= gravityAcc * deltaSeconds;
    }

    this.position.y += this.velocity.y * deltaSeconds;

    if (!isWater && this.position.y <= terrainHeight) {
      this.position.y = terrainHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
      if (this.isGliding) {
        this.isGliding = false;
        soundEngine.stopGlideWind();
      }
    } else if (!isWater) {
      this.isGrounded = false;
    }

    const cx = this.position.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDistance;
    const cy = this.position.y + Math.sin(this.camPitch) * this.camDistance + 1.2;
    const cz = this.position.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDistance;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.position.x, this.position.y + 1.2, this.position.z);
  }
}
