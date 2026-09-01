import type { Signal, Strategy } from "../types.js";

export interface MomentumOptions {
  lookback: number;
  entryReturnBps: number;
}

export function createMomentumStrategy(options: MomentumOptions): Strategy {
  if (options.lookback < 2 || options.entryReturnBps <= 0) {
    throw new Error("lookback must be >= 2 and entryReturnBps must be positive");
  }

  return (prices): Signal => {
    if (prices.length < options.lookback) {
      return hold(prices.at(-1)?.timestamp ?? 0, "not enough observations");
    }
    const window = prices.slice(-options.lookback);
    const first = window[0]!;
    const last = window.at(-1)!;
    if (first.price <= 0 || last.price <= 0 || !Number.isFinite(first.price) || !Number.isFinite(last.price)) {
      throw new Error("prices must be finite and positive");
    }
    const returnBps = ((last.price / first.price) - 1) * 10_000;
    if (returnBps >= options.entryReturnBps) {
      return makeSignal("buy-base", returnBps, options.entryReturnBps, last.timestamp);
    }
    if (returnBps <= -options.entryReturnBps) {
      return makeSignal("sell-base", returnBps, options.entryReturnBps, last.timestamp);
    }
    return hold(last.timestamp, `return ${returnBps.toFixed(1)} bps is inside the entry band`);
  };
}

function makeSignal(
  direction: "buy-base" | "sell-base",
  returnBps: number,
  threshold: number,
  observedAt: number
): Signal {
  return {
    strategy: "momentum",
    direction,
    confidence: Math.min(1, Math.abs(returnBps) / (threshold * 2)),
    reason: `return ${returnBps.toFixed(1)} bps crossed the entry band`,
    observedAt
  };
}

function hold(observedAt: number, reason: string): Signal {
  return { strategy: "momentum", direction: "hold", confidence: 0, reason, observedAt };
}
