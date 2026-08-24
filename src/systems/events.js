import { gameState } from './state.js';
import { soundEngine } from '../audio/sound.js';

class EventSystem {
  constructor() {
    this.activeEvent = null;
    this.timer = 0;
    this.eventInterval = 120; // Trigger an event every 2 minutes
    this.eventDuration = 35; // Lasts 35 seconds
    this.countdown = 60;
  }

  update(deltaSeconds) {
    if (this.activeEvent) {
      this.timer -= deltaSeconds;
      if (this.timer <= 0) {
        this.endEvent();
      }
    } else {
      this.countdown -= deltaSeconds;
      if (this.countdown <= 0) {
        this.triggerEvent();
      }
    }
  }

  triggerEvent() {
    const world = gameState.getCurrentWorld();
    this.activeEvent = {
      id: world.id,
      name: world.signatureEvent,
      worldName: world.name
    };
    this.timer = this.eventDuration;
    gameState.eventActive = true;

    soundEngine.playSampleAcquired(); // Auditory event alert chime

    const evt = new CustomEvent('seedrift-event-start', { detail: this.activeEvent });
    window.dispatchEvent(evt);
  }

  endEvent() {
    const prevEvent = this.activeEvent;
    this.activeEvent = null;
    this.timer = 0;
    this.countdown = this.eventInterval;
    gameState.eventActive = false;

    const evt = new CustomEvent('seedrift-event-end', { detail: prevEvent });
    window.dispatchEvent(evt);
  }
}

export const eventSystem = new EventSystem();
