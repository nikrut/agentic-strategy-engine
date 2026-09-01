import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { evaluateRisk } from "../src/risk.js";
import type { RiskPolicy, RiskState, TradeIntent } from "../src/types.js";

const pool = "0x1111111111111111111111111111111111111111" as Address;
const tokenIn = "0x2222222222222222222222222222222222222222" as Address;
const tokenOut = "0x3333333333333333333333333333333333333333" as Address;
const vault = "0x4444444444444444444444444444444444444444" as Address;

const intent: TradeIntent = {
  chainId: 84_532,
  strategy: "test",
  pool,
  tokenIn,
  tokenOut,
  amountIn: 100n,
  quotedAmountOut: 200n,
  minAmountOut: 198n,
  recipient: vault,
  deadline: 1_120n,
  createdAt: 1_000,
  reason: "fixture"
};

const policy: RiskPolicy = {
  chainId: 84_532,
  vault,
  allowedPools: [pool],
  allowedTokens: [tokenIn, tokenOut],
  maxInputByToken: { [tokenIn]: 200n },
  maxDailyInputByToken: { [tokenIn]: 500n },
  maxDailyCalls: 5,
  maxSlippageBps: 100,
  maxDeadlineSeconds: 180,
  cooldownSeconds: 60,
  maxDrawdownBps: 500
};

const state: RiskState = { now: 1_000, callsToday: 1, spentTodayByToken: { [tokenIn]: 100n }, drawdownBps: 100 };

describe("risk engine", () => {
  it("approves an intent that satisfies all invariants", () => {
    expect(evaluateRisk(intent, policy, state)).toEqual({
      approved: true,
      code: "APPROVED",
      reason: "intent satisfies every configured risk invariant"
    });
  });

  it.each([
    [{ ...intent, chainId: 1 }, "WRONG_CHAIN"],
    [{ ...intent, amountIn: 201n }, "INPUT_LIMIT"],
    [{ ...intent, recipient: tokenOut }, "WRONG_RECIPIENT"],
    [{ ...intent, minAmountOut: 190n }, "SLIPPAGE_LIMIT"],
    [{ ...intent, deadline: 1_500n }, "DEADLINE_LIMIT"]
  ] as const)("rejects a bounded-risk violation", (candidate, code) => {
    expect(evaluateRisk(candidate, policy, state).code).toBe(code);
  });

  it("activates cooldown and drawdown circuit breakers", () => {
    expect(evaluateRisk(intent, policy, { ...state, lastExecutionAt: 970 }).code).toBe("COOLDOWN");
    expect(evaluateRisk(intent, policy, { ...state, drawdownBps: 501 }).code).toBe("DRAWDOWN_LIMIT");
  });

  it("fails closed on an invalid policy", () => {
    expect(evaluateRisk(intent, { ...policy, chainId: 1 }, state).code).toBe("POLICY_INVALID");
    expect(evaluateRisk(intent, { ...policy, maxSlippageBps: 10_000 }, state).code).toBe("POLICY_INVALID");
    expect(evaluateRisk(intent, policy, { ...state, spentTodayByToken: { [tokenIn]: -1n } }).code).toBe("POLICY_INVALID");
  });
});
