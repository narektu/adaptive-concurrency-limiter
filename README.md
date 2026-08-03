# Adaptive Concurrency Limiter for Node.js

A production-ready Express middleware that implements TCP-Vegas-inspired adaptive concurrency limiting. 

Based on Netflix's `concurrency-limits` Java library, this package watches request latency continuously and adjusts your concurrency ceiling in real-time. It raises the ceiling when a downstream service is healthy, and automatically lowers it the moment queueing starts—preventing timeouts and cascading failures *before* they happen.

## The Problem with Fixed Limits (Little's Law)

Most applications guess a fixed concurrency limit. However, according to Little's Law from queueing theory:
`L = λ × W`
*(Concurrency = Arrival Rate × Latency)*

If your downstream database gets slow, latency (`W`) increases. If your limit (`L`) is fixed, your system will queue requests endlessly. This library recognizes that **the correct concurrency limit is not a constant — it's a dynamic function of currently observed latency.**

## Features
- **Gradient2 Algorithm:** Uses dual Exponentially Weighted Moving Averages (EWMAs) to compare long-term baseline latency against recent reality, automatically computing a gradient to adjust limits.
- **Express Middleware:** Drop-in ready for any Express application.
- **Sub-millisecond Precision:** Uses Node's `performance.now()` for ultra-precise latency tracking.
- **Zero Dependencies:** The core algorithms are pure math and entirely self-contained.

## Usage

```typescript
import express from 'express';
import { Gradient2Limit, WindowedLimit, SimpleLimiter, concurrencyLimiter } from 'adaptive-concurrency-limiter';

const app = express();

// 1. Setup the math algorithm
const innerLimit = new Gradient2Limit({ initialLimit: 50 });

// 2. Wrap it in a window to smooth the data
const windowed = new WindowedLimit(innerLimit, { windowSize: 10 });

// 3. Create the admission gate
const limiter = new SimpleLimiter(windowed);

// 4. Mount the middleware
app.use(concurrencyLimiter(limiter));

app.get('/', (req, res) => {
    res.json({ message: "Protected by adaptive concurrency!" });
});

app.listen(3000);
```

## Benchmarks
This library includes a reproducible benchmark harness that proves the superiority of the adaptive algorithms.

[View the full Benchmark Analysis & Data](docs/BENCHMARKS.md)

## Algorithms Included
- `Gradient2Limit` (Recommended): Netflix's dual-EWMA continuous gradient algorithm.
- `VegasLimit`: Direct adaptation of TCP Vegas congestion control.
- `AIMDLimit`: Classic Additive Increase, Multiplicative Decrease.
- `FixedLimit`: A non-adaptive baseline for control testing.
