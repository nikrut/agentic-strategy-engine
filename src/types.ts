import type { Address, Hex } from "viem";

export const TARGET_CHAIN_ID = 84_532;

export type Direction = "buy-base" | "sell-base" | "hold";

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface Signal {
  strategy: string;
  direction: Direction;
  confidence: number;
  reason: string;
  observedAt: number;
}

export interface PoolSnapshot {
  pool: Address;
  baseToken: Address;
  quoteToken: Address;
  baseReserve: bigint;
  quoteReserve: bigint;
  feeBps: number;
  observedAt: number;
}

export interface PlannerConfig {
  chainId: number;
  vault: Address;
  baseInputAmount: bigint;
  quoteInputAmount: bigint;
  maxSlippageBps: number;
  deadlineSeconds: number;
}

export interface TradeIntent {
  chainId: number;
  strategy: string;
  pool: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  quotedAmountOut: bigint;
  minAmountOut: bigint;
  recipient: Address;
  deadline: bigint;
  createdAt: number;
  reason: string;
}

export type RiskCode =
  | "APPROVED"
  | "POLICY_INVALID"
  | "WRONG_CHAIN"
  | "POOL_NOT_ALLOWED"
  | "TOKEN_NOT_ALLOWED"
  | "WRONG_RECIPIENT"
  | "ZERO_AMOUNT"
  | "INPUT_LIMIT"
  | "DAILY_INPUT_LIMIT"
  | "DAILY_CALL_LIMIT"
  | "INVALID_QUOTE"
  | "SLIPPAGE_LIMIT"
  | "DEADLINE_LIMIT"
  | "COOLDOWN"
  | "DRAWDOWN_LIMIT";

export interface RiskDecision {
  approved: boolean;
  code: RiskCode;
  reason: string;
}

export interface RiskPolicy {
  chainId: number;
  vault: Address;
  allowedPools: readonly Address[];
  allowedTokens: readonly Address[];
  maxInputByToken: Readonly<Record<Address, bigint>>;
  maxDailyInputByToken: Readonly<Record<Address, bigint>>;
  maxDailyCalls: number;
  maxSlippageBps: number;
  maxDeadlineSeconds: number;
  cooldownSeconds: number;
  maxDrawdownBps: number;
}

export interface RiskState {
  now: number;
  callsToday: number;
  spentTodayByToken: Readonly<Partial<Record<Address, bigint>>>;
  lastExecutionAt?: number;
  drawdownBps: number;
}

export interface EncodedTrade {
  poolCalldata: Hex;
  vaultCalldata: Hex;
}

export interface BacktestConfig {
  initialQuote: number;
  initialBase: number;
  tradeFraction: number;
  feeBps: number;
  slippageBps: number;
}

export interface BacktestResult {
  initialEquity: number;
  finalEquity: number;
  returnBps: number;
  maxDrawdownBps: number;
  trades: number;
  baseBalance: number;
  quoteBalance: number;
}

export type Strategy = (prices: readonly PricePoint[]) => Signal;
