import { Limit, Sample } from '../limits/limit.js'

export interface WindowedLimitOptions {
   windowSize?: number; // number of raw samples per aggregated window
}

export class WindowedLimit implements Limit {
   private readonly windowSize: number;
   private buffer: Sample[] = [];

   constructor(private readonly inner: Limit, opts: WindowedLimitOptions = {}) {
      this.windowSize = opts.windowSize ?? 10;
   }

   getLimit(): number {
      return this.inner.getLimit();
   }

   onSample(sample: Sample): void {
      this.buffer.push(sample);
      if (this.buffer.length < this.windowSize) {
         return;
      }

      const anyDrop = this.buffer.some((s) => s.didDrop);
      const minRtt = Math.min(...this.buffer.map((s) => s.rttMs));
      const maxInFlight = Math.max(...this.buffer.map((s) => s.inFlight));
      
      this.inner.onSample({ rttMs: minRtt, inFlight: maxInFlight, didDrop: anyDrop });
      this.buffer = [];
   }
}