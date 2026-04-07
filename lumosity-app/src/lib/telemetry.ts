// ================================================================
// Telemetry — structured event batching, local persist, API sync
// ================================================================
export type TelemetryEventName =
  | 'game_start' | 'game_complete' | 'game_exit' | 'level_up'
  | 'achievement_unlocked' | 'page_view' | 'button_click'
  | 'tab_switch' | 'error' | 'performance_sample' | 'offline_sync';

export interface TelemetryEvent {
  id: string;
  name: TelemetryEventName;
  properties: Record<string, unknown>;
  timestamp: number;
  session_id: string;
}

const STORAGE_KEY    = 'ygy_tel_queue';
const FLUSH_INTERVAL = 12_000;   // ms
const MAX_QUEUE_SIZE = 60;
const ENDPOINT       = '/api/telemetry/batch';

class TelemetryService {
  private queue: TelemetryEvent[]    = [];
  private sessionId: string;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.sessionId = this._initSession();
    this._loadQueue();
    this._startFlushCycle();

    window.addEventListener('beforeunload', () => this._flush(true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._flush(true);
    });

    // Re-flush when coming back online
    window.addEventListener('online', () => this._flush());
  }

  track(name: TelemetryEventName, properties: Record<string, unknown> = {}): void {
    const event: TelemetryEvent = {
      id: crypto.randomUUID(),
      name,
      properties,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };
    this.queue.push(event);
    this._persistQueue();
    if (this.queue.length >= MAX_QUEUE_SIZE) this._flush();
  }

  // ── Internals ────────────────────────────────────────────────
  private _startFlushCycle() {
    this.timer = setInterval(() => this._flush(), FLUSH_INTERVAL);
  }

  private _flush(sync = false): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    this._persistQueue();

    const send = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch(ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ events: batch }),
          keepalive: true,
        });
      } catch {
        // Re-queue on failure
        this.queue.unshift(...batch);
        this._persistQueue();
      }
    };

    if (sync) {
      void send();
    } else {
      send();
    }
  }

  private _initSession(): string {
    const key = 'ygy_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  private _persistQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch { /* quota exceeded — accept data loss */ }
  }

  private _loadQueue(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.queue = JSON.parse(raw) as TelemetryEvent[];
    } catch { this.queue = []; }
  }
}

export const telemetry = new TelemetryService();


