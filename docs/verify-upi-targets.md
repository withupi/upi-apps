# Verifying UPI deep-link targets

`src/targets.json` maps each UPI app to the URL scheme (iOS)
or package name (Android) we use to open it directly, instead of the contested
`upi://` scheme that the OS resolves arbitrarily.

None of this is published as a spec. The entries are conventions observed across
Indian merchant SDKs, and apps do change them between releases. So the table
needs re-checking — after a major release of any listed app, and before adding
anything new.

Each platform an app has a value for is marked `"androidConfidence"` and/or
`"iosConfidence"`, each `"established"` or `"unverified"` -- tracked
separately because the two are verified independently, often on different
hardware, and confirming one says nothing about the other. Only `established`
values appear in the payment app picker for that platform; `unverified` ones
are parked in the table so this procedure has something concrete to test.
Promote a platform's value only after it passes on a real device -- the other
platform, if present, keeps its own state.

## What "passes" means

A target passes when, with the app installed, the link opens **that app** on its
UPI payment screen with the payee and amount already filled in.

These do **not** count as passing:

- The app opens to its home screen or a blank screen — the scheme resolved but
  the path or params didn't.
- A different app opens — the scheme is contested and you have not actually
  bypassed anything.
- It works on a simulator but not a device. Simulators do not have real UPI apps
  installed; they can only ever tell you a scheme is *un*claimed.

## iOS

Real device only, with the app installed and your app's Info.plist carrying the
scheme in `LSApplicationQueriesSchemes`. If you generate that list from this
table — an Expo config plugin reading `@withupi/upi-apps/targets.json`, say —
re-run your prebuild after editing it.

**A prebuild alone is not enough.** `LSApplicationQueriesSchemes` is compiled
into the app's `Info.plist` at build time, not read live -- editing
`targets.json` and regenerating has no effect on a build already on your
phone. `canOpenURL` will keep returning `false` for the new scheme until the
app is actually rebuilt and reinstalled (`npx expo run:ios`, an EAS build,
whatever your normal path is). This looks identical to "the scheme is wrong"
from the test in step 1 below, so if a scheme you just added still doesn't show
up, rebuild before you doubt the scheme -- and note that testing the raw URL in
Safari doesn't catch this at all: Safari has no allowlist, so it'll happily open
a scheme our app hasn't declared yet, which is why "it worked when I typed it
into Safari" can still fail step 1 here.

1. Check the scheme is visible to your app at all -- `canOpenURL` is what a
   picker filters on, and it answers `false` for anything not in the allowlist:

   ```js
   import { Linking } from "react-native";
   import { getUpiAppIosScheme } from "@withupi/upi-apps";

   console.log(await Linking.canOpenURL(getUpiAppIosScheme("phonepe")));
   ```

   An app that is installed but answers `false` means the scheme in the table
   is wrong, or it isn't in `LSApplicationQueriesSchemes`.

2. Then confirm the full link lands on a filled-in payment screen — step 1 only
   proves something claims the scheme, not that it understands the params.

Note that `LSApplicationQueriesSchemes` is capped at 50 entries by Apple. The
table is well under, but that is the ceiling if it grows.

## Android

Real device or emulator with the app installed. `adb` can fire the exact intent
`buildAndroidIntentUri` describes:

```bash
adb shell am start -a android.intent.action.VIEW -d 'upi://pay?pa=test@ybl&pn=Test&am=1&cu=INR' -p com.phonepe.app
```

`Activity not started, unable to resolve Intent` means the package name is wrong
or the app is not installed. Verify which it is:

```bash
adb shell pm list packages | grep -i phonepe
```

Package names also have to be declared in your manifest's `<queries>` (Android
11+) or the launch fails at runtime exactly as if the app were missing, even
though `adb` succeeds. If you generate `<queries>` from this table, regenerate
and rebuild before doubting a package name.

## Open questions as of 2026-09-12

- **Super Money's iOS scheme is confirmed**: `super://pay?pa=...&pn=...&am=...&cu=INR`
  lands on a filled-in payment screen (real device, first checked 2026-09-02,
  re-confirmed 2026-09-12 via the in-app tester). Note it is `super://`, not
  `supermoney://` — `supermoney://pay` opens the app but drops every param and
  lands on the home screen, which looks like success from the
  scheme-registration side (`canOpenURL` returns true for it too, since the app
  claims that scheme as well) but silently fails the actual payment. That gap
  is exactly why step 2 above (confirm the _filled-in screen_, not just that
  the app opened) isn't optional.
- **Super Money's Android package is `money.super.payments`**, corrected from
  an earlier guess (`com.hsb.super`, against
  [shambu2k/upi-intent](https://github.com/shambu2k/upi-intent)) against its
  Play Store listing -- "super.money — UPI by Flipkart". That listing proves
  the package exists, not that it handles a UPI intent, so it's still
  `androidConfidence: "unverified"`. Someone with an Android device should
  run it through the procedure above.
- **MobiKwik's iOS scheme (`mobikwik://upi/pay`) confirmed on a real iPhone
  (2026-09-12)**, landing on a filled-in payment screen -- `iosConfidence` is
  `established`. Its Android package (`com.mobikwik_new`) is untouched by this
  and stays `unverified`.
- **`fampay`'s Android package went briefly wrong and back.** shambu2k/upi-intent
  lists `in.fampay.app` as FamPay's _Android package_; we changed to that from
  `com.fampay.in` on its word, then a user report ("FamPay opens but nothing
  gets deducted") and a check against the current Play Store listing
  ([FamApp by Trio: UPI & Card, package `com.fampay.in`](https://play.google.com/store/apps/details?id=com.fampay.in))
  showed the original value was right and the "correction" wasn't. Reverted.
  The likely explanation: `in.fampay.app` is real, but it's FamPay's **iOS
  scheme**, not its Android package -- shambu2k's table put it in the wrong
  column, or conflated the two. [drenther/upi_pay](https://github.com/drenther/upi_pay),
  a maintained Flutter package, lists `in.fampay.app` specifically as an iOS
  `LSApplicationQueriesSchemes` entry, which lines up. We've now added
  `"iosScheme": "in.fampay.app://pay"` on that basis -- the bare scheme has a
  real citation, the `/pay` path appended after it is still our own
  convention-following guess. This is also the concrete lesson from this whole
  episode: shambu2k/upi-intent has now been wrong on FamPay's Android package
  once and is unverified on everything else it lists here -- treat every value
  from it as a candidate to test, not a fact.
  **`in.fampay.app://pay` confirmed on a real iPhone (2026-09-12)**, landing on
  a filled-in payment screen -- `iosConfidence` is `established`. The Android
  package is still just the reverted, Play-Store-confirmed value above,
  unverified as a working UPI intent.
- **`slice`'s Android package** (`com.sliceit.app` vs. shambu2k's
  `com.slice.pay`) is still an open, un-actioned discrepancy -- not touched,
  precisely because the fampay episode above is a reason to distrust that
  source rather than a reason to trust it more. Needs an Android device to
  settle either way.
- **`slice`'s iOS scheme** (`slicepay://pay`) traced back to the weakest source
  in this table -- a search-engine summary claiming Slice uses `slice://upi/pay`,
  which none of the actual pages behind that summary (Razorpay's iOS
  UPI-intent doc, a UPI deep-linking blog post) contain when fetched directly.
  `slicepay://pay` came from shambu2k's bare `slicepay://` plus our usual
  `/pay` convention instead, which was no more solid on its own.
  **Confirmed on a real iPhone (2026-09-12)**: `slicepay://pay` lands on a
  filled-in payment screen as-is -- `iosConfidence` is `established`, and
  `slice://upi/pay` was never needed. The Android package discrepancy above is
  untouched by this.
  - `bhim`: repo lists a bare `bhim://`, we have `bhim://upi/pay` with an extra
    path segment. **Checked on a real device (2026-09-02) -- `bhim://upi/pay`
    is correct as-is**, landing on a filled-in payment screen. The repo's bare
    scheme is presumably just it not documenting the full path, not evidence
    ours is wrong -- worth remembering it's a rougher source than it looks.
  - `cred`: same discrepancy (`credpay://` vs our `credpay://upi/pay`), not yet
    checked.

## Adding an app

1. Make sure the app has an id in `src/apps.ts` -- see CONTRIBUTING.md if it is
   new to the package entirely.
2. Add the target to `src/targets.json` with `"androidConfidence"` and/or
   `"iosConfidence"` set to `"unverified"`, for whichever platform(s) you have
   a value for.
3. Regenerate whatever your app derives from the table (Info.plist schemes,
   manifest `<queries>`) and rebuild -- neither is read at runtime.
4. Verify per the above, then promote to `"established"`.

## Checking the link format itself

The builders in `src/links.ts` are pure, so the generated URIs can be inspected
without a device:

```bash
pnpm tsx -e 'import { buildUpiAppLink } from "./src/index.ts"; console.log(buildUpiAppLink({ appId: "phonepe", platform: "ios", request: { name: "Test", upiId: "test@ybl", amount: 1 } }))'
```

Two format decisions there are deliberate and worth not "fixing" back:

- `am` is omitted entirely when there's no amount. An empty `am=` gets the whole
  intent dropped by some parsers.
- Spaces are `%20` and `@` is left unencoded, rather than the `+`/`%40` that
  `URLSearchParams.toString()` produces. Both are RFC-legal and match what real
  UPI QRs contain.
