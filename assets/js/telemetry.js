/**
 * High-Precision Telemetry & Event Interceptor
 * Captures user metrics rigorously without causing main-thread stutter.
 * Uses Beacon API to ensure delivery of analytics prior to document unload.
 */

class CognitiveTelemetryLayer {
  constructor(endpointUrl) {
    this.endpointUrl = endpointUrl;
    this.buffer = [];
    this.batchSize = 10;
    this.isFlushing = false;
    
    // Strict binding to prevent context loss
    this.recordEvent = this.recordEvent.bind(this);
    this.flushOptions = this.flushOptions.bind(this);
    
    // Auto-flush on unload for guaranteed data persistence
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.forceSyncFlush();
      }
    });
  }

  /**
   * Records a user interaction with absolute timestamp precision.
   * @param {string} eventCategory 
   * @param {string} action 
   * @param {Object} metadata 
   */
  recordEvent(eventCategory, action, metadata = {}) {
    const payload = {
      ev: eventCategory,
      act: action,
      meta: metadata,
      ts: performance.now(), // High-res time
      sysId: this.getSystemId()
    };

    this.buffer.push(payload);

    if (this.buffer.length >= this.batchSize && !this.isFlushing) {
      this.flushOptions();
    }
  }

  getSystemId() {
    return btoa(navigator.userAgent + window.screen.width).substring(0, 16);
  }

  async flushOptions() {
    if (this.buffer.length === 0) return;
    this.isFlushing = true;
    
    // Immutable copy for transmission
    const batchData = [...this.buffer];
    this.buffer = []; // OCPD flush immediately

    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
        keepalive: true // Crucial for network resilience
      });

      if (!response.ok) {
        throw new Error(`Telemetry payload rejected: ${response.status}`);
      }
    } catch (err) {
      console.error('[Telemetry Subsystem] Delivery Failure. Discarding payload to maintain memory limits.');
      // Intentionally not re-queueing to prevent memory leaks during sustained outages.
    } finally {
      this.isFlushing = false;
    }
  }

  forceSyncFlush() {
    if (this.buffer.length === 0) return;
    const blob = new Blob([JSON.stringify(this.buffer)], { type: 'application/json' });
    navigator.sendBeacon(this.endpointUrl, blob);
    this.buffer = [];
  }
}

// Instantiate Global Singletons Purely
window.SystemTelemetry = new CognitiveTelemetryLayer('/api/v1/telemetry/ingest');
