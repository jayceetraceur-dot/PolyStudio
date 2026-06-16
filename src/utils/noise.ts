/**
 * Seeded pseudo-random number generator (Mulberry32)
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 12345;
  }

  // Returns a value between 0.0 and 1.0
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Custom 2D Noise Implementation
 */
export class Improved2DNoise {
  private p: number[] = new Array(512);

  constructor(seed: number) {
    const rng = new SeededRandom(seed);
    const permutation = Array.from({ length: 256 }, (_, i) => i);
    
    // Shuffle the permutation array using our seeded random
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    // Populate lookup table
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[256 + i] = permutation[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y];
    const bb = this.p[this.p[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    // Map result from raw range to approximately [0, 1]
    const rawVal = this.lerp(v, x1, x2);
    return (rawVal + 1.0) / 2.0; 
  }

  /**
   * Fractional Brownian Motion (fbm) for richer terrain details
   */
  fbm(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
