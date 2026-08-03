import { Limit, Sample } from './limit.js'

export class FixedLimit implements Limit {
   constructor(private readonly limit: number) {}
   
   getLimit(): number {
      return this.limit;
   }

   onSample(_sample: Sample): void {
      /* Intentionally does nothing */
   }
}