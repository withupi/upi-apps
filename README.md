# @withupi/upi-apps

Work out which UPI app a VPA belongs to, and build links that open **that app**
on a filled-in payment screen.

```bash
npm install @withupi/upi-apps
```

No dependencies. ESM and CJS, with types.

## The problem this solves

`upi://pay?...` is a contested scheme: every UPI app on the device registers it,
and neither mobile OS lets you say "any UPI app, let the payer choose".

- **iOS** resolves it silently and arbitrarily. In practice the earliest
  installed claimant wins, so a payer with WhatsApp installed lands in WhatsApp
  Pay every time, whatever the URL says. There is no chooser, and no API to
  enumerate or influence the claimants.
- **Android** shows a chooser, but only until someone taps "Always". After
  that it is as silent as iOS.
- **Desktop browsers** have no handler at all, so the navigation strands the tab.

No amount of improving the `upi://` URL fixes this. The fix is to ask the payer
which app they want, then open that app's own uncontested scheme (iOS) or pin
the intent to its package (Android). This package holds the table of those
targets and the builders for both.

## Usage

### Which app is this VPA on?

```ts
import { detectUpiApp, UPI_APP_LABELS } from "@withupi/upi-apps";

detectUpiApp("someone@ybl"); // "phonepe"
detectUpiApp("someone@yesg"); // "groww"
detectUpiApp("someone@notahandle"); // "unknown"

const appId = detectUpiApp(vpa);
const label = appId === "unknown" ? "UPI" : UPI_APP_LABELS[appId];
```

Unmapped handles return `"unknown"` rather than a guess. This is shown to
someone about to send money, so a confidently wrong app name is worse than no
name at all.

### Open a specific app

```ts
import { buildUpiAppLink, getUpiAppTargets } from "@withupi/upi-apps";

// Apps you can actually open on this platform, for building a picker.
const choices = getUpiAppTargets("ios"); // ["googlepay", "phonepe", ...]

const link = buildUpiAppLink({
  appId: "phonepe",
  platform: "ios",
  request: { amount: 250, name: "Rahul Sharma", upiId: "rahul@ybl" },
});
// "phonepe://pay?cu=INR&pa=rahul@ybl&pn=Rahul%20Sharma&am=250"
```

`buildUpiAppLink` returns `undefined` when there is no usable target. Show the
QR code instead of a button that dead-ends.

### QR codes

```ts
import { buildUpiUri } from "@withupi/upi-apps";

buildUpiUri({ name: "Rahul Sharma", upiId: "rahul@ybl" });
// "upi://pay?cu=INR&pa=rahul@ybl&pn=Rahul%20Sharma"
```

The plain contested URI is the right thing for a QR: it is scanned from inside
the payer's chosen app, so no scheme resolution happens, and it is the one form
every app understands.

This package does not render the QR. Hand the string to whichever encoder suits
the surface (`qrcode` on the server and web, `react-native-qrcode-svg` in React
Native, CoreImage on iOS), because no single output format survives all of them.
Four settings decide whether the result actually scans:

- **Error correction `M`** is the right default. A UPI payload is short, so the
  extra redundancy of `H` costs you almost no density, but it buys nothing
  either unless you are covering part of the code. Use `H` if, and only if, you
  put a logo in the centre.
- **A quiet zone of at least 2 modules.** Scanners need the blank border to find
  the code at all. Most libraries default to 4; anything below 2 starts failing
  against a busy background, and a flush-cropped QR fails everywhere.
- **Render at 4x the module count or more.** A 256 px image of a 57-module code
  gives each module 4 px, which survives a phone camera at arm's length. Below
  that, scanning degrades before it looks wrong to the eye.
- **A centre logo must sit inside the error-correction budget.** At `H` that is
  30% of modules, but the safe covered area is nearer 10% of the code's area
  once you account for the finder patterns, which must stay clear.

The URI is a complete cache key for the image. Everything in it comes from the
payee, amount and note, so any change that would alter the QR also alters the
string. That means a rendered QR can be memoized indefinitely, keyed on the
link, with no invalidation to get wrong. Encoding is pure CPU (matrix
construction, then a PNG encode and deflate), so this is worth doing anywhere a
QR is generated per render.

## API

| Export                                                            | What it does                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `detectUpiApp(vpa)`                                               | `UpiAppId` or `"unknown"`, from the handle after `@`.           |
| `UPI_APP_LABELS`                                                  | Display name for every `UpiAppId`.                              |
| `KNOWN_HANDLES`                                                   | Every handle the package recognises.                            |
| `EXCLUDED_HANDLES`                                                | Handles deliberately left unmapped, and why (see below).        |
| `getUpiAppTargets(platform, { includeUnverified })`               | Apps openable on `"ios"` / `"android"`; `"other"` returns `[]`. |
| `isUpiAppTargetEstablished(appId, platform)`                      | Whether one app's target on that platform is confirmed.         |
| `buildUpiAppLink({ appId, platform, request, fallbackUrl })`      | Best link for one app, or `undefined`.                          |
| `buildUpiUri(request)`                                            | The plain `upi://pay` URI, for QR codes.                        |
| `buildAndroidIntentUri(request, { androidPackage, fallbackUrl })` | An `intent://` URI, optionally pinned to a package.             |
| `getUpiAppIosScheme(appId)` / `getUpiAppAndroidPackage(appId)`    | Raw target values, for building a native intent yourself.       |
| `sanitizeTransactionNote(note)`, `UPI_NOTE_MAX_LENGTH`            | Strip characters UPI apps reject from `tn`.                     |

`@withupi/upi-apps/targets.json` exports the raw target table for build-time
tooling that cannot run the TypeScript. Expo config plugins that generate
`LSApplicationQueriesSchemes` and `<queries>` read it this way.

Two encoding decisions are deliberate and worth not "fixing":

- **`am` is omitted entirely** when there is no positive amount. An empty `am=`
  makes some apps drop the whole intent, which the payer sees as a blank screen.
- **Spaces are `%20` and `@` is left unencoded**, rather than the `+` and `%40`
  that `URLSearchParams.toString()` produces. Both forms are legal under RFC
  3986, but UPI apps hand-roll their parsers and every QR in circulation carries
  the VPA unencoded.

## Detection and linking are separate

The handle map covers every app on NPCI's third-party list, around 50 of them.
The deep-link table covers fewer, because a target has to be tested before it's
listed, not just named.

So `detectUpiApp` will happily name an app that `getUpiAppTargets` won't offer.
That asymmetry is deliberate. Naming the payee's app wrongly is a cosmetic
error. Sending a payer into a link that silently drops the amount is a failed
payment.

Each target tracks confidence per platform, as `androidConfidence` and
`iosConfidence`, not once per app: the two are verified independently, often on
different hardware, and one being confirmed says nothing about the other. An
app can be `established` on iOS and `unverified` on Android at the same time.
`getUpiAppTargets` returns only `established` targets for the platform you ask
about, unless you pass
`includeUnverified: true`. `isUpiAppTargetEstablished(appId, platform)` answers
the same question for one app, which is what a verification UI wants. To
promote a target, follow
[docs/verify-upi-targets.md](docs/verify-upi-targets.md).

Current status, generated from `src/targets.json` by `pnpm docs:status`:

<!-- status:start -->

| App          | Android        | iOS            |
| ------------ | -------------- | -------------- |
| Amazon Pay   | ✅ Established | ✅ Established |
| BharatPe     | ⚠️ Unverified  | —              |
| BHIM         | ✅ Established | ✅ Established |
| CRED         | ✅ Established | ✅ Established |
| FamPay       | ⚠️ Unverified  | ✅ Established |
| Flipkart UPI | ⚠️ Unverified  | ✅ Established |
| Google Pay   | ✅ Established | ✅ Established |
| Groww        | ⚠️ Unverified  | —              |
| INDmoney     | ⚠️ Unverified  | ✅ Established |
| Jio          | ⚠️ Unverified  | ✅ Established |
| Jupiter      | ⚠️ Unverified  | —              |
| Kiwi         | ⚠️ Unverified  | —              |
| MobiKwik     | ⚠️ Unverified  | ✅ Established |
| Navi         | ⚠️ Unverified  | —              |
| OneCard      | ⚠️ Unverified  | —              |
| Paytm        | ✅ Established | ✅ Established |
| PhonePe      | ✅ Established | ✅ Established |
| Samsung Pay  | ⚠️ Unverified  | —              |
| slice        | ⚠️ Unverified  | ✅ Established |
| Super Money  | ⚠️ Unverified  | ✅ Established |
| Tata Neu     | ⚠️ Unverified  | —              |
| WhatsApp     | ⚠️ Unverified  | ✅ Established |

<!-- status:end -->

## Where the data comes from

Handles come from NPCI's published list of live UPI third-party application
providers, kept in [`data/`](data/) with a script to refresh it
(`pnpm sync:npci`). Two handles on that list are deliberately **not** mapped:

- `@icici`, listed under WhatsApp
- `@axisbank`, listed under T Wallet

Both are the PSP bank's own generic handle. The app does issue VPAs on them,
but the relationship is not reversible. An `@icici` VPA is far more likely to
belong to an iMobile user, so mapping it to WhatsApp would be wrong more often
than right.

A handful of handles that are _not_ on the current list are mapped anyway
(`@upi` is BHIM, NPCI's own app; `@slc` is slice, now a small finance bank;
`@fam` and `@mbk` are older handles still held by real users). Leaving the list
does not invalidate the VPAs already issued.

Deep-link targets are not published anywhere. They are conventions observed
across Indian merchant SDKs, confirmed by hand, and apps change them between
releases.

## Contributing

New apps, corrected targets and handle updates are all welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md). Anything that promotes a target to
`established` needs a real-device check; there is no way around that one.

## Disclaimer

Not affiliated with, endorsed by, or connected to NPCI or any of the apps
listed here. App and company names are trademarks of their respective owners
and are used descriptively, to identify which app a handle or link belongs to.

## License

MIT © [Publish Studio](https://publishstudio.one)

Extracted from [WithUPI](https://withupi.com), where it runs in production.
