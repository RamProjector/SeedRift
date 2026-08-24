import * as THREE from 'three';

// Quadratic Bezier Curve for Natural Arc Foot Steps
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

// Procedural Leg Inverse Kinematics & World Space Foot Anchoring State Machine
export class ProceduralLegIK {
  constructor(legGroup, hipOffset, maxLegLength = 1.2) {
    this.legGroup = legGroup;
    this.hipOffset = hipOffset.clone();
    this.maxLegLength = maxLegLength;

    this.state = 'PLANTED'; // PLANTED, LIFTING, MOVING, PLANTING
    this.worldAnchor = new THREE.Vector3();
    this.stepStart = new THREE.Vector3();
    this.stepTarget = new THREE.Vector3();
    this.stepControlPoint = new THREE.Vector3();
    this.stepProgress = 0.0;
    this.stepDuration = 0.18; // 180ms step duration
  }

  initAnchor(bodyPos, bodyYaw, worldEngine) {
    const hipWorld = new THREE.Vector3().copy(this.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);
    const groundY = worldEngine ? worldEngine.getTerrainHeight(hipWorld.x, hipWorld.z) : bodyPos.y;
    this.worldAnchor.set(hipWorld.x, groundY, hipWorld.z);
    this.state = 'PLANTED';
  }

  triggerStep(targetWorldPos, stepHeight = 0.4) {
    if (this.state !== 'PLANTED') return;

    this.state = 'LIFTING';
    this.stepStart.copy(this.worldAnchor);
    this.stepTarget.copy(targetWorldPos);

    // Bezier Control Point P1 elevated above midpoint
    this.stepControlPoint.lerpVectors(this.stepStart, this.stepTarget, 0.5);
    this.stepControlPoint.y = Math.max(this.stepStart.y, this.stepTarget.y) + stepHeight;

    this.stepProgress = 0.0;
  }

  update(deltaSeconds, bodyPos, bodyYaw, worldEngine) {
    const hipWorld = new THREE.Vector3().copy(this.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);

    if (this.state === 'PLANTED') {
      // Lock leg foot strictly to WorldAnchor (Zero Moonwalking / Foot Sliding!)
      const footLocal = new THREE.Vector3().subVectors(this.worldAnchor, hipWorld);
      this.legGroup.position.copy(footLocal);

      // Clamp leg length constraint
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

      // Bezier Arc Step Interpolation
      const currentFootWorld = computeBezierStepArc(this.stepStart, this.stepControlPoint, this.stepTarget, this.stepProgress);
      const footLocal = new THREE.Vector3().subVectors(currentFootWorld, hipWorld);
      this.legGroup.position.copy(footLocal);

    } else if (this.state === 'PLANTING') {
      // Raycast down to terrain surface impact
      const groundY = worldEngine ? worldEngine.getTerrainHeight(this.stepTarget.x, this.stepTarget.z) : bodyPos.y;
      this.worldAnchor.set(this.stepTarget.x, groundY, this.stepTarget.z);

      const footLocal = new THREE.Vector3().subVectors(this.worldAnchor, hipWorld);
      this.legGroup.position.copy(footLocal);
      this.state = 'PLANTED';
    }
  }
}

// Central Gait Conductor (The Brain coordinating alternating leg steps)
export class GaitConductor {
  constructor(legs) {
    this.legs = legs; // Array of ProceduralLegIK
    this.activeLegIndex = 0;
    this.stepThreshold = 1.1; // Distance before triggering next step
  }

  init(bodyPos, bodyYaw, worldEngine) {
    this.legs.forEach(leg => leg.initAnchor(bodyPos, bodyYaw, worldEngine));
  }

  update(deltaSeconds, bodyPos, bodyYaw, isMoving, speed, worldEngine) {
    const activeLeg = this.legs[this.activeLegIndex];

    if (isMoving && activeLeg.state === 'PLANTED') {
      const hipWorld = new THREE.Vector3().copy(activeLeg.hipOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw).add(bodyPos);
      const distToAnchor = hipWorld.distanceTo(activeLeg.worldAnchor);

      if (distToAnchor > this.stepThreshold) {
        // Calculate step target lead position ahead of body velocity
        const leadDist = Math.min(1.8, speed * 0.25);
        const forwardDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), bodyYaw);
        const targetWorldPos = new THREE.Vector3().copy(hipWorld).addScaledVector(forwardDir, leadDist);
        targetWorldPos.y = worldEngine ? worldEngine.getTerrainHeight(targetWorldPos.x, targetWorldPos.z) : bodyPos.y;

        activeLeg.triggerStep(targetWorldPos, 0.45);

        // Advance conductor queue to alternate leg
        this.activeLegIndex = (this.activeLegIndex + 1) % this.legs.length;
      }
    }

    // Update all legs
    this.legs.forEach(leg => leg.update(deltaSeconds, bodyPos, bodyYaw, worldEngine));
  }
}
