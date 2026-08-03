import { Limit, Sample } from "./limit.js";
import { Ewma } from "../stats/ewma.js";

export interface Gradient2Options {
   initialLimit?: number;
   minLimit?: number;
   maxLimit?: number;
   minGradient?: number; // floor on how far the limit can drop per step, e.g. 0.5
   toleranceFactor?: number; // multiplies sqrt(limit) headroom term, e.g. 1.0
   longHalfLife?: number; // samples, e.g. 100
   shortHalfLife?: number; // samples, e.g. 10
}

export class Gradient2Limit implements Limit {
   private limit: number;
   private readonly min: number;
   private readonly max: number;
   private readonly minGradient: number;
   private readonly toleranceFactor: number;
   private readonly longRtt: Ewma;
   private readonly shortRtt: Ewma;
   
   constructor(opts: Gradient2Options = {}) {
      this.limit = opts.initialLimit ?? 20;
      this.min = opts.minLimit ?? 1;
      this.max = opts.maxLimit ?? 1000;
      this.minGradient = opts.minGradient ?? 0.5;
      this.toleranceFactor = opts.toleranceFactor ?? 1.0;
      this.longRtt = new Ewma(opts.longHalfLife ?? 100);
      this.shortRtt = new Ewma(opts.shortHalfLife ?? 10);
   }

   getLimit(): number {
      return this.limit; 
   }

   onSample(sample: Sample): void {
      if (sample.didDrop) {
         this.limit = Math.max(this.min, Math.floor(this.limit * 0.85));
         return;
      }

      const long = this.longRtt.update(sample.rttMs);
      const short = this.shortRtt.update(sample.rttMs);
      const gradient = Math.min(1, Math.max(this.minGradient, long / short));
      const headroom = Math.sqrt(this.limit) * this.toleranceFactor;
      const newLimit = this.limit * gradient + headroom;
      
      this.limit = Math.min(this.max, Math.max(this.min, Math.round(newLimit)));
   }
}