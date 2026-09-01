import type { Signal, Strategy } from "../types.js";

export interface MeanReversionOptions {
  lookback: number;
  entryZScore: number;
}

export function createMeanReversionStrategy(options: MeanReversionOptions): Strategy {
  if (options.lookback < 3 || options.entryZScore <= 0) {
    throw new Error("lookback must be >= 3 and entryZScore must be positive");
  }

  return (prices): Signal => {
    if (prices.length < options.lookback) {
      return hold("mean-reversion", prices.at(-1)?.timestamp ?? 0, "not enough observations");
    }

    const window = prices.slice(-options.lookback);
    const values = window.map((point) => point.price);
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error("prices must be finite and positive");
    }

    const latest = values.at(-1)!;
    const reference = values.slice(0, -1);
    const mean = reference.reduce((sum, value) => sum + value, 0) / reference.length;
    const variance = reference.reduce((sum, value) => sum + (value - mean) ** 2, 0) / reference.length;
    const deviation = Math.sqrt(variance);
    const zScore = deviation === 0 ? 0 : (latest - mean) / deviation;
    const observedAt = window.at(-1)!.timestamp;

    if (zScore <= -options.entryZScore) {
      return signal("buy-base", Math.min(1, Math.abs(zScore) / (options.entryZScore * 2)), zScore, observedAt);
    }
    if (zScore >= options.entryZScore) {
      return signal("sell-base", Math.min(1, Math.abs(zScore) / (options.entryZScore * 2)), zScore, observedAt);
    }
    return hold("mean-reversion", observedAt, `z-score ${zScore.toFixed(3)} is inside the entry band`);
  };
}

function signal(direction: "buy-base" | "sell-base", confidence: number, zScore: number, observedAt: number): Signal {
  return {
    strategy: "mean-reversion",
    direction,
    confidence,
    reason: `z-score ${zScore.toFixed(3)} crossed the entry band`,
    observedAt
  };
}

function hold(strategy: string, observedAt: number, reason: string): Signal {
  return { strategy, direction: "hold", confidence: 0, reason, observedAt };
}
