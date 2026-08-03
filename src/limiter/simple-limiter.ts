import { Limit } from "../limits/limit.js";

export interface Listener {
   onSuccess(rttMs: number): void;
   onDropped(): void;
   onIgnore(): void; 
}

export class SimpleLimiter {
   private inFlight = 0;

   constructor(private readonly limit: Limit) {}

   acquire(): Listener | null {
      if (this.inFlight >= this.limit.getLimit()) {
         return null;
      }
      this.inFlight++;
      let settled = false;

      const finish = (sample: { rttMs: number; didDrop: boolean } | null) => {
         if (settled) {
            return;
         }
         settled = true;
         this.inFlight--;
         if (sample) {
            this.limit.onSample({ ...sample, inFlight: this.inFlight });
         }
      };

      return {
         onSuccess: (rttMs) => finish({ rttMs, didDrop: false }),
         onDropped: () => finish({ rttMs: 0, didDrop: true }),
         onIgnore: () => finish(null),
      };
   }

   currentLimit(): number { 
      return this.limit.getLimit();
   }

   currentInFlight(): number { 
      return this.inFlight;
   }
}