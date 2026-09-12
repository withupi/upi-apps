---
"@withupi/upi-apps": patch
---

Add a generated verification status table to the README, tracking every
target's `androidConfidence` / `iosConfidence` from `src/targets.json`.
`pnpm docs:status --write` regenerates it; CI fails if it's stale.
