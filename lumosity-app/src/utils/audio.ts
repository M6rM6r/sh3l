// Web Audio API based sound system
// No external files needed - generates sounds programmatically

interface WindowWithWebkitAudio extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const MUTE_KEY = 'Ygy_mute';
const AMBIENT_KEY = 'Ygy_ambient';

// Pentatonic scale (Hz) — C major pentatonic
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

class AudioManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientActive = false;
  private ambientGain: GainNode | null = null;
  private ambientTimeoutId: ReturnType<typeof setTimeout> | null = null;
  isAmbientEnabled: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem(MUTE_KEY) === 'true';
    this.isAmbientEnabled = localStorage.getItem(AMBIENT_KEY) === 'true';
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const win = window as WindowWithWebkitAudio;
      this.audioContext = new (win.AudioContext || win.webkitAudioContext || AudioContext)();
    }
    return this.audioContext;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem(MUTE_KEY, String(muted));
    if (muted) this.stopAmbient();
  }

  isAudioMuted(): boolean {
    return this.isMuted;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // silent fail
    }
  }

  private playChord(frequencies: number[], duration: number): void {
    if (this.isMuted) return;
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, duration), i * 50);
    });
  }

  // ── Ambient Music ─────────────────────────────────────────────────────────

  private scheduleAmbientNote(pattern: number[], startTime: number): void {
    if (!this.ambientActive || !this.ambientGain) return;
    const ctx = this.getAudioContext();

    pattern.forEach((noteIdx, i) => {
      const freq = PENTATONIC[noteIdx % PENTATONIC.length];
      const t = startTime + i * 0.55;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      osc.connect(filter);
      filter.connect(gain);
      const ambientGain = this.ambientGain;
      if (!ambientGain) return;
      gain.connect(ambientGain);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc.start(t);
      osc.stop(t + 1.0);
    });

    const patternDurationMs = (pattern.length * 0.55 + 1.2) * 1000;
    this.ambientTimeoutId = setTimeout(() => {
      const nextPattern = AMBIENT_PATTERNS[Math.floor(Math.random() * AMBIENT_PATTERNS.length)];
      const nextStart = ctx.currentTime + 0.1;
      this.scheduleAmbientNote(nextPattern, nextStart);
    }, patternDurationMs);
  }

  startAmbient(): void {
    if (this.isMuted || this.ambientActive) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      this.ambientActive = true;
      this.isAmbientEnabled = true;
      localStorage.setItem(AMBIENT_KEY, 'true');

      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0, ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);
      if (this.ambientGain) {
        this.ambientGain.connect(ctx.destination);
      }

      const pattern = AMBIENT_PATTERNS[0];
      this.scheduleAmbientNote(pattern, ctx.currentTime + 0.5);
    } catch {
      // silent fail
    }
  }

  stopAmbient(): void {
    this.ambientActive = false;
    this.isAmbientEnabled = false;
    localStorage.setItem(AMBIENT_KEY, 'false');
    if (this.ambientTimeoutId) {
      clearTimeout(this.ambientTimeoutId);
      this.ambientTimeoutId = null;
    }
    if (this.ambientGain) {
      try {
        const ctx = this.getAudioContext();
        this.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      } catch { /* ignore */ }
      setTimeout(() => { this.ambientGain = null; }, 1600);
    }
  }

  toggleAmbient(): boolean {
    if (this.ambientActive) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  // ── Sound Effects ─────────────────────────────────────────────────────────

  playClick(): void {
    this.playTone(800, 0.05, 'sine');
  }

  playCorrect(): void {
    this.playChord([523.25, 659.25, 783.99], 0.3);
  }

  playWrong(): void {
    this.playTone(200, 0.3, 'sawtooth');
  }

  playGameStart(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // silent fail
    }
  }

  playGameOver(): void {
    this.playTone(523.25, 0.2);
    setTimeout(() => this.playTone(440, 0.2), 150);
    setTimeout(() => this.playTone(349.23, 0.4), 300);
  }

  playLevelUp(): void {
    this.playChord([523.25, 659.25, 783.99, 1046.5], 0.5);
  }

  playStreak(streak: number): void {
    const baseFreq = 440 + (streak * 50);
    this.playTone(Math.min(baseFreq, 1200), 0.15);
  }

  playAchievement(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3), i * 100);
    });
  }

  playMatch(): void {
    this.playTone(600, 0.1);
  }

  playNoMatch(): void {
    this.playTone(300, 0.1);
  }

  playTilePress(): void {
    this.playTone(1000, 0.03, 'triangle');
  }

  playButtonHover(): void {
    this.playTone(1200, 0.02, 'sine', 0.06);
  }

  playCardSelect(): void {
    if (this.isMuted) return;
    // Upward sparkle arpeggio
    [880, 1046.5, 1318.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'triangle', 0.15), i * 40);
    });
  }

  playComboBreak(): void {
    this.playTone(180, 0.4, 'sawtooth', 0.2);
  }

  playCombo(n: number): void {
    const freq = 440 + n * 80;
    this.playChord([freq, freq * 1.25, freq * 1.5], 0.2);
  }

  playCountdown(): void {
    this.playTone(660, 0.1, 'square', 0.25);
  }

  initAudio(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.isAmbientEnabled && !this.ambientActive) {
      this.startAmbient();
    }
  }
}

// Ambient note patterns (indices into PENTATONIC scale)
const AMBIENT_PATTERNS: number[][] = [
  [0, 2, 4, 5, 4, 2, 1, 0],
  [0, 1, 3, 5, 6, 5, 3, 1],
  [2, 4, 5, 7, 5, 4, 2, 0],
  [0, 3, 5, 6, 5, 3, 1, 0],
  [1, 2, 4, 6, 7, 6, 4, 2],
];

export const audioManager = new AudioManager();

export const useAudio = () => {
  return {
    playClick: () => audioManager.playClick(),
    playCorrect: () => audioManager.playCorrect(),
    playWrong: () => audioManager.playWrong(),
    playGameStart: () => audioManager.playGameStart(),
    playGameOver: () => audioManager.playGameOver(),
    playLevelUp: () => audioManager.playLevelUp(),
    playStreak: (s: number) => audioManager.playStreak(s),
    playAchievement: () => audioManager.playAchievement(),
    playMatch: () => audioManager.playMatch(),
    playNoMatch: () => audioManager.playNoMatch(),
    playTilePress: () => audioManager.playTilePress(),
    playButtonHover: () => audioManager.playButtonHover(),
    playCardSelect: () => audioManager.playCardSelect(),
    playCombo: (n: number) => audioManager.playCombo(n),
    playCountdown: () => audioManager.playCountdown(),
    isMuted: audioManager.isAudioMuted(),
    isAmbient: audioManager.isAmbientEnabled,
    setMuted: (m: boolean) => audioManager.setMuted(m),
    toggleAmbient: () => audioManager.toggleAmbient(),
    initAudio: () => audioManager.initAudio(),
  };
};




