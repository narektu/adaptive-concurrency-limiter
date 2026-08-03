import { Limit, Sample } from "./limit.js";

export interface VegasOptions {
   initialLimit?: number;
   minLimit?: number;
   maxLimit?: number;
   /** how many windows before minRTT is allowed to "forget" and re-discover baseline */
   minRttResetIntervalSamples?: number;
   alphaFn?: (limit: number) => number;
   betaFn?: (limit: number) => number;
}

export class VegasLimit implements Limit {
   private limit: number;
   private readonly min: number;
   private readonly max: number;
   private minRtt = Infinity;
   private samplesSinceReset = 0;
   private readonly resetInterval: number;
   private readonly alphaFn: (l: number) => number;
   private readonly betaFn: (l: number) => number;

   constructor(opts: VegasOptions = {}) {
      this.limit = opts.initialLimit ?? 20;
      this.min = opts.minLimit ?? 1;
      this.max = opts.maxLimit ?? 1000;
      this.resetInterval = opts.minRttResetIntervalSamples ?? 1000;
      this.alphaFn = opts.alphaFn ?? ((l) => Math.max(1, 3 * Math.log10(l)));
      this.betaFn = opts.betaFn ?? ((l) => Math.max(2, 6 * Math.log10(l)));
   }

   getLimit(): number {
      return this.limit;
   }

   onSample(sample: Sample): void {
      this.samplesSinceReset++;
      if (this.samplesSinceReset > this.resetInterval) {
         this.minRtt = sample.rttMs;
         this.samplesSinceReset = 0;
      } else {
         this.minRtt = Math.min(this.minRtt, sample.rttMs);
      }

      if (sample.didDrop) {
         this.limit = Math.max(this.min, Math.floor(this.limit * 0.9));
         return;
      }

      const queueSize = this.limit * (1 - this.minRtt / sample.rttMs);
      const alpha = this.alphaFn(this.limit);
      const beta = this.betaFn(this.limit);
      
      if (queueSize < alpha) {
         this.limit = Math.min(this.max, this.limit + 1);
      } else if (queueSize > beta) {
         this.limit = Math.max(this.min, this.limit - 1);
      }
   }
}
