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
      this.weatherTimer = 60 + Math.random() * 60;
    }

    const world = gameState.getCurrentWorld();

    if (this.worldEngine.particleSystem) {
      const pMat = this.worldEngine.particleSystem.material;
      if (pMat) {
        if (this.currentWeather === 'storm') {
          pMat.size = 0.6 + Math.sin(Date.now() * 0.005) * 0.2;
          pMat.opacity = 0.9;
        } else {
          pMat.size = 0.35 + Math.sin(Date.now() * 0.002) * 0.15;
          pMat.opacity = 0.6 + Math.cos(Date.now() * 0.003) * 0.2;
        }
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
