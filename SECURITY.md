# Security Policy

## Intended use

This repository is a local testnet research MVP. Use a dedicated development wallet with valueless test assets only. The code does not require or read a private key.

## Non-negotiable controls

- Never add a seed phrase, private key, API secret, or funded-wallet credential.
- Keep signing and broadcasting in a separate least-privilege executor.
- Re-fetch onchain state, re-run risk checks, simulate, and verify chain ID `84532` immediately before signing.
- Treat price feeds, pool snapshots, and persisted risk state as untrusted inputs.
- Keep contract allowlists narrow and revoke the executor when unattended operation is not needed.
- Start with zero real value; test failure, stale-data, and RPC-manipulation paths.

## Known limitations

This code has not received an independent security audit. The backtester is not an execution simulator, and passing tests cannot establish profitability or production safety.

## Reporting

Please open a private GitHub security advisory rather than a public issue for a suspected vulnerability.
