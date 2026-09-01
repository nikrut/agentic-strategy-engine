import { describe, expect, it } from "vitest";
import { createMeanReversionStrategy } from "../src/strategies/mean-reversion.js";
import { createMomentumStrategy } from "../src/strategies/momentum.js";

const points = (values: number[]) => values.map((price, timestamp) => ({ price, timestamp }));

describe("strategies", () => {
  it("buys a statistically depressed observation", () => {
    const strategy = createMeanReversionStrategy({ lookback: 5, entryZScore: 1.5 });
    const signal = strategy(points([100, 101, 99, 100, 90]));
    expect(signal.direction).toBe("buy-base");
    expect(signal.reason).toContain("z-score");
  });

  it("sells a statistically elevated observation", () => {
    const strategy = createMeanReversionStrategy({ lookback: 5, entryZScore: 1.5 });
    expect(strategy(points([100, 101, 99, 100, 112])).direction).toBe("sell-base");
  });

  it("follows positive and negative momentum", () => {
    const strategy = createMomentumStrategy({ lookback: 3, entryReturnBps: 300 });
    expect(strategy(points([100, 102, 105])).direction).toBe("buy-base");
    expect(strategy(points([105, 102, 99])).direction).toBe("sell-base");
  });

  it("holds until enough observations exist", () => {
    const strategy = createMomentumStrategy({ lookback: 4, entryReturnBps: 100 });
    expect(strategy(points([100, 102])).direction).toBe("hold");
  });
});
