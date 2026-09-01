import type { BacktestConfig, BacktestResult, PricePoint, Strategy } from "./types.js";

export function runBacktest(prices: readonly PricePoint[], strategy: Strategy, config: BacktestConfig): BacktestResult {
  if (prices.length < 2) throw new Error("backtest needs at least two prices");
  if (prices.some((point, index) =>
    !Number.isFinite(point.price) || point.price <= 0 ||
    !Number.isSafeInteger(point.timestamp) ||
    (index > 0 && point.timestamp <= prices[index - 1]!.timestamp)
  )) {
    throw new Error("prices must be positive, finite, and strictly ordered by integer timestamp");
  }
  if (config.initialBase < 0 || config.initialQuote < 0 || config.tradeFraction <= 0 || config.tradeFraction > 1) {
    throw new Error("invalid starting balances or trade fraction");
  }
  if (config.feeBps < 0 || config.slippageBps < 0 || config.feeBps + config.slippageBps >= 10_000) {
    throw new Error("invalid execution costs");
  }

  let base = config.initialBase;
  let quote = config.initialQuote;
  const initialEquity = quote + base * prices[0]!.price;
  if (initialEquity <= 0) throw new Error("initial portfolio equity must be positive");
  let peakEquity = initialEquity;
  let maxDrawdown = 0;
  let trades = 0;
  const executionFactor = 1 - (config.feeBps + config.slippageBps) / 10_000;

  for (let index = 1; index < prices.length; index += 1) {
    const history = prices.slice(0, index + 1);
    const current = prices[index]!;
    const signal = strategy(history);

    if (signal.direction === "buy-base" && quote > 0) {
      const quoteSpent = quote * config.tradeFraction;
      base += (quoteSpent / current.price) * executionFactor;
      quote -= quoteSpent;
      trades += 1;
    } else if (signal.direction === "sell-base" && base > 0) {
      const baseSold = base * config.tradeFraction;
      quote += baseSold * current.price * executionFactor;
      base -= baseSold;
      trades += 1;
    }

    const equity = quote + base * current.price;
    peakEquity = Math.max(peakEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, peakEquity === 0 ? 0 : (peakEquity - equity) / peakEquity);
  }

  const finalPrice = prices.at(-1)!.price;
  const finalEquity = quote + base * finalPrice;
  return {
    initialEquity,
    finalEquity,
    returnBps: ((finalEquity / initialEquity) - 1) * 10_000,
    maxDrawdownBps: maxDrawdown * 10_000,
    trades,
    baseBalance: base,
    quoteBalance: quote
  };
}
