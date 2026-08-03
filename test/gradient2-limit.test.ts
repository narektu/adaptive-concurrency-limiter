import { describe, it, expect } from 'vitest';
import { Gradient2Limit } from '../src/limits/gradient2-limit.js';

describe('Gradient2Limit', () => {
  it('climbs slowly with stable latency', () => {
    const limit = new Gradient2Limit({ initialLimit: 20, maxLimit: 100 });
    
    // Stable baseline
    for (let i = 0; i < 50; i++) {
      limit.onSample({ rttMs: 10, inFlight: 10, didDrop: false });
    }
    
    const peakLimit = limit.getLimit();
    expect(peakLimit).toBeGreaterThan(20);
  });

  it('drops when latency spikes relative to baseline', () => {
    const limit = new Gradient2Limit({ initialLimit: 50, maxLimit: 100 });
    
    // Establish a baseline
    for (let i = 0; i < 100; i++) {
      limit.onSample({ rttMs: 10, inFlight: 10, didDrop: false });
    }
    
    const baselineLimit = limit.getLimit();

    // 3x latency spike
    for (let i = 0; i < 10; i++) {
      limit.onSample({ rttMs: 30, inFlight: 10, didDrop: false });
    }
    
    const spikeLimit = limit.getLimit();
    expect(spikeLimit).toBeLessThan(baselineLimit);
  });

  it('drops heavily on explicit drop signals', () => {
    const limit = new Gradient2Limit({ initialLimit: 100 });
    limit.onSample({ rttMs: 10, inFlight: 10, didDrop: true });
    
    // Gradient2 drops by 15% on drop (0.85 multiplier)
    expect(limit.getLimit()).toBe(85);
  });
});
