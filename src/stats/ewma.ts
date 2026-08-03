export class Ewma {
   private value: number | null = null;
   private readonly alpha: number;

   constructor(halfLifeSamples: number) {
      this.alpha = 1 - Math.exp(Math.log(0.5) / halfLifeSamples);
   }

   update(x: number): number {
      this.value = this.value === null ? x : this.alpha * x + (1 - this.alpha) * this.value;
      return this.value;
   }

   get(): number {
      return this.value ?? 0;
   }
}