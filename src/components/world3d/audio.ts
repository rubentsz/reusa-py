/**
 * Lightweight zero-dependency Web Audio synthesizer for ReUsa Vice City 3D.
 * Starts muted by default; activates cleanly on user toggle.
 */
export class ViceAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;

  // Continuous ambient nodes
  private oceanGain: GainNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private lastStepTime = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.setupContinuousNodes(this.ctx);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupContinuousNodes(ctx: AudioContext) {
    // 1. Filtered pink-ish noise buffer for soft tropical ocean waves
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.45;
    }

    const oceanSource = ctx.createBufferSource();
    oceanSource.buffer = buffer;
    oceanSource.loop = true;

    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.value = 340;

    const oceanGain = ctx.createGain();
    oceanGain.gain.value = 0;

    oceanSource.connect(oceanFilter);
    oceanFilter.connect(oceanGain);
    oceanGain.connect(ctx.destination);
    oceanSource.start();

    this.oceanFilter = oceanFilter;
    this.oceanGain = oceanGain;

    // 2. Smooth low retro V8 engine hum while driving
    const engineOsc = ctx.createOscillator();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 55;

    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 180;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();

    this.engineOsc = engineOsc;
    this.engineGain = engineGain;
  }

  setEnabled(next: boolean) {
    this.enabled = next;
    if (next) {
      this.ensureContext();
      this.playClick();
    } else if (this.ctx) {
      const now = this.ctx.currentTime;
      this.oceanGain?.gain.setTargetAtTime(0, now, 0.12);
      this.engineGain?.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  updateContinuous(params: {
    time: number;
    playerZ: number;
    isInside: boolean;
    isDriving: boolean;
    carSpeed: number;
    walkSpeed: number;
    isGrounded: boolean;
  }) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Ocean surf rises naturally as you walk toward the beach & pier (z < -30)
    if (this.oceanGain && this.oceanFilter) {
      const beachProximity = params.isInside
        ? 0
        : Math.max(0, Math.min(1, (-32 - params.playerZ) / 55));
      const swell = 0.65 + 0.35 * Math.sin(params.time * 0.85);
      this.oceanGain.gain.setTargetAtTime(beachProximity * 0.14 * swell, now, 0.25);
      this.oceanFilter.frequency.setTargetAtTime(240 + 220 * swell, now, 0.25);
    }

    // Engine hum pitch & volume tracks driving speed
    if (this.engineOsc && this.engineGain) {
      if (params.isDriving) {
        const absSpd = Math.abs(params.carSpeed);
        const freq = 48 + absSpd * 4.2;
        const vol = 0.028 + Math.min(0.045, absSpd * 0.0022);
        this.engineOsc.frequency.setTargetAtTime(freq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }

    // Subtle soft footsteps when walking/sprinting on ground
    if (!params.isDriving && params.isGrounded && params.walkSpeed > 0.5) {
      const stepInterval = params.walkSpeed > 9 ? 0.28 : 0.42;
      if (params.time - this.lastStepTime > stepInterval) {
        this.lastStepTime = params.time;
        this.playFootstep(params.isInside);
      }
    }
  }

  private playFootstep(inside: boolean) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(inside ? 165 : 115, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.045);
    gain.gain.setValueAtTime(0.022, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    gain.connect(ctx.destination);
    for (const freq of [370, 466]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  }

  playDoorChime() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.045, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.25);
    });
  }

  playClick() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.06);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
