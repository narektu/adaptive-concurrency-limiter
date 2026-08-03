let currentLatencyMs = 20;
let jitterMs = 5;

export function setDownstreamLatency(ms: number, jitter = 5) {
   currentLatencyMs = ms;
   jitterMs = jitter;
}

export async function simulateDownstreamCall(): Promise<void> {
   const delay = currentLatencyMs + (Math.random() - 0.5) * jitterMs * 2;
   await new Promise((r) => setTimeout(r, Math.max(0, delay)));
}
