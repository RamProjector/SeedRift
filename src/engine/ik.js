import * as THREE from 'three';

export function computeBezierStepArc(p0, p1, p2, t) {
  const oneMinusT = 1.0 - t;
  const term0 = oneMinusT * oneMinusT;
  const term1 = 2.0 * oneMinusT * t;
  const term2 = t * t;

  return new THREE.Vector3(
    term0 * p0.x + term1 * p1.x + term2 * p2.x,
    term0 * p0.y + term1 * p1.y + term2 * p2.y,
    term0 * p0.z + term1 * p1.z + term2 * p2.z
  );
}

export class ProceduralLegIK {
  constructor(legGroup, hipOffset, maxLegLength = 1.2) {
    this.legGroup = legGroup;
    this.hipOffset = hipOffset.clone();
    this.maxLegLength = maxLegLength;

    this.state = 'PLANTED'; // PLANTED, LIFTING, MOVING, PLANTING, HOPPING
    this.worldAnchor = new THREE.Vector3();
    this.stepStart = new THREE.Vector3();
    this.stepTarget = new THREE.Vector3();
    this.stepControlPoint = new THREE.Vector3();
    this.stepProgress = 0.0;
    this.stepDuration = 0.18;
  }

  initAnchor(bodyPos, bodyYaw, worldEngine) {
    const hipWorld = new THREE.Vector3().copy(this.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);
    const groundY = worldEngine ? worldEngine.getTerrainHeight(hipWorld.x, hipWorld.z) : bodyPos.y;
    this.worldAnchor.set(hipWorld.x, groundY, hipWorld.z);
    this.state = 'PLANTED';
  }

  triggerStep(targetWorldPos, stepHeight = 0.45, duration = 0.18) {
    if (this.state !== 'PLANTED') return;

    this.state = 'LIFTING';
    this.stepDuration = duration;
    this.stepStart.copy(this.worldAnchor);
    this.stepTarget.copy(targetWorldPos);

    this.stepControlPoint.lerpVectors(this.stepStart, this.stepTarget, 0.5);
    this.stepControlPoint.y = Math.max(this.stepStart.y, this.stepTarget.y) + stepHeight;

    this.stepProgress = 0.0;
  }

  update(deltaSeconds, bodyPos, bodyYaw, worldEngine) {
    const hipWorld = new THREE.Vector3().copy(this.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);

    if (this.state === 'PLANTED') {
      const footLocal = new THREE.Vector3().subVectors(this.worldAnchor, hipWorld);
      this.legGroup.position.copy(footLocal);

      if (footLocal.length() > this.maxLegLength) {
        footLocal.normalize().multiplyScalar(this.maxLegLength);
        this.legGroup.position.copy(footLocal);
      }
    } else if (this.state === 'LIFTING' || this.state === 'MOVING') {
      this.stepProgress += deltaSeconds / this.stepDuration;

      if (this.stepProgress >= 1.0) {
        this.stepProgress = 1.0;
        this.state = 'PLANTING';
      } else {
        this.state = 'MOVING';
      }

      const currentFootWorld = computeBezierStepArc(this.stepStart, this.stepControlPoint, this.stepTarget, this.stepProgress);
      const footLocal = new THREE.Vector3().subVectors(currentFootWorld, hipWorld);
      this.legGroup.position.copy(footLocal);

    } else if (this.state === 'PLANTING') {
      const groundY = worldEngine ? worldEngine.getTerrainHeight(this.stepTarget.x, this.stepTarget.z) : bodyPos.y;
      this.worldAnchor.set(this.stepTarget.x, groundY, this.stepTarget.z);

      const footLocal = new THREE.Vector3().subVectors(this.worldAnchor, hipWorld);
      this.legGroup.position.copy(footLocal);
      this.state = 'PLANTED';
    }
  }
}

// Central Gait Conductor (Brain Decoupling Locomotion Velocity from Animation)
export class GaitConductor {
  constructor(legs) {
    this.legs = legs;
    this.activeLegIndex = 0;
    this.baseStepThreshold = 1.0;
    this.stability = 1.0; // Stability Index (1.0 = stable, 0.0 = staggered)
  }

  init(bodyPos, bodyYaw, worldEngine) {
    this.legs.forEach(leg => leg.initAnchor(bodyPos, bodyYaw, worldEngine));
  }

  update(deltaSeconds, bodyPos, bodyYaw, velocityMagnitude, speed, worldEngine) {
    // Decouple input from animation: Listen strictly to actual Velocity Magnitude!
    const isMoving = velocityMagnitude > 0.1;

    // Calculate GaitBlend (0.0 = Walk, 1.0 = Sprint)
    const walkSpeed = 3.0;
    const runSpeed = 10.0;
    const gaitBlend = THREE.MathUtils.clamp((speed - walkSpeed) / (runSpeed - walkSpeed), 0.0, 1.0);

    // Dynamic Step Threshold & Height scaling
    const currentThreshold = this.baseStepThreshold + (gaitBlend * 0.8);
    const currentStepHeight = 0.35 + (gaitBlend * 0.35);
    const currentStepDuration = 0.20 - (gaitBlend * 0.08); // Faster steps at sprint speed

    const activeLeg = this.legs[this.activeLegIndex];

    if (isMoving && activeLeg.state === 'PLANTED') {
      const hipWorld = new THREE.Vector3().copy(activeLeg.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);
      const distToAnchor = hipWorld.distanceTo(activeLeg.worldAnchor);

      if (distToAnchor > currentThreshold) {
        const leadDist = Math.min(2.2, speed * 0.25);
        const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw);
        const targetWorldPos = new THREE.Vector3().copy(hipWorld).addScaledVector(forwardDir, leadDist);
        targetWorldPos.y = worldEngine ? worldEngine.getTerrainHeight(targetWorldPos.x, targetWorldPos.z) : bodyPos.y;

        // Environmental Obstacle Hopping
        const obstacleAhead = worldEngine ? (worldEngine.getTerrainHeight(targetWorldPos.x, targetWorldPos.z) - bodyPos.y) : 0;
        const finalStepHeight = obstacleAhead > 0.5 ? currentStepHeight + 0.5 : currentStepHeight;

        activeLeg.triggerStep(targetWorldPos, finalStepHeight, currentStepDuration);

        this.activeLegIndex = (this.activeLegIndex + 1) % this.legs.length;
      }
    }

    this.legs.forEach(leg => leg.update(deltaSeconds, bodyPos, bodyYaw, worldEngine));
  }
}
