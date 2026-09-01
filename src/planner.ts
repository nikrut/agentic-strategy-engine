import { TARGET_CHAIN_ID, type PlannerConfig, type PoolSnapshot, type Signal, type TradeIntent } from "./types.js";

const BPS = 10_000n;

export function planTrade(signal: Signal, pool: PoolSnapshot, config: PlannerConfig): TradeIntent | null {
  if (signal.direction === "hold") return null;
  if (config.chainId !== TARGET_CHAIN_ID) throw new Error(`chainId must be ${TARGET_CHAIN_ID}`);
  assertBps(pool.feeBps, "pool fee");
  assertBps(config.maxSlippageBps, "slippage");
  if (config.deadlineSeconds <= 0 || !Number.isSafeInteger(config.deadlineSeconds)) {
    throw new Error("deadlineSeconds must be a positive integer");
  }

  const buying = signal.direction === "buy-base";
  const amountIn = buying ? config.quoteInputAmount : config.baseInputAmount;
  const reserveIn = buying ? pool.quoteReserve : pool.baseReserve;
  const reserveOut = buying ? pool.baseReserve : pool.quoteReserve;
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error("amount and reserves must be positive");
  }

  const quotedAmountOut = quoteConstantProduct(amountIn, reserveIn, reserveOut, pool.feeBps);
  if (quotedAmountOut <= 0n) throw new Error("trade amount is too small for the pool reserves");
  const minAmountOut = (quotedAmountOut * (BPS - BigInt(config.maxSlippageBps))) / BPS;

  return {
    chainId: config.chainId,
    strategy: signal.strategy,
    pool: pool.pool,
    tokenIn: buying ? pool.quoteToken : pool.baseToken,
    tokenOut: buying ? pool.baseToken : pool.quoteToken,
    amountIn,
    quotedAmountOut,
    minAmountOut,
    recipient: config.vault,
    deadline: BigInt(signal.observedAt + config.deadlineSeconds),
    createdAt: signal.observedAt,
    reason: signal.reason
  };
}

export function quoteConstantProduct(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps: number): bigint {
  assertBps(feeBps, "fee");
  const amountInAfterFee = amountIn * (BPS - BigInt(feeBps));
  return (amountInAfterFee * reserveOut) / (reserveIn * BPS + amountInAfterFee);
}

function assertBps(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value >= 10_000) {
    throw new Error(`${name} bps must be an integer between 0 and 9999`);
  }
}
