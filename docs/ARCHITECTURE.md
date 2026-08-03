# System Architecture

To make this adaptive concurrency limiter clean, robust, and testable, I strictly separated the "pure math" from the "HTTP admission control". 

This separation is the architectural core of the project. It allowed me to unit-test the complex mathematical algorithms (like `Gradient2Limit` and `VegasLimit`) with synthetic data arrays, completely decoupled from Express or Node's HTTP server logic.

## Component Breakdown

| Component | Responsibility | Stateful? |
|-----------|----------------|-----------|
| **Limit Algorithms** | Pure math. Takes a stream of `(rtt, inFlight, didDrop)` samples and produces a limit. Knows nothing about HTTP or sockets. | Yes (tracks EWMAs and baselines) |
| **WindowedLimit** | Wraps the limit algorithms. Aggregates raw per-request samples into windows to smooth out the math and prevent wild oscillations before feeding it to the inner limit. | Yes |
| **SimpleLimiter (The Gate)** | The actual admission gate that the Express middleware calls. Tracks the global `inFlight` counter and decides whether to `acquire` (allow) or reject the request. | Yes (inFlight counter) |
| **Listener** | Handed back to the middleware on success. Ensures I record the final RTT when the HTTP response finishes, with idempotency guards (`settled` boolean) to prevent double-counting. | No |

By isolating the mathematics from the admission gate, the library can easily be ported from Express to Fastify, gRPC, or any other transport layer, simply by writing a new wrapper around `SimpleLimiter`.
