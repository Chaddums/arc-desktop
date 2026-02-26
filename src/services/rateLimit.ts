/**
 * RateLimiter — Sliding window rate limiter.
 * Adapted from LAMA's utils/rateLimit.ts.
 */

export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Check if a request can proceed. Returns true if allowed. */
  canProceed(): boolean {
    this.prune();
    return this.timestamps.length < this.maxRequests;
  }

  /** Record a request. Call after the request is made. */
  record(): void {
    this.timestamps.push(Date.now());
  }

  /** Wait until a slot is available, then record. */
  async acquire(): Promise<void> {
    while (!this.canProceed()) {
      const oldest = this.timestamps[0];
      const waitMs = oldest + this.windowMs - Date.now() + 10;
      await new Promise((r) => setTimeout(r, Math.max(waitMs, 50)));
      this.prune();
    }
    this.record();
  }

  /** Get ms until next available slot (0 if available now) */
  get waitTime(): number {
    this.prune();
    if (this.timestamps.length < this.maxRequests) return 0;
    const oldest = this.timestamps[0];
    return Math.max(0, oldest + this.windowMs - Date.now());
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }
}

/** MetaForge rate limiter — more permissive than POE2 trade */
export const metaforgeRateLimiter = new RateLimiter(30, 60_000);

/** RaidTheory GitHub rate limiter */
export const raidtheoryRateLimiter = new RateLimiter(60, 60_000);

/** ardb rate limiter */
export const ardbRateLimiter = new RateLimiter(30, 60_000);
