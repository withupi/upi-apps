---
"@withupi/upi-apps": minor
---

Track deep-link confidence per platform instead of once per app.

`androidConfidence` and `iosConfidence` replace the single `confidence` field
on each target -- the two are verified independently, on different hardware,
and an app can be `established` on one platform while `unverified` on the
other (MobiKwik, FamPay, slice and super.money are all in exactly this state
now). Added `isUpiAppTargetEstablished(appId, platform)` for callers building
a verification UI.

Promoted to `established` on iOS, confirmed on a real device: MobiKwik, FamPay,
slice, super.money. Their Android packages are unaffected and stay
`unverified`.

**Breaking**: `UpiAppTarget`'s `confidence` field is gone from
`targets.json` and the exported type.
