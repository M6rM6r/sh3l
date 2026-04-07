// ================================================================
// Performance Monitor — FPS + JS heap sampling for game quality
// ================================================================

export interface PerfSample {
  fps:       number;
  memory_mb: number | null;
  timestamp: number;
}

const HISTORY_LENGTH = 60; // seconds

class PerformanceMonitor {
  private _frameCount = 0;
  private _lastTick   = 0;
  private _rafId: number | null = null;
  private _samples: PerfSample[] = [];
  private _onSample?: (s: PerfSample) => void;
  private _running = false;

  start(onSample?: (s: PerfSample) => void): void {
    if (this._running) return;
    this._running    = true;
    this._onSample   = onSample;
    this._frameCount = 0;
    this._lastTick   = performance.now();
    this._loop();
  }

  stop(): void {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  avgFps(): number {
    if (!this._samples.length) return 0;
    return Math.round(
      this._samples.reduce((s, x) => s + x.fps, 0) / this._samples.length
    );
  }

  lastSample(): PerfSample | null {
    return this._samples.at(-1) ?? null;
  }

  snapshot(): PerfSample[] {
    return [...this._samples];
  }

  // ── Private ─────────────────────────────────────────────────
  private _loop(): void {
    if (!this._running) return;
    this._frameCount++;
    this._rafId = requestAnimationFrame(() => {
      const now     = performance.now();
      const elapsed = now - this._lastTick;
      if (elapsed >= 1000) {
        const fps:    number       = Math.round((this._frameCount * 1000) / elapsed);
        const memory: number | null = this._heapMb();
        const sample: PerfSample   = { fps, memory_mb: memory, timestamp: Date.now() };
        this._samples.push(sample);
        if (this._samples.length > HISTORY_LENGTH) this._samples.shift();
        this._onSample?.(sample);
        this._frameCount = 0;
        this._lastTick   = now;
      }
      this._loop();
    });
  }

  private _heapMb(): number | null {
    const p = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return p.memory ? Math.round(p.memory.usedJSHeapSize / 1_048_576) : null;
  }
}

export const perfMonitor = new PerformanceMonitor();
