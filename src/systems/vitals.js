import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

class VitalsSystem {
  constructor() {
    this.criticalVignette = null;
    this.lastWarningSound = 0;
  }

  update(deltaSeconds) {
    const world = gameState.getCurrentWorld();
    const vitals = gameState.vitals;
    const equipped = gameState.getEquippedSplices();

    // Check equipped splice modifiers
    let coldResist = 0;
    let heatResist = 0;
    let sporeResist = 0;
    let radResist = 0;
    let pressureResist = 0;
    let healthRegen = 0;
    let hydrationDrainMult = 1.0;
    let radRecharge = false;

    equipped.forEach(s => {
      if (s.statBonus) {
        if (s.statBonus.coldResist) coldResist += s.statBonus.coldResist;
        if (s.statBonus.heatResist) heatResist += s.statBonus.heatResist;
        if (s.statBonus.toxinResist) sporeResist += s.statBonus.toxinResist;
        if (s.statBonus.radResist) radResist += s.statBonus.radResist;
        if (s.statBonus.pressureResist) pressureResist += s.statBonus.pressureResist;
        if (s.statBonus.healthRegen) healthRegen += s.statBonus.healthRegen;
        if (s.statBonus.hydrationDrain) hydrationDrainMult *= s.statBonus.hydrationDrain;
        if (s.statBonus.radBatteryRecharge) radRecharge = true;
      }
    });

    // 1. Hydration drain
    vitals.hydration = Math.max(0, vitals.hydration - (0.5 * hydrationDrainMult * deltaSeconds));

    // 2. Temperature simulation
    let targetTemp = 37.0; // standard body temp
    if (world.hazards.heat > 0) {
      const netHeat = Math.max(0, world.hazards.heat - heatResist);
      targetTemp = 37.0 + (netHeat * 25.0); // e.g. 62°C in lava biomes
    } else if (world.hazards.cold > 0) {
      const netCold = Math.max(0, world.hazards.cold - coldResist);
      targetTemp = 37.0 - (netCold * 40.0); // e.g. -3°C in ice biomes
    }
    // Smooth transition
    vitals.temp += (targetTemp - vitals.temp) * Math.min(1.0, deltaSeconds * 0.5);

    // 3. Atmosphere / Spore hazard
    if (world.hazards.spores > 0) {
      const netSpores = Math.max(0, world.hazards.spores - sporeResist);
      if (netSpores > 0) {
        vitals.atmosphere = Math.max(0, vitals.atmosphere - (netSpores * 6.0 * deltaSeconds));
      } else {
        vitals.atmosphere = Math.min(100, vitals.atmosphere + (10.0 * deltaSeconds));
      }
    } else {
      vitals.atmosphere = Math.min(100, vitals.atmosphere + (10.0 * deltaSeconds));
    }

    // 4. Radiation hazard
    if (world.hazards.radiation > 0) {
      const netRad = Math.max(0, world.hazards.radiation - radResist);
      if (netRad > 0) {
        vitals.radiation = Math.min(100, vitals.radiation + (netRad * 8.0 * deltaSeconds));
      } else {
        vitals.radiation = Math.max(0, vitals.radiation - (5.0 * deltaSeconds));
      }
      if (radRecharge && world.hazards.radiation > 0) {
        vitals.battery = Math.min(100, vitals.battery + (15.0 * deltaSeconds));
      }
    } else {
      vitals.radiation = Math.max(0, vitals.radiation - (5.0 * deltaSeconds));
    }

    // 5. Pressure hazard
    if (world.hazards.pressure > 0) {
      const netPress = Math.max(0, world.hazards.pressure - pressureResist);
      vitals.pressure = 1.0 + (netPress * 50.0);
    } else {
      vitals.pressure = 1.0;
    }

    // 6. Health & Damage calculation
    let totalDamage = 0;
    // Temp extremes
    if (vitals.temp > 45.0 || vitals.temp < 10.0) totalDamage += 4.0;
    // Low oxygen / spores
    if (vitals.atmosphere < 20) totalDamage += 6.0;
    // High radiation
    if (vitals.radiation > 70) totalDamage += 5.0;
    // Extreme pressure without sac
    if (vitals.pressure > 15) totalDamage += 8.0;
    // Dehydration
    if (vitals.hydration <= 0) totalDamage += 3.0;

    if (totalDamage > 0) {
      vitals.health = Math.max(0, vitals.health - (totalDamage * deltaSeconds));
      const now = Date.now();
      if (now - this.lastWarningSound > 2500) {
        soundEngine.playWarning();
        this.lastWarningSound = now;
      }
    } else if (healthRegen > 0 && vitals.hydration > 10) {
      vitals.health = Math.min(vitals.maxHealth, vitals.health + (healthRegen * deltaSeconds));
    }

    // Battery slow passive regen when safe
    vitals.battery = Math.min(100, vitals.battery + (0.5 * deltaSeconds));

    // Check emergency teleport/respawn
    if (vitals.health <= 0) {
      this.respawn();
    }
  }

  respawn() {
    gameState.vitals.health = 100;
    gameState.vitals.hydration = 100;
    gameState.vitals.atmosphere = 100;
    gameState.vitals.radiation = 0;
    gameState.vitals.temp = 37.0;

    // Show respawn alert notification
    const evt = new CustomEvent('seedrift-respawn', { detail: { msg: 'Vitals collapsed! Emergency suit recall activated. Returned to Drop Pod.' } });
    window.dispatchEvent(evt);
  }
}

export const vitalsSystem = new VitalsSystem();
