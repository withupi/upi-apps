# @withupi/upi-apps

## 0.2.0

### Minor Changes

- 9fdfd15: Add Android deep-link targets for WhatsApp, Flipkart, Groww, Jupiter, Tata Neu,
  Kiwi, INDmoney, BharatPe, OneCard and Samsung Pay, each sourced from its Play
  Store listing and marked `unverified` pending a device check.

  Correct super.money's Android package to `money.super.payments`; the previous
  `com.hsb.super` was a guess from a third-party list.

- 3c92f5a: Track deep-link confidence per platform instead of once per app.

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

## 0.1.1

### Patch Changes

- Attribute copyright to Publish Studio, the registered entity behind WithUPI.
