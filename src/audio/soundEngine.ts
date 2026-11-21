// Cozy procedural Web Audio API sound effects & gentle music box synthesizer

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMusicBox();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playDoor() {
    this.playTone(392, 0.14, 'triangle', 0.08, 0);
    this.playTone(523.25, 0.22, 'sine', 0.09, 0.09);
  }

  playBell(high = false) {
    const base = high ? 783.99 : 523.25;
    this.playTone(base, 0.65, 'sine', 0.11, 0);
    this.playTone(base * 1.5, 0.45, 'triangle', 0.05, 0.02);
  }

  playSparkle() {
    this.playTone(659.25, 0.12, 'sine', 0.06, 0);
    this.playTone(880, 0.15, 'sine', 0.06, 0.06);
    this.playTone(1046.5, 0.22, 'sine', 0.06, 0.12);
  }

  playHeart() {
    this.playTone(523.25, 0.15, 'sine', 0.07, 0);
    this.playTone(659.25, 0.22, 'sine', 0.08, 0.08);
  }

  playSplash() {
    this.playTone(280, 0.09, 'triangle', 0.06, 0);
    this.playTone(420, 0.12, 'sine', 0.06, 0.05);
  }

  playUnlock() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this.playTone(n, 0.35, 'triangle', 0.09, i * 0.09));
  }

  startMusicBox() {
    if (this.musicTimer || this.muted) return;
    // Gentle pentatonic lullaby arpeggio (C major 9 / F major 7 feel)
    const melody = [
      523.25, 659.25, 783.99, 987.77, 783.99, 659.25,
      440.0, 523.25, 659.25, 783.99, 659.25, 523.25,
      349.23, 440.0, 523.25, 659.25, 523.25, 440.0,
      392.0, 493.88, 587.33, 783.99, 587.33, 493.88,
    ];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const freq = melody[this.noteIndex % melody.length];
      this.playTone(freq, 0.48, 'sine', 0.035, 0);
      this.noteIndex++;
    }, 460);
  }

  stopMusicBox() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
