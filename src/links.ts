/**
 * UPI payment link construction.
 *
 * The plain `upi://pay` scheme is *contested*: every UPI app registers it, and
 * neither OS lets you say "any UPI app, let the payer pick".
 *
 * - iOS resolves a contested scheme silently and arbitrarily (in practice the
 *   earliest-installed claimant wins), with no chooser and no API to enumerate
 *   or influence the claimants. A payer with WhatsApp installed lands in
 *   WhatsApp Pay every single time, whatever the query string says.
 * - Android shows a chooser, but only until the payer taps "Always" -- after
 *   that it is just as silent as iOS.
 * - Desktop browsers have no handler at all, so the navigation strands the tab.
 *
 * None of that is fixable by improving the `upi://` URL. The fix is to ask the
 * payer which app they want and then open *that app's own* uncontested scheme
 * (iOS) or target its package directly (Android). This module holds the target
 * table and the builders; the pickers live in each app.
 */

import type { UpiAppId } from "./apps";
import targetsData from "./targets.json";

export type UpiPaymentRequest = {
  /** Rupees. Omitted from the URI entirely when undefined or not positive. */
  amount?: number;
  /** Payee display name (`pn`). */
  name: string;
  /** Free-text note (`tn`). Sanitised -- see `sanitizeTransactionNote`. */
  note?: string;
  /** Payee VPA (`pa`). */
  upiId: string;
};

/**
 * How to reach one specific UPI app, bypassing the contested `upi://` scheme.
 *
 * Both fields are optional because coverage is genuinely uneven: these are not
 * published as a spec anywhere, they are conventions observed across merchant
 * SDKs, and apps change them between releases. An app with no entry for the
 * current platform simply doesn't appear in that platform's picker rather than
 * offering the payer a button that dead-ends.
 *
 * `confidence` records how well-established each target is. "established"
 * entries are safe to ship; "unverified" ones are plausible but untested and
 * are excluded from pickers unless explicitly asked for.
 */
type UpiAppTarget = {
  /** Android application id, used to pin an intent to one app. */
  androidPackage?: string;
  confidence: "established" | "unverified";
  /**
   * Where the value came from, for anything not confirmed on a device. A Play
   * Store URL carries its own proof: the `id=` parameter is the package name.
   * Dropped once an entry is promoted to `established`, since the verification
   * itself is then the provenance.
   */
  source?: string;
  /**
   * iOS URL scheme *including* the path that precedes the query string, e.g.
   * `tez://upi/pay`. Query params are appended verbatim.
   */
  iosScheme?: string;
};

/**
 * The table lives in JSON so the Expo config plugins -- plain CommonJS, running
 * at prebuild with no transpiler -- can read the same source this does. See the
 * `$comment` block in targets.json.
 */
const UPI_APP_TARGETS = targetsData.targets as Partial<
  Record<UpiAppId, UpiAppTarget>
>;

export type UpiLinkPlatform = "android" | "ios" | "other";

/**
 * Apps worth offering the payer on `platform`, in display order.
 *
 * Only apps that actually have a usable target for that platform are returned,
 * so a picker built on this never shows a button that cannot work.
 *
 * This is a strict subset of what `detectUpiApp` recognises -- an app appears
 * here only once someone has confirmed its deep link on a real device. Ranking
 * and any further filtering (by popularity, say) belong to the caller: this
 * returns what is *possible*, not what you should show.
 *
 * `includeUnverified` surfaces scheme-unconfirmed entries as well -- for the
 * verification pass in docs/verify-upi-targets.md as much as for a payment UI,
 * since a wrong guess just falls through to the caller's own recovery state.
 */
export function getUpiAppTargets(
  platform: UpiLinkPlatform,
  { includeUnverified = false }: { includeUnverified?: boolean } = {},
): UpiAppId[] {
  if (platform === "other") return [];

  return (Object.keys(UPI_APP_TARGETS) as UpiAppId[]).filter((appId) => {
    const target = UPI_APP_TARGETS[appId];
    if (!target) return false;
    if (!includeUnverified && target.confidence !== "established") return false;

    return platform === "ios"
      ? Boolean(target.iosScheme)
      : Boolean(target.androidPackage);
  });
}

export function getUpiAppIosScheme(appId: UpiAppId): string | undefined {
  return UPI_APP_TARGETS[appId]?.iosScheme;
}

export function getUpiAppAndroidPackage(appId: UpiAppId): string | undefined {
  return UPI_APP_TARGETS[appId]?.androidPackage;
}

/**
 * Strip characters that UPI apps are known to choke on out of the note.
 *
 * Several apps validate `tn` against a restricted alphanumeric set and reject
 * the *entire* intent when it fails -- which surfaces to the payer as the app
 * opening to a blank screen, with no indication the note was the problem. We
 * hit this by prefixing every note with a bracketed tag, which put it on 100% of
 * payments.
 */
