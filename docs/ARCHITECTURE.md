# Architecture

## Pipeline

1. A caller provides timestamped price history and an independently obtained pool snapshot.
2. A pure strategy returns an explainable `Signal`.
3. The planner converts a non-hold signal into a `TradeIntent` for chain ID `84532`.
4. The risk engine evaluates the intent against policy and current budget state.
5. The encoder creates pool calldata and wraps it in a zero-native-value vault call.
6. An external executor may revalidate, simulate, sign, and submit the call.

Each stage is deterministic for the same inputs. No module fetches prices, reads secrets, signs messages, or broadcasts transactions.

## Trust boundaries

| Component | Trusted for | Not trusted for |
| --- | --- | --- |
| Data adapter (external) | Supplying observations | Deciding or executing trades |
| Strategy | Producing a signal | Bypassing policy |
| Planner | Constructing an intent | Authorizing execution |
| Risk engine | Deterministic policy evaluation | Authenticating live state |
| Vault contract | Onchain budget enforcement | Market-data correctness |
| Executor (external) | Revalidation and signing | Expanding vault permissions |

## Important invariants

- The chain ID is exact, never inferred.
- Pool and both token addresses must be allowlisted.
- The swap recipient is the vault.
- Native value is always zero in encoded vault calls.
- Minimum output cannot permit more than configured slippage.
- Deadlines are short and bounded.
- Per-intent and daily token-input caps are separate.
- Cooldown and drawdown circuit breakers fail closed.

## Extending the engine

New strategies should remain pure functions over immutable history. Data adapters and transaction executors belong in separate packages so credential access cannot silently enter the research engine.
