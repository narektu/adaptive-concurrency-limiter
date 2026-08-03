export interface Sample {
   rttMs: number;
   inFlight: number;
   didDrop: boolean;
}

export interface Limit {
   getLimit(): number;
   onSample(_sample: Sample): void;
}
