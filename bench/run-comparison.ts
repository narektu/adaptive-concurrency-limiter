import autocannon from 'autocannon';
import express from 'express';                                                                                                                                                                                      
import fs from 'fs';
import { simulateDownstreamCall, setDownstreamLatency } from './fake-downstream.js';                                                                                                                                
import { concurrencyLimiter } from '../src/middleware/express.js';                                                                                                                                                  
import { SimpleLimiter } from '../src/limiter/simple-limiter.js';                                                                                                                                                   
import { FixedLimit } from '../src/limits/fixed-limit.js';                                                                                                                                                          
import { VegasLimit } from '../src/limits/vegas-limit.js';                                                                                                                                                          
import { Gradient2Limit } from '../src/limits/gradient2-limit.js';                                                                                                                                                  
import { WindowedLimit } from '../src/limiter/windowed-limit.js';


export function createTestServer(limiterType: 'none' | 'fixed' | 'vegas' | 'gradient2') {
   const app = express();
   let limiter: SimpleLimiter | null = null;

   // 1. Initialize the correct limiter based on limiterType
   if (limiterType !== 'none') {
      let innerLimit;
      if (limiterType === 'fixed') {
         innerLimit = new FixedLimit(50);
      } else if (limiterType === 'vegas') {
         innerLimit = new VegasLimit({ initialLimit: 50 });
      } else {
         innerLimit = new Gradient2Limit({ initialLimit: 50 });
      }

      const windowed = new WindowedLimit(innerLimit, { windowSize: 10 });
      limiter = new SimpleLimiter(windowed);

      // Mount your middleware
      app.use(concurrencyLimiter(limiter));
   }

   // 2. The main endpoint that does the "work"
   app.get('/', async (req, res) => {
      await simulateDownstreamCall();
      res.json({ ok: true });
   });

   // 3. An admin endpoint so our test script can poll the current limit metrics
   app.get('/metrics', (req, res) => {
      if (!limiter) {
         return res.json({ limit: 0, inFlight: 0 });
      }
      res.json({
         limit: limiter.currentLimit(),
         inFlight: limiter.currentInFlight()
      });
   });

   return new Promise<{ server: any, limiter: SimpleLimiter | null }>((resolve) => {
      const server = app.listen(3000, () => {
         resolve({server, limiter});
      });
   });
}

async function runScenario(limiterType: 'none' | 'fixed' | 'vegas' | 'gradient2') {
   console.log(`\n--- Running scenario with limiter: ${limiterType} ---`);
   
   // 1. Start the server
   const { server } = await createTestServer(limiterType);
   
   // 2. Set normal healthy downstream latency (20ms)
   setDownstreamLatency(20, 5);

   const metrics: any[] = [];
  
   // 3. Start a polling interval to record metrics every 250ms
   const pollInterval = setInterval(async () => {
      try {
         const res = await fetch('http://localhost:3000/metrics');
         const data = await res.json();
         metrics.push({ time: Date.now(), ...data });
      } catch (e) {
         // Ignore fetch errors during heavy load
      }
   }, 250);

   // 4. Schedule the "latency spike"
   // After 10 seconds, the downstream dependency gets super slow (300ms)
   setTimeout(() => {
      console.log('Injecting latency spike');
      setDownstreamLatency(300, 50);
   }, 10000);

   // After 20 seconds, the downstream recovers
   setTimeout(() => {
      console.log('Downstream recovered');
      setDownstreamLatency(20, 5);
   }, 20000);

   // 5. Fire Autocannon! Hammer the server with 200 concurrent connections for 30 seconds
   return new Promise<void>((resolve) => {
      const instance = autocannon({
         url: 'http://localhost:3000/',
         connections: 200,
         duration: 30, // seconds
      }, (err, result) => {
         clearInterval(pollInterval);
         server.close();
         
         if (err) {
            console.error('Autocannon error:', err);
         } else {
            // 6. Save the results to a file
            fs.writeFileSync(
               `bench/results-${limiterType}.json`, 
               JSON.stringify({ stats: result, timeline: metrics }, null, 2)
            );
            console.log(`Finished ${limiterType}. Results saved.`);
         }
         resolve();
      });
    
      autocannon.track(instance);
   });
}

// 7. Run all 4 scenarios back to back
async function runAll() {
  await runScenario('none');
  await new Promise(r => setTimeout(r, 2000)); // Cool down
  await runScenario('fixed');
  await new Promise(r => setTimeout(r, 2000)); 
  await runScenario('vegas');
  await new Promise(r => setTimeout(r, 2000)); 
  await runScenario('gradient2');
  
  console.log('\nAll benchmarks complete!');
}

runAll();