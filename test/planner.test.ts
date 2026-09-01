import { describe, expect, it } from "vitest";
import { planTrade, quoteConstantProduct } from "../src/planner.js";
import type { PoolSnapshot, Signal } from "../src/types.js";

const pool = {
  pool: "0x1111111111111111111111111111111111111111",
  baseToken: "0x2222222222222222222222222222222222222222",
  quoteToken: "0x3333333333333333333333333333333333333333",
  baseReserve: 1_000_000n,
  quoteReserve: 2_000_000n,
  feeBps: 30,
  observedAt: 1_000
} satisfies PoolSnapshot;

const config = {
  chainId: 84_532,
  vault: "0x4444444444444444444444444444444444444444" as const,
  baseInputAmount: 10_000n,
  quoteInputAmount: 20_000n,
  maxSlippageBps: 100,
  deadlineSeconds: 120
};

describe("trade planner", () => {
  it("maps a buy signal to quote-token input and a conservative minimum", () => {
    const signal: Signal = { strategy: "test", direction: "buy-base", confidence: 1, reason: "fixture", observedAt: 1_000 };
    const intent = planTrade(signal, pool, config)!;
    expect(intent.tokenIn).toBe(pool.quoteToken);
    expect(intent.tokenOut).toBe(pool.baseToken);
    expect(intent.recipient).toBe(config.vault);
    expect(intent.minAmountOut).toBe(intent.quotedAmountOut * 9_900n / 10_000n);
    expect(intent.deadline).toBe(1_120n);
  });

  it("returns no intent for hold", () => {
    const signal: Signal = { strategy: "test", direction: "hold", confidence: 0, reason: "fixture", observedAt: 1_000 };
    expect(planTrade(signal, pool, config)).toBeNull();
  });

  it("quotes constant-product output after fees", () => {
    expect(quoteConstantProduct(10_000n, 1_000_000n, 2_000_000n, 30)).toBe(19_743n);
  });

  it("refuses to plan for another chain", () => {
    const signal: Signal = { strategy: "test", direction: "buy-base", confidence: 1, reason: "fixture", observedAt: 1_000 };
    expect(() => planTrade(signal, pool, { ...config, chainId: 1 })).toThrow("chainId must be 84532");
  });
});
