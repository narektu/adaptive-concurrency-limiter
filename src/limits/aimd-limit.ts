import { Limit, Sample } from "./limit.js";

export interface AIMDOptions {
   initialLimit?: number;
   minLimit?: number;
   maxLimit?: number;
   backoffRatio?: number; // beta, e.g. 0.9
}

export class AIMDLimit implements Limit {
   private limit: number;
   private readonly min: number;
   private readonly max: number;
   private readonly backoffRatio: number;

   constructor(opts: AIMDOptions = {}) {
      this.limit = opts.initialLimit ?? 20;
      this.min = opts.minLimit ?? 1;
      this.max = opts.maxLimit ?? 1000;
      this.backoffRatio = opts.backoffRatio ?? 0.9;
   }

   getLimit(): number {
      return this.limit;
   }

   onSample(sample: Sample): void {
      if (sample.didDrop) {
         this.limit = Math.max(this.min, Math.floor(this.limit * this.backoffRatio));
      } else {
         this.limit = Math.min(this.max, this.limit + 1);
      }
   }
}