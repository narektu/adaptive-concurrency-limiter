import express from 'express';                                                                                                                                                                                      
import path from 'path';                                                                                                                                                                                            
import { simulateDownstreamCall, setDownstreamLatency } from './fake-downstream.js';                                                                                                                                
import { concurrencyLimiter } from '../src/middleware/express.js';                                                                                                                                                  
import { SimpleLimiter } from '../src/limiter/simple-limiter.js';                                                                                                                                                   
import { Gradient2Limit } from '../src/limits/gradient2-limit.js';                                                                                                                                                  
import { WindowedLimit } from '../src/limiter/windowed-limit.js';

const app = express();

const innerLimit = new Gradient2Limit({ initialLimit: 50 });
const windowed = new WindowedLimit(innerLimit, { windowSize: 10 });
const limiter = new SimpleLimiter(windowed);

app.use('/api', concurrencyLimiter(limiter));

app.get('/api/work', async (req, res) => {
   await simulateDownstreamCall();
   res.json({ ok: true });
});

app.post('/admin/spike', (req, res) => {
   setDownstreamLatency(300, 50);
   res.json({ status: 'spiked' });
});
app.post('/admin/recover', (req, res) => {
   setDownstreamLatency(20, 5);
   res.json({ status: 'recovered' });
});

// Serve the dashboard
app.use(express.static(path.join(process.cwd(), 'dashboard')));

// SSE Endpoint for real-time charting
app.get('/metrics/stream', (req, res) => {
   res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
   });

   const interval = setInterval(() => {
      const payload = JSON.stringify({
         t: Date.now(),
         limit: limiter.currentLimit(),
         inFlight: limiter.currentInFlight(),
      });
      res.write(`data: ${payload}\n\n`);
   }, 250);

   req.on("close", () => clearInterval(interval));
});

app.listen(3000, () => {
   console.log('Demo server running at http://localhost:3000');
});
