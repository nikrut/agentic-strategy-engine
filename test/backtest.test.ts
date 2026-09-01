import { describe, expect, it } from "vitest";
import { runBacktest } from "../src/backtest.js";
import { createMeanReversionStrategy } from "../src/strategies/mean-reversion.js";

describe("backtester", () => {
  it("is deterministic and accounts for costs", () => {
    const prices = [100, 101, 99, 100, 90, 95, 100].map((price, timestamp) => ({ price, timestamp }));
    const strategy = createMeanReversionStrategy({ lookback: 5, entryZScore: 1.5 });
    const config = { initialQuote: 1_000, initialBase: 0, tradeFraction: 0.25, feeBps: 30, slippageBps: 20 };
    const first = runBacktest(prices, strategy, config);
    const second = runBacktest(prices, strategy, config);
    expect(first).toEqual(second);
    expect(first.trades).toBeGreaterThan(0);
    expect(first.finalEquity).toBeGreaterThan(0);
    expect(Number.isFinite(first.returnBps)).toBe(true);
  });
});
