import { Request, Response, NextFunction } from 'express';
import { SimpleLimiter } from "../limiter/simple-limiter.js";

export function concurrencyLimiter(limiter: SimpleLimiter) {
   return (req: Request, res: Response, next: NextFunction) => {
      const listener = limiter.acquire();
      if (!listener) {
         res.status(429).set("Retry-After", "1").json({ error: "overloaded" });
         return;
      }

      const start = performance.now();
      res.on("finish", () => {
         const rttMs = performance.now() - start;
         if (res.statusCode >= 500) {
            listener.onDropped();
         } else {
            listener.onSuccess(rttMs);
         }
      });
      res.on("close", () => {
         if (!res.writableEnded) {
            listener.onIgnore();
         }
      });

      next();
   };
}