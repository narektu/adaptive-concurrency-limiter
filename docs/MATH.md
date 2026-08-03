# The Math & Queueing Theory

When I set out to build this adaptive concurrency limiter, I wanted to solve a fundamental problem I've seen in production systems: fixed rate limits are fundamentally the wrong tool for protecting a backend service. 

Here is a breakdown of the math and the queueing theory I used to solve this.

## 1. The Core Problem: Little's Law
Little's Law from queueing theory states:
`L = λ × W`
* `L` = average number of requests in the system (Concurrency)
* `λ` = arrival rate (Requests per second)
* `W` = average time each request spends in the system (Latency)

If you read this right-to-left: if latency (`W`) doubles because a downstream database gets slow, then for the same amount of traffic (`λ`), the number of requests sitting in the system (`L`) also doubles. 

If I had picked a fixed concurrency ceiling based on "healthy" days, a latency regression alone—with no change in traffic—would instantly push the system over that ceiling, causing requests to queue up. **The correct concurrency limit is not a constant — it's a dynamic function of currently observed latency.**

## 2. The Latency-vs-Concurrency Curve
If you plot throughput and latency against concurrency for any real service, you get a characteristic shape:
1. **Underloaded:** As concurrency rises, throughput rises linearly, and latency stays flat.
2. **The Knee:** At some point, the system is saturated. More concurrency doesn't buy more throughput; it just makes everyone wait longer.
3. **Overloaded:** Past the knee, throughput actually falls (due to context switching, connection pool exhaustion) and latency grows without bound.

My goal with these algorithms was to estimate exactly where that "knee" is right now, using only the latency I observe, and keep concurrency hovering just below it. I never get to see the underlying capacity directly; I infer it from how latency responds to load, the same way TCP infers network bandwidth.

## 3. The Math: From TCP to HTTP

### AIMD (Additive Increase, Multiplicative Decrease)
This is classic TCP congestion control. On success, the limit grows slowly (`limit + 1`). On failure, it shrinks fast (`limit × 0.9`). 
*The problem:* It only reacts to explicit failure signals (like 503s or timeouts). By the time you see those, requests have already queued badly. I needed something that detects queueing *before* failures happen.

### TCP Vegas (Delay-Based Detection)
TCP Vegas realizes you don't need to wait for a failure. Rising latency is an early warning sign.
It calculates the estimated queue size:
`queueSize = L × (1 - minRTT / sampleRTT)`

If the queue size is too small, I increase the limit. If it's too big, I decrease it. 
*The flaw:* Pure Vegas gets stuck. If traffic drops, it anchors to a low limit and refuses to climb back up because the "increase" condition rarely fires with force.

### The Solution: Gradient2 (Netflix Algorithm)
To fix Vegas, I implemented Netflix's `Gradient2Limit`. Instead of a hard minimum RTT, I use two Exponentially Weighted Moving Averages (EWMAs):
- `longRTT`: A slow-moving baseline.
- `shortRTT`: A fast-moving "current reality".

I calculate a continuous gradient (`longRTT / shortRTT`). If latency spikes, the gradient drops below 1.0, and the limit scales down. I also added a persistent `sqrt(limit)` headroom so the algorithm always gently probes for more capacity when the system is healthy.
