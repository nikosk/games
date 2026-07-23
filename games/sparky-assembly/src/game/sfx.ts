/**
 * Tiny procedural sound helper built directly on the Web Audio API, so the game
 * ships with zero audio asset files. Everything is synthesised on the fly.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  /** Lazily create the audio context on the first user gesture. */
  unlock(): void {
    if (this.ctx !== null) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined = window.AudioContext;
    if (Ctor === undefined) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  private tone(
    freq: number,
    duration: number,
    kind: OscillatorType,
    volume = 0.18,
    glideTo?: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!this.enabled || ctx === null || master === null) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  move(): void {
    this.tone(260, 0.12, 'square', 0.16);
  }

  turn(): void {
    this.tone(520, 0.13, 'sine', 0.14, 740);
  }

  grab(): void {
    this.tone(180, 0.06, 'square', 0.18);
    this.tone(360, 0.12, 'sine', 0.14, undefined, 0.04);
  }

  place(): void {
    this.tone(640, 0.05, 'sine', 0.12);
  }

  step(): void {
    this.tone(720, 0.05, 'sine', 0.09);
  }

  blocked(): void {
    this.tone(150, 0.16, 'sawtooth', 0.16);
  }

  success(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => this.tone(freq, 0.2, 'sine', 0.18, undefined, index * 0.11));
  }
}