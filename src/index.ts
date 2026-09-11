/**
 * @withupi/upi-apps
 *
 * Two jobs, deliberately independent of each other:
 *
 * - **Detection** (`apps.ts`) -- which UPI app issued a given VPA, read off
 *   its handle. Covers every app on NPCI's third-party list, plus a few that
 *   aren't on it.
 * - **Linking** (`links.ts`) -- how to open a *specific* UPI app on a filled-in
 *   payment screen, instead of the plain `upi://pay` scheme that every app
 *   claims and the OS resolves arbitrarily.
 *
 * Detection covers more apps than linking does, and that asymmetry is expected:
 * a handle is published data, while a deep-link target has to be confirmed on a
 * real device before it can be trusted (see `docs/verify-upi-targets.md`).
 *
 * Icons are not part of this package. Static image imports resolve differently
 * per platform (bundler-dependent), and the names are branding this package has
 * no licence to redistribute, so consumers supply their own.
 */

export {
  detectUpiApp,
  EXCLUDED_HANDLES,
  KNOWN_HANDLES,
  UPI_APP_LABELS,
  type UpiAppId,
} from "./apps";

export {
  buildAndroidIntentUri,
  buildUpiAppLink,
  buildUpiUri,
  getUpiAppAndroidPackage,
  getUpiAppIosScheme,
  getUpiAppTargets,
  sanitizeTransactionNote,
  UPI_NOTE_MAX_LENGTH,
  type UpiLinkPlatform,
  type UpiPaymentRequest,
} from "./links";
