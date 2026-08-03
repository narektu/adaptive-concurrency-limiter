# Benchmark Results

This document contains the performance benchmark comparing four concurrency limiting strategies under simulated downstream latency spikes.

## Scenario
The test spins up an Express server and mounts a specific limiter. We then use `autocannon` to hit the server with 200 concurrent connections for 30 seconds.
Exactly 10 seconds into the run, we programmatically degrade the downstream dependency's response time from a healthy `20ms` to an overloaded `300ms`. At 20 seconds, the downstream recovers.

## Results Analysis

### 1. No Limiter (`none`)
* **Behavior:** Infinite queueing. All requests are accepted and pile up in memory.
* **Latency:** Failed gracefully for the client. The server never rejected requests, but P99 latency skyrocketed to **340ms**, meaning clients were left hanging indefinitely.
* **Throughput:** 113,000 requests processed.

### 2. Fixed Limiter (`fixed=50`)
* **Behavior:** Hard threshold. Rejects any request if 50 requests are already in flight.
* **Latency:** Perfectly protected (P50 20ms, P99 55ms). 
* **Throughput:** Highly inefficient. It blindly rejected over 180,000 requests even during the healthy periods because a fixed number cannot account for how fast the system is actually processing work. Only 41,284 successful responses.

### 3. TCP Vegas (`vegas`)
* **Behavior:** Proactive load shedding based on queue depth estimation (`queueSize = L * (1 - minRTT / sampleRTT)`).
* **Latency:** Tightest latency control (P50 27ms, P99 44ms).
* **Throughput:** Known failure mode demonstrated. Vegas is too twitchy. It dropped the limit aggressively during the spike, but refused to probe back up when the system recovered. Only 2,249 successful responses.

### 4. Gradient2 (Netflix Algorithm)
* **Behavior:** Dual-EWMA (Exponentially Weighted Moving Average) gradient calculation. Measures long-term baseline against short-term reality.
* **Latency:** Excellent protection during the spike (P50 27ms, P99 49ms).
* **Throughput:** **The clear winner.** It dynamically backed off during the latency spike to protect the system, but correctly scaled back up to capacity during healthy windows. Allowed **129,549** successful responses, tripling the throughput of the fixed limit while providing the same latency protection!
