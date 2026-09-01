# Agentic Strategy Engine

A deterministic TypeScript pipeline for testing bounded autonomous-trading ideas on a Sepolia L2 (chain ID `84532`). It turns market observations into explainable signals, builds a constrained trade intent, evaluates explicit risk invariants, and encodes calldata for an external budget vault.

This is a local MVP and research tool. It does **not** hold a private key, sign transactions, submit trades, promise profitability, or use real funds.

## Why it is useful

- Compare mean-reversion and momentum rules on reproducible price fixtures.
- Inspect why a strategy chose buy, sell, or hold.
- Quote a constant-product swap and set a deterministic minimum output.
- Reject intents that violate chain, allowlist, budget, slippage, deadline, cooldown, daily-call, or drawdown rules.
- Encode the accepted swap as `AgentBudgetVault.execute(pool, 0, calldata)`.
- Run a small cost-aware backtest before integrating any executor.

## Safety architecture

```text
price history -> strategy signal -> trade planner -> risk engine -> calldata
                                                            |
                                                       no signer here
```

The engine cannot execute a transaction. A separate, tightly permissioned executor must independently verify the chain and risk decision before signing. Swap proceeds are always planned back to the vault address.

## Quick start

Requires Node.js 22+ and pnpm.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm backtest
```

The included fixture is synthetic and exists only to make results reproducible.

## From signal to calldata

```ts
import {
  TARGET_CHAIN_ID,
  createMeanReversionStrategy,
  encodeTrade,
  evaluateRisk,
  planTrade
} from "agentic-strategy-engine";

const signal = createMeanReversionStrategy({ lookback: 20, entryZScore: 2 })(prices);
const intent = planTrade(signal, poolSnapshot, {
  chainId: TARGET_CHAIN_ID,
  vault,
  baseInputAmount: 10n ** 15n,
  quoteInputAmount: 10n ** 6n,
  maxSlippageBps: 100,
  deadlineSeconds: 120
});

if (intent) {
  const decision = evaluateRisk(intent, policy, liveRiskState);
  if (decision.approved) {
    const { vaultCalldata } = encodeTrade(intent);
    // Hand calldata to a separate, policy-bound executor after revalidation.
  }
}
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the trust boundaries and [`SECURITY.md`](SECURITY.md) before connecting an executor.

## Strategies

- **Mean reversion:** compares the latest price with the mean and standard deviation of preceding observations.
- **Momentum:** compares the first and last price in a rolling window.

Both are intentionally transparent baselines, not investment advice. Add strategies behind the same `Strategy` interface and preserve deterministic inputs.

## Relationship to the vault

The encoder targets a vault with this interface:

```solidity
execute(address target, uint256 value, bytes data)
```

The nested pool call is:

```solidity
swapExactIn(address tokenIn, uint256 amountIn, uint256 minAmountOut, address recipient, uint256 deadline)
```

The compatible reference vault lives in the separate `agent-budget-vault` project. Neither project contains production credentials.

## Limitations

- The backtester uses close prices and a simplified execution-cost model.
- It does not model latency, MEV, gas, variable liquidity, failed transactions, or oracle quality.
- Constant-product quotes use one pool snapshot and can become stale immediately.
- Risk state must come from a trusted source in any executor integration.

## License

MIT. See [`LICENSE`](LICENSE).
