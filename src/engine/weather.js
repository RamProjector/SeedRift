import * as THREE from 'three';
import { gameState } from '../systems/state.js';

export class WeatherSystem {
  constructor(worldEngine) {
    this.worldEngine = worldEngine;
    this.currentWeather = 'clear';
    this.intensity = 0.5;
    this.weatherTimer = 45;
  }

  update(deltaSeconds) {
    this.weatherTimer -= deltaSeconds;
    if (this.weatherTimer <= 0) {
      this.shiftWeather();
      this.weatherTimer = 60 + Math.random() * 60; // Shift weather every 1-2 mins
    }

    const world = gameState.getCurrentWorld();

    // Modulate particle system based on active weather intensity
    if (this.worldEngine.particleSystem) {
      const pMat = this.worldEngine.particleSystem.material;
      if (pMat) {
        pMat.size = 0.35 + Math.sin(Date.now() * 0.002) * 0.15;
        pMat.opacity = 0.6 + Math.cos(Date.now() * 0.003) * 0.2;
      }
    }
  }

  shiftWeather() {
    const world = gameState.getCurrentWorld();
    const weathers = ['clear', 'fog', 'storm'];
    this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
    this.intensity = 0.4 + Math.random() * 0.6;

    const evt = new CustomEvent('seedrift-weather-change', {
      detail: {
        world: world.name,
        weather: this.currentWeather,
        intensity: this.intensity
      }
    });
    window.dispatchEvent(evt);
  }
}
