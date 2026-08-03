import { describe, it, expect } from 'vitest';
import { VegasLimit } from '../src/limits/vegas-limit.js';

describe('VegasLimit', () => {
   it('climbs when latency is stable, drops when latency spikes', () => {
      const limit = new VegasLimit({ initialLimit: 20, maxLimit: 100 });
      
      // Baseline Phase: Feed 50 samples of stable latency (10ms)
      // The minRtt should converge to 10, queueSize should stay near 0,
      // and the limit should climb.
      for (let i = 0; i < 50; i++) {
         limit.onSample({ rttMs: 10, inFlight: 10, didDrop: false });
      }
      
      const peakLimit = limit.getLimit();
      expect(peakLimit).toBeGreaterThan(20);

      // Spike Phase: Feed 50 samples of degraded latency (20ms)
      // The expected queueSize will jump, exceeding the beta threshold,
      // causing the limit to shrink.
      for (let i = 0; i < 50; i++) {
         limit.onSample({ rttMs: 20, inFlight: 10, didDrop: false });
      }
      
      const degradedLimit = limit.getLimit();
      expect(degradedLimit).toBeLessThan(peakLimit);
   });
  
   it('drops heavily on explicit drop signals', () => {
      const limit = new VegasLimit({ initialLimit: 100 });
      limit.onSample({ rttMs: 10, inFlight: 10, didDrop: true });
      
      // Drops by 10% on explicit failure
      expect(limit.getLimit()).toBe(90);
   });
});
