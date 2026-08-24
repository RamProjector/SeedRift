import * as THREE from 'three';
import { gameState } from '../systems/state.js';
import { soundEngine } from '../audio/sound.js';
import { physicsEngine } from './physics.js';
import { collisionEngine } from './collision.js';

export class PlayerController {
  constructor(scene, camera, worldEngine) {
    this.scene = scene;
    this.camera = camera;
    this.worldEngine = worldEngine;

    // FOV 75 degrees for panoramic open-world exploration
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();

    this.group = new THREE.Group();

    const suitMat = new THREE.MeshStandardMaterial({
      color: '#2e7a5c',
      roughness: 0.25,
      metalness: 0.7,
      emissive: '#134030',
      emissiveIntensity: 0.2
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: '#88cca8',
      roughness: 0.2,
      metalness: 0.9
    });

    const glowCoreMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 1.5,
      roughness: 0.1
    });

    // Torso
    const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.85, 8, 16);
    this.torso = new THREE.Mesh(torsoGeo, suitMat);
    this.torso.position.y = 0.85;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Chest Core
    const coreGeo = new THREE.OctahedronGeometry(0.12);
    const core = new THREE.Mesh(coreGeo, glowCoreMat);
    core.position.set(0, 1.05, 0.38);
    this.group.add(core);

    // Visor
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    this.head = new THREE.Mesh(headGeo, glowCoreMat);
    this.head.position.set(0, 1.48, 0.05);
    this.group.add(this.head);

    // Thruster Pack
    const packGeo = new THREE.BoxGeometry(0.42, 0.65, 0.28);
    const pack = new THREE.Mesh(packGeo, trimMat);
    pack.position.set(0, 0.95, -0.28);
    this.group.add(pack);

    // Wings
    const wingGeo = new THREE.PlaneGeometry(1.6, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: '#5fe6b4',
      emissive: '#5fe6b4',
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.wings = new THREE.Mesh(wingGeo, wingMat);
    this.wings.position.set(0, 1.0, -0.32);
    this.wings.rotation.x = Math.PI / 4;
    this.group.add(this.wings);

    // Arms & Thighs
    this.armL = new THREE.Group();
    const armGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.6);
    const armLMesh = new THREE.Mesh(armGeo, suitMat);
    armLMesh.position.y = -0.3;
    this.armL.add(armLMesh);
    this.armL.position.set(0.44, 1.15, 0);
    this.group.add(this.armL);

    this.armR = new THREE.Group();
    const armRMesh = new THREE.Mesh(armGeo, suitMat);
    armRMesh.position.y = -0.3;
    this.armR.add(armRMesh);
    this.armR.position.set(-0.44, 1.15, 0);
    this.group.add(this.armR);

    // Legs
    this.legL = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.1, 0.07, 0.65);
    const legLMesh = new THREE.Mesh(legGeo, suitMat);
    legLMesh.position.y = -0.32;
    this.legL.add(legLMesh);
    this.legL.position.set(0.18, 0.45, 0);
    this.group.add(this.legL);

    this.legR = new THREE.Group();
    const legRMesh = new THREE.Mesh(legGeo, suitMat);
    legRMesh.position.y = -0.32;
    this.legR.add(legRMesh);
    this.legR.position.set(-0.18, 0.45, 0);
    this.group.add(this.legR);

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
    this.isFirstPerson = false;
    this.animTime = 0;

    // Camera Orbit & Spring Arm
    this.camYaw = 0;
    this.camPitch = 0.2;
    this.maxCamDistance = 5.8;
    this.currentCamDistance = 5.8;
    this.shoulderOffset = 1.2;

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
      if (code === 'KeyV') {
        this.toggleFirstPerson();
      }
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
        this.camPitch = Math.max(-1.3, Math.min(1.4, this.camPitch + dy * 0.005));
        prevX = e.clientX;
        prevY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  toggleFirstPerson() {
    this.isFirstPerson = !this.isFirstPerson;
    this.group.visible = !this.isFirstPerson;
    soundEngine.playChirp();
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

  update(deltaSeconds, colliders = []) {
    this.animTime += deltaSeconds;
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

    const moveInput = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveInput.z -= 1;
    if (this.keys.backward) moveInput.z += 1;
    if (this.keys.left) moveInput.x -= 1;
    if (this.keys.right) moveInput.x += 1;

    let isMoving = false;

    if (moveInput.lengthSq() > 0) {
      isMoving = true;
      moveInput.normalize();
      moveInput.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

      this.velocity.x = moveInput.x * targetSpeed;
      this.velocity.z = moveInput.z * targetSpeed;

      this.group.rotation.y = Math.atan2(moveInput.x, moveInput.z);
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    this.position.x += this.velocity.x * deltaSeconds;
    this.position.z += this.velocity.z * deltaSeconds;

    collisionEngine.resolveCollisions(this.position, colliders);

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

    // 4-Pose Fundamental Walk Cycle Animation Mechanics (Contact, Down, Passing, Up)
    if (this.armL && this.armR && this.legL && this.legR) {
      const freq = this.keys.sprint ? 14.0 : 9.0;
      const walkPhase = (this.animTime * freq) % (Math.PI * 2);

      // Contact Pose (phase = 0 or PI): Stride extension
      const strideAngle = Math.sin(walkPhase) * (isMoving ? 0.65 : 0.04);

      // Down & Up Poses (phase = PI/4 or 3PI/4): Body weight absorption dip & push-off rise
      const verticalWeightDip = Math.sin(walkPhase * 2.0) * (isMoving ? 0.06 : 0.01);

      if (this.torso) {
        this.torso.position.y = 0.85 + verticalWeightDip;
      }

      if (this.isGliding) {
        this.armL.rotation.z = -1.2;
        this.armR.rotation.z = 1.2;
        this.legL.rotation.x = 0.3;
        this.legR.rotation.x = 0.3;
      } else {
        this.armL.rotation.z = 0;
        this.armR.rotation.z = 0;
        this.armL.rotation.x = strideAngle;
        this.armR.rotation.x = -strideAngle;
        this.legL.rotation.x = -strideAngle;
        this.legR.rotation.x = strideAngle;
      }

      if (this.head) {
        this.head.position.y = 1.48 + verticalWeightDip + Math.sin(this.animTime * 4.0) * 0.02;
      }
    }

    // Camera Mode Positioning with Spring Arm Collision Detection
    if (this.isFirstPerson) {
      this.camera.position.set(this.position.x, this.position.y + 1.5, this.position.z);
      const lookTarget = new THREE.Vector3(
        this.position.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * 10,
        this.position.y + 1.5 - Math.sin(this.camPitch) * 10,
        this.position.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * 10
      );
      this.camera.lookAt(lookTarget);
    } else {
      const rightVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

      // Ideal Camera Target
      const targetCamX = this.position.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.maxCamDistance + rightVector.x * this.shoulderOffset;
      const targetCamY = this.position.y + Math.sin(this.camPitch) * this.maxCamDistance + 1.3;
      const targetCamZ = this.position.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.maxCamDistance + rightVector.z * this.shoulderOffset;

      // Spring Arm Terrain Raycast: Prevent Camera Clipping through Mountains
      const camTerrainY = this.worldEngine.getTerrainHeight(targetCamX, targetCamZ);
      const effectiveY = Math.max(camTerrainY + 0.6, targetCamY);

      this.camera.position.set(targetCamX, effectiveY, targetCamZ);
      const lookTarget = new THREE.Vector3(
        this.position.x + rightVector.x * (this.shoulderOffset * 0.3),
        this.position.y + 1.3,
        this.position.z + rightVector.z * (this.shoulderOffset * 0.3)
      );
      this.camera.lookAt(lookTarget);
    }
  }
}
