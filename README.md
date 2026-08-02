# adaptive-concurrency-limiter

> 🚧 Work in progress. Following a structured build handbook — see progress in commit history.

Adaptive, TCP-Vegas-inspired concurrency limiting for Node.js.

Most rate limiters guess a fixed number and hope it's right. This library
watches request latency continuously and adjusts the concurrency ceiling
in real time — raising it when a downstream service is healthy, lowering
it automatically the moment queueing starts, before timeouts and cascading
failures happen. The same class of algorithm behind TCP congestion control,
applied to HTTP admission control.

## Status

Implementing three concurrency-limiting algorithms (AIMD, Vegas, Gradient2)
from first principles, with a benchmark suite comparing all three against
a naive fixed-threshold baseline under simulated latency degradation.

- [ ] Core `Limit` algorithms (`FixedLimit`, `AIMDLimit`, `VegasLimit`, `Gradient2Limit`)
- [ ] `WindowedLimit` + `SimpleLimiter` admission gate
- [ ] Express middleware
- [ ] Benchmark harness with reproducible latency-injection scenario
- [ ] Published results in `docs/BENCHMARKS.md`
- [ ] v1.0.0 on npm

## License

MIT
