import { getAddress, type Address } from "viem";
import { TARGET_CHAIN_ID, type RiskDecision, type RiskPolicy, type RiskState, type TradeIntent } from "./types.js";

export function evaluateRisk(intent: TradeIntent, policy: RiskPolicy, state: RiskState): RiskDecision {
  const policyError = validatePolicy(policy, state);
  if (policyError) return reject("POLICY_INVALID", policyError);
  if (intent.chainId !== TARGET_CHAIN_ID || intent.chainId !== policy.chainId) {
    return reject("WRONG_CHAIN", "intent targets a different chain");
  }
  try {
    if (!includesAddress(policy.allowedPools, intent.pool)) return reject("POOL_NOT_ALLOWED", "pool is not allowlisted");
    if (!includesAddress(policy.allowedTokens, intent.tokenIn) || !includesAddress(policy.allowedTokens, intent.tokenOut)) {
      return reject("TOKEN_NOT_ALLOWED", "input or output token is not allowlisted");
    }
    if (getAddress(intent.recipient) !== getAddress(policy.vault)) {
      return reject("WRONG_RECIPIENT", "swap proceeds must return to the vault");
    }
  } catch {
    return reject("POLICY_INVALID", "intent or policy contains an invalid address");
  }
  if (intent.amountIn <= 0n) return reject("ZERO_AMOUNT", "input amount must be positive");

  const maxInput = lookup(policy.maxInputByToken, intent.tokenIn);
  if (maxInput === undefined || intent.amountIn > maxInput) return reject("INPUT_LIMIT", "per-intent input limit exceeded");

  const dailyLimit = lookup(policy.maxDailyInputByToken, intent.tokenIn);
  const spent = lookup(state.spentTodayByToken, intent.tokenIn) ?? 0n;
  if (dailyLimit === undefined || spent + intent.amountIn > dailyLimit) {
    return reject("DAILY_INPUT_LIMIT", "daily token input limit exceeded");
  }
  if (state.callsToday >= policy.maxDailyCalls) return reject("DAILY_CALL_LIMIT", "daily call limit reached");
  if (intent.quotedAmountOut <= 0n || intent.minAmountOut <= 0n || intent.minAmountOut > intent.quotedAmountOut) {
    return reject("INVALID_QUOTE", "output quote or minimum output is invalid");
  }

  const minimumAllowed = (intent.quotedAmountOut * BigInt(10_000 - policy.maxSlippageBps)) / 10_000n;
  if (intent.minAmountOut < minimumAllowed) return reject("SLIPPAGE_LIMIT", "minimum output permits excessive slippage");

  const remaining = intent.deadline - BigInt(state.now);
  if (remaining <= 0n || remaining > BigInt(policy.maxDeadlineSeconds)) {
    return reject("DEADLINE_LIMIT", "deadline is expired or too far in the future");
  }
  if (state.lastExecutionAt !== undefined && state.now - state.lastExecutionAt < policy.cooldownSeconds) {
    return reject("COOLDOWN", "strategy cooldown is still active");
  }
  if (state.drawdownBps > policy.maxDrawdownBps) return reject("DRAWDOWN_LIMIT", "drawdown circuit breaker is active");

  return { approved: true, code: "APPROVED", reason: "intent satisfies every configured risk invariant" };
}

function validatePolicy(policy: RiskPolicy, state: RiskState): string | null {
  if (policy.chainId !== TARGET_CHAIN_ID) return `policy chainId must be ${TARGET_CHAIN_ID}`;
  const nonnegativeIntegers = [
    policy.maxDailyCalls,
    policy.maxSlippageBps,
    policy.maxDeadlineSeconds,
    policy.cooldownSeconds,
    policy.maxDrawdownBps,
    state.now,
    state.callsToday,
    state.drawdownBps
  ];
  if (nonnegativeIntegers.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    return "policy and state counters must be nonnegative safe integers";
  }
  if (policy.maxSlippageBps >= 10_000 || policy.maxDrawdownBps > 10_000 || policy.maxDeadlineSeconds === 0) {
    return "policy basis-point and deadline bounds are invalid";
  }
  if (state.lastExecutionAt !== undefined && (!Number.isSafeInteger(state.lastExecutionAt) || state.lastExecutionAt < 0)) {
    return "last execution timestamp is invalid";
  }
  const limits = [
    ...Object.values(policy.maxInputByToken),
    ...Object.values(policy.maxDailyInputByToken),
    ...Object.values(state.spentTodayByToken)
  ];
  if (limits.some((value) => value !== undefined && value < 0n)) return "token limits and spend must be nonnegative";
  try {
    [
      policy.vault,
      ...policy.allowedPools,
      ...policy.allowedTokens,
      ...Object.keys(policy.maxInputByToken),
      ...Object.keys(policy.maxDailyInputByToken),
      ...Object.keys(state.spentTodayByToken)
    ].forEach((address) => getAddress(address as Address));
  } catch {
    return "policy contains an invalid address";
  }
  return null;
}

function reject(code: Exclude<RiskDecision["code"], "APPROVED">, reason: string): RiskDecision {
  return { approved: false, code, reason };
}

function includesAddress(values: readonly Address[], candidate: Address): boolean {
  const normalized = getAddress(candidate);
  return values.some((value) => getAddress(value) === normalized);
}

function lookup<T>(record: Readonly<Partial<Record<Address, T>>>, address: Address): T | undefined {
  const normalized = getAddress(address);
  for (const [key, value] of Object.entries(record)) {
    if (getAddress(key as Address) === normalized) return value;
  }
  return undefined;
}
