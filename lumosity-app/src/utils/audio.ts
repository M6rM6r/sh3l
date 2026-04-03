// Web Audio API based sound system
// No external files needed - generates sounds programmatically

interface WindowWithWebkitAudio extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

const MUTE_KEY = 'lumosity_mute';

class AudioManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem(MUTE_KEY) === 'true';
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
  }

  isAudioMuted(): boolean {
    return this.isMuted;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (this.isMuted) return;
    
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio play failed silently - non-critical
    }
  }

  private playChord(frequencies: number[], duration: number): void {
    if (this.isMuted) return;
    
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, duration), i * 50);
    });
  }

  // Sound effects
  playClick(): void {
    this.playTone(800, 0.05, 'sine');
  }

  playCorrect(): void {
    // Pleasant chime
    this.playChord([523.25, 659.25, 783.99], 0.3);
  }

  playWrong(): void {
    // Low buzz
    this.playTone(200, 0.3, 'sawtooth');
  }

  playGameStart(): void {
    // Whoosh up
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
      // Audio play failed silently - non-critical
    }
  }

  playGameOver(): void {
    // Descending notes
    this.playTone(523.25, 0.2);
    setTimeout(() => this.playTone(440, 0.2), 150);
    setTimeout(() => this.playTone(349.23, 0.4), 300);
  }

  playLevelUp(): void {
    // Celebration ding
    this.playChord([523.25, 659.25, 783.99, 1046.5], 0.5);
  }

  playStreak(streak: number): void {
    // Higher pitch for higher streaks
    const baseFreq = 440 + (streak * 50);
    this.playTone(Math.min(baseFreq, 1200), 0.15);
  }

  playAchievement(): void {
    // Fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3), i * 100);
    });
  }

  playMatch(): void {
    // Quick confirmation
    this.playTone(600, 0.1);
  }

  playNoMatch(): void {
    // Quick negative
    this.playTone(300, 0.1);
  }

  playTilePress(): void {
    // Gentle tap
    this.playTone(1000, 0.03, 'triangle');
  }

  playButtonHover(): void {
    // Subtle feedback
    this.playTone(1200, 0.02, 'sine');
  }

  // Initialize audio context on first user interaction
  initAudio(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const audioManager = new AudioManager();

// Hook for React components
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
    isMuted: audioManager.isAudioMuted(),
    setMuted: (m: boolean) => audioManager.setMuted(m),
    initAudio: () => audioManager.initAudio()
  };
};
