import { describe, it, expect } from 'vitest';
import { AIMDLimit } from '../src/limits/aimd-limit.js';

describe('AIMDLimit', () => {
   it('increases by 1 on successful samples', () => {
      const limit = new AIMDLimit({ initialLimit: 20, maxLimit: 1000 });
      
      // Feed 50 successful samples
      for (let i = 0; i < 50; i++) {
         limit.onSample({ rttMs: 10, inFlight: 10, didDrop: false });
      }
      
      expect(limit.getLimit()).toBe(70);
   });

   it('decreases multiplicatively on dropped samples', () => {
      const limit = new AIMDLimit({ initialLimit: 100, backoffRatio: 0.9 });
      
      // Feed 1 dropped sample
      limit.onSample({ rttMs: 10, inFlight: 10, didDrop: true });
      
      expect(limit.getLimit()).toBe(90);
   });

   it('respects min and max limits', () => {
      const limit = new AIMDLimit({ initialLimit: 20, minLimit: 10, maxLimit: 25, backoffRatio: 0.5 });
      
      // Try to go above maxLimit
      for (let i = 0; i < 20; i++) {
         limit.onSample({ rttMs: 10, inFlight: 10, didDrop: false });
      }
      expect(limit.getLimit()).toBe(25); // Should be capped at 25

      // Try to go below minLimit
      for (let i = 0; i < 10; i++) {
         limit.onSample({ rttMs: 10, inFlight: 10, didDrop: true });
      }
      expect(limit.getLimit()).toBe(10); // Should be floored at 10
   });
});