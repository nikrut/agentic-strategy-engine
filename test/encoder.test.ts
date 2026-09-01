import { decodeFunctionData, type Address } from "viem";
import { describe, expect, it } from "vitest";
import { encodeTrade, poolAbi, vaultAbi } from "../src/encoder.js";
import type { TradeIntent } from "../src/types.js";

it("encodes a validator-compatible pool call inside a zero-value vault execution", () => {
  const intent: TradeIntent = {
    chainId: 84_532,
    strategy: "test",
    pool: "0x1111111111111111111111111111111111111111",
    tokenIn: "0x2222222222222222222222222222222222222222",
    tokenOut: "0x3333333333333333333333333333333333333333",
    amountIn: 100n,
    quotedAmountOut: 200n,
    minAmountOut: 198n,
    recipient: "0x4444444444444444444444444444444444444444",
    deadline: 1_120n,
    createdAt: 1_000,
    reason: "fixture"
  };
  const encoded = encodeTrade(intent);
  const poolCall = decodeFunctionData({ abi: poolAbi, data: encoded.poolCalldata });
  expect(poolCall.functionName).toBe("swapExactIn");
  expect(poolCall.args).toEqual([intent.tokenIn, 100n, 198n, intent.recipient, 1_120n]);

  const vaultCall = decodeFunctionData({ abi: vaultAbi, data: encoded.vaultCalldata });
  expect(vaultCall.functionName).toBe("execute");
  expect(vaultCall.args[0] as Address).toBe(intent.pool);
  expect(vaultCall.args[1]).toBe(0n);
  expect(vaultCall.args[2]).toBe(encoded.poolCalldata);
});

it("refuses unsafe calldata inputs", () => {
  const unsafe: TradeIntent = {
    chainId: 1,
    strategy: "test",
    pool: "0x1111111111111111111111111111111111111111",
    tokenIn: "0x2222222222222222222222222222222222222222",
    tokenOut: "0x3333333333333333333333333333333333333333",
    amountIn: 100n,
    quotedAmountOut: 200n,
    minAmountOut: 198n,
    recipient: "0x4444444444444444444444444444444444444444",
    deadline: 1_120n,
    createdAt: 1_000,
    reason: "fixture"
  };
  expect(() => encodeTrade(unsafe)).toThrow("chainId must be 84532");
});
