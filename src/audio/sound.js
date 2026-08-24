class SoundEngine {
  constructor() {
    this.ctx = null;
    this.scanOsc = null;
    this.scanGain = null;
    this.glideNoise = null;
    this.glideGain = null;
    this.ambientGain = null;
    this.ambientOsc = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playChirp() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  startScanHum() {
    if (!this.ctx || this.muted || this.scanOsc) return;
    this.resume();
    const now = this.ctx.currentTime;
    this.scanOsc = this.ctx.createOscillator();
    this.scanGain = this.ctx.createGain();

    this.scanOsc.type = 'sine';
    this.scanOsc.frequency.setValueAtTime(380, now);

    // Add gentle LFO vibrato
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 6; // 6Hz pulse
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 15;
    lfo.connect(this.scanOsc.frequency);
    lfo.start();

    this.scanGain.gain.setValueAtTime(0.01, now);
    this.scanGain.gain.linearRampToValueAtTime(0.08, now + 0.2);

    this.scanOsc.connect(this.scanGain);
    this.scanGain.connect(this.ctx.destination);
    this.scanOsc.start();
  }

  stopScanHum() {
    if (!this.ctx || !this.scanOsc) return;
    const now = this.ctx.currentTime;
    if (this.scanGain) {
      this.scanGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    }
    setTimeout(() => {
      if (this.scanOsc) {
        try { this.scanOsc.stop(); } catch(e){}
        this.scanOsc = null;
        this.scanGain = null;
      }
    }, 160);
  }

  playSampleAcquired() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  playWeaveToggle(equipped) {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const targetFreq = equipped ? 880 : 330;
    osc.frequency.setValueAtTime(equipped ? 440 : 550, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playWarning() {
    if (!this.ctx || this.muted) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playFootstep() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  startGlideWind() {
    if (!this.ctx || this.muted || this.glideNoise) return;
    this.resume();
    const bufferSize = this.ctx.sampleRate * 1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.glideNoise = this.ctx.createBufferSource();
    this.glideNoise.buffer = buffer;
    this.glideNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 3.0;

    this.glideGain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    this.glideGain.gain.setValueAtTime(0.01, now);
    this.glideGain.gain.linearRampToValueAtTime(0.07, now + 0.3);

    this.glideNoise.connect(filter);
    filter.connect(this.glideGain);
    this.glideGain.connect(this.ctx.destination);

    this.glideNoise.start();
  }

  stopGlideWind() {
    if (!this.ctx || !this.glideNoise) return;
    const now = this.ctx.currentTime;
    if (this.glideGain) {
      this.glideGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
    }
    setTimeout(() => {
      if (this.glideNoise) {
        try { this.glideNoise.stop(); } catch(e){}
        this.glideNoise = null;
        this.glideGain = null;
      }
    }, 220);
  }
}

export const soundEngine = new SoundEngine();
