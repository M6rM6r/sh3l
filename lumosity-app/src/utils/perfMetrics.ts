// Performance metrics collection — Web Vitals + custom game metrics
// Ships data to backend analytics endpoint when available

interface PerfEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  ts: number;
}

const BUFFER_KEY = 'ygy_perf_buffer';
const FLUSH_INTERVAL = 30000;

let buffer: PerfEntry[] = [];

function rateMetric(name: string, value: number): PerfEntry['rating'] {
  const thresholds: Record<string, [number, number]> = {
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
    gameLoadTime: [500, 1500],
    frameDropRate: [0.02, 0.1],
  };
  const [good, poor] = thresholds[name] ?? [1000, 3000];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function recordMetric(name: string, value: number) {
  buffer.push({ name, value, rating: rateMetric(name, value), ts: Date.now() });
}

export function measureGameLoad(gameType: string): () => void {
  const start = performance.now();
  return () => {
    const elapsed = performance.now() - start;
    recordMetric('gameLoadTime', elapsed);
    recordMetric(`gameLoad:${gameType}`, elapsed);
  };
}

export function measureFrameRate(durationMs = 3000): Promise<number> {
  return new Promise(resolve => {
    let frames = 0;
    let raf: number;
    const start = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - start < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
        const fps = (frames / durationMs) * 1000;
        recordMetric('fps', fps);
        resolve(fps);
      }
    };
    raf = requestAnimationFrame(tick);
  });
}

function flush() {
  if (buffer.length === 0) return;
  const payload = [...buffer];
  buffer = [];
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(payload));
  } catch { /* quota exceeded — drop silently */ }
}

export function initPerfMonitoring() {
  // Observe paint timings
  if ('PerformanceObserver' in window) {
    try {
      const paintObs = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            recordMetric('FCP', entry.startTime);
          }
        }
      });
      paintObs.observe({ type: 'paint', buffered: true });

      const lcpObs = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) recordMetric('LCP', last.startTime);
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* observer not supported */ }
  }

  // Periodic flush
  setInterval(flush, FLUSH_INTERVAL);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function getPerfSummary(): Record<string, { avg: number; count: number; rating: string }> {
  const stored = localStorage.getItem(BUFFER_KEY);
  const entries: PerfEntry[] = stored ? JSON.parse(stored) : [];
  const all = [...entries, ...buffer];
  const grouped: Record<string, number[]> = {};
  for (const e of all) {
    (grouped[e.name] ??= []).push(e.value);
  }
  const summary: Record<string, { avg: number; count: number; rating: string }> = {};
  for (const [name, vals] of Object.entries(grouped)) {
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    summary[name] = { avg: Math.round(avg), count: vals.length, rating: rateMetric(name, avg) };
  }
  return summary;
}
