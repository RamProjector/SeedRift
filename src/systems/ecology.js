import { SPECIES_BY_WORLD } from '../data/speciesData.js';
import { gameState } from './state.js';

class EcologySimulation {
  constructor() {
    this.regionPopulations = {}; // { worldId: { speciesId: count } }
    this.tickTimer = 0;
  }

  init() {
    // Initialize species baseline populations per world
    Object.keys(SPECIES_BY_WORLD).forEach(worldId => {
      this.regionPopulations[worldId] = {};
      const speciesList = SPECIES_BY_WORLD[worldId];

      speciesList.forEach(s => {
        const capacity = s.population?.carryingCapacity ? Object.values(s.population.carryingCapacity)[0] : 800;
        // Start near 60-80% of carrying capacity
        this.regionPopulations[worldId][s.id] = Math.floor(capacity * (0.6 + Math.random() * 0.2));
      });
    });
  }

  update(deltaSeconds) {
    this.tickTimer += deltaSeconds;
    // Slow tick: run Lotka-Volterra predator-prey math every 5 seconds (simulating 1 in-game hour)
    if (this.tickTimer >= 5.0) {
      this.tickTimer = 0;
      this.simulateTick();
    }
  }

  simulateTick() {
    const worldId = gameState.currentWorldId;
    const speciesList = SPECIES_BY_WORLD[worldId] || [];
    const pops = this.regionPopulations[worldId];
    if (!pops) return;

    const season = gameState.season.toLowerCase();

    speciesList.forEach(s => {
      const currentPop = pops[s.id] || 200;
      const baseGrowth = s.population?.baseGrowthRate || 0.02;
      const seasonalMod = s.population?.seasonalModifiers?.[season] || 1.0;
      const carryingCap = s.population?.carryingCapacity ? Object.values(s.population.carryingCapacity)[0] : 1000;

      // Event modifier
      let eventMod = 1.0;
      if (gameState.eventActive) {
        eventMod = 1.8; // Population blooms during signature events
      }

      const trophic = s.ecology?.trophicLevel || 'producer';

      if (trophic === 'producer') {
        // Logistic growth for producers
        const delta = baseGrowth * seasonalMod * eventMod * currentPop * (1 - currentPop / carryingCap);
        pops[s.id] = Math.max(s.population?.mvp || 50, Math.floor(currentPop + delta));
      } else if (trophic === 'primary' || trophic === 'herbivore' || trophic === 'consumer') {
        // Herbivore growth dependent on producer abundance
        const delta = (baseGrowth * 1.2 * seasonalMod * currentPop * (1 - currentPop / carryingCap)) - (currentPop * 0.01);
        pops[s.id] = Math.max(s.population?.mvp || 30, Math.floor(currentPop + delta));
      } else {
        // Predator growth dependent on prey
        const delta = (baseGrowth * 0.8 * seasonalMod * currentPop * (1 - currentPop / carryingCap));
        pops[s.id] = Math.max(s.population?.mvp || 15, Math.floor(currentPop + delta));
      }
    });
  }

  getPopulation(speciesId) {
    const wId = gameState.currentWorldId;
    return this.regionPopulations[wId]?.[speciesId] || 100;
  }
}

export const ecologySim = new EcologySimulation();
