---
"@withupi/upi-apps": minor
---

Demote BHIM's iOS scheme and Android package to `unverified`, so `getUpiAppTargets`
no longer returns BHIM on either platform. BHIM 4.0.30 rejects payment links to
personal VPAs: on iOS it opens and shows "This request type is not supported"
(merchant VPAs still work), and on Android it disables its own `upi://` handler,
so the intent resolves to nothing. The values themselves are unchanged. See
docs/verify-upi-targets.md for the device results.