export function sanitizeTransactionNote(note: string): string {
  return note
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, UPI_NOTE_MAX_LENGTH);
}

/** UPI's own `tn` ceiling. Also what the note inputs cap typing at. */
export const UPI_NOTE_MAX_LENGTH = 50;

/**
 * The query string shared by every UPI target, contested or not.
 *
 * Keys are deliberately only set when they carry a value: an empty `am=` reads
 * as malformed to some parsers and gets the whole intent dropped, which is one
 * of the ways a payer ends up on a blank screen.
 */
function buildUpiParams({
  amount,
  name,
  note,
  upiId,
}: UpiPaymentRequest): URLSearchParams {
  const params = new URLSearchParams({
    cu: "INR",
    pa: upiId,
    pn: name,
  });

  if (amount !== undefined && Number.isFinite(amount) && amount > 0) {
    params.set("am", amount.toString());
  }

  const cleanNote = note ? sanitizeTransactionNote(note) : "";
  if (cleanNote) {
    params.set("tn", cleanNote);
  }

  return params;
}

/**
 * Serialise params the way real UPI links in the wild are written.
 *
 * `URLSearchParams.toString()` produces `application/x-www-form-urlencoded`,
 * which differs from a plain URI query in two ways that matter to the hand-
 * rolled parsers inside UPI apps:
 *
 * - Spaces become `+`. An app that URI-decodes rather than form-decodes shows
 *   the payee as "Rahul+Sharma", and a note as "Team+Lunch".
 * - `@` becomes `%40`. Every UPI QR in circulation carries the VPA unencoded,
 *   and `@` is legal in a query per RFC 3986, so a parser that never decodes
 *   is far more likely to have been written against the unencoded form.
 *
 * Both rewrites produce a URI that is still correct under RFC 3986 and closer
 * to what the apps are actually tested against.
 */
function serializeUpiParams(params: URLSearchParams): string {
  return params.toString().replace(/\+/g, "%20").replace(/%40/g, "@");
}

/**
 * The plain, contested `upi://pay` URI.
 *
 * Still the right thing for QR codes -- a QR is scanned *from inside* the
 * payer's chosen app, so there is no scheme resolution to get wrong, and it is
 * the one form every app understands. For tap-to-pay, prefer
 * `buildUpiAppLink`.
 */
export function buildUpiUri(request: UpiPaymentRequest): string {
  return `upi://pay?${serializeUpiParams(buildUpiParams(request))}`;
}

/**
 * An `intent://` URI, optionally pinned to one Android package.
 *
 * Without `androidPackage` this still beats `upi://` in a browser: Chrome falls
 * back to `S.browser_fallback_url` instead of leaving a blank tab. With it, the
 * payer's chosen app opens directly and no "Always" default can hijack it.
 */
export function buildAndroidIntentUri(
  request: UpiPaymentRequest,
  {
    androidPackage,
    fallbackUrl,
  }: { androidPackage?: string; fallbackUrl?: string } = {},
): string {
  const parts = ["scheme=upi", "action=android.intent.action.VIEW", "end"];

  if (androidPackage) {
    parts.splice(1, 0, `package=${androidPackage}`);
  }
  if (fallbackUrl) {
    parts.splice(
      parts.length - 1,
      0,
      `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
    );
  }

  return `intent://pay?${serializeUpiParams(buildUpiParams(request))}#Intent;${parts.join(";")}`;
}

/**
 * The best *browser* link for opening `appId` on `platform`, or undefined when
 * we have no usable target and the caller should fall back to the QR.
 *
 * Browser-oriented because the Android branch returns an `intent://` URI, which
 * is a Chrome convention -- native Android has to build a real ACTION_VIEW
 * intent from `getUpiAppAndroidPackage` instead. The iOS branch is equally
 * valid natively.
 *
 * Passing `appId: undefined` means "the payer didn't choose" and yields the
 * generic contested link -- correct on Android, where the chooser at least
 * appears, and a last resort on iOS.
 */
export function buildUpiAppLink({
  appId,
  fallbackUrl,
  platform,
  request,
}: {
  appId?: UpiAppId;
  fallbackUrl?: string;
  platform: UpiLinkPlatform;
  request: UpiPaymentRequest;
}): string | undefined {
  if (platform === "other") return undefined;

  if (platform === "android") {
    return buildAndroidIntentUri(request, {
      androidPackage: appId ? getUpiAppAndroidPackage(appId) : undefined,
      fallbackUrl,
    });
  }

  if (!appId) return buildUpiUri(request);

  const scheme = getUpiAppIosScheme(appId);
  if (!scheme) return undefined;

  return `${scheme}?${serializeUpiParams(buildUpiParams(request))}`;
}
