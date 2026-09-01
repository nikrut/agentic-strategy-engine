import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runBacktest } from "./backtest.js";
import { createMeanReversionStrategy } from "./strategies/mean-reversion.js";
import type { PricePoint } from "./types.js";

const fixturePath = resolve(process.argv[2] ?? "fixtures/prices.json");
const prices = JSON.parse(await readFile(fixturePath, "utf8")) as PricePoint[];
const strategy = createMeanReversionStrategy({ lookback: 5, entryZScore: 1.4 });
const result = runBacktest(prices, strategy, {
  initialQuote: 1_000,
  initialBase: 0,
  tradeFraction: 0.2,
  feeBps: 30,
  slippageBps: 20
});

console.log(JSON.stringify({ fixture: fixturePath, strategy: "mean-reversion", result }, null, 2));
