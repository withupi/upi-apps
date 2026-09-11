import { describe, expect, it } from "vitest";

import {
  buildAndroidIntentUri,
  buildUpiAppLink,
  buildUpiUri,
  getUpiAppAndroidPackage,
  getUpiAppIosScheme,
  getUpiAppTargets,
  sanitizeTransactionNote,
  UPI_NOTE_MAX_LENGTH,
} from "./links";

const request = { name: "Rahul Sharma", upiId: "rahul@ybl" };

describe("buildUpiUri", () => {
  it("builds the contested URI with the shared params", () => {
    expect(buildUpiUri(request)).toBe(
      "upi://pay?cu=INR&pa=rahul@ybl&pn=Rahul%20Sharma",
    );
  });

  it("leaves @ unencoded and encodes spaces as %20", () => {
    // URLSearchParams would give `+` and `%40`; UPI apps hand-roll their
    // parsers and every QR in circulation carries the VPA unencoded.
    const uri = buildUpiUri(request);
    expect(uri).not.toContain("%40");
    expect(uri).not.toContain("+");
    expect(uri).toContain("pn=Rahul%20Sharma");
  });

  it("includes a positive amount", () => {
    expect(buildUpiUri({ ...request, amount: 250.5 })).toContain("am=250.5");
  });

  it("omits the amount entirely when there isn't one", () => {
    // An empty `am=` gets the whole intent dropped by some parsers.
    for (const amount of [
      undefined,
      0,
      -10,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(buildUpiUri({ ...request, amount }), String(amount)).not.toContain(
        "am=",
      );
    }
  });

  it("includes a sanitised note, and omits one that sanitises away", () => {
    expect(buildUpiUri({ ...request, note: "Lunch money" })).toContain(
      "tn=Lunch%20money",
    );
    expect(buildUpiUri({ ...request, note: "!!!" })).not.toContain("tn=");
    expect(buildUpiUri({ ...request, note: "" })).not.toContain("tn=");
  });
});

describe("sanitizeTransactionNote", () => {
  it("replaces characters UPI apps reject", () => {
    expect(sanitizeTransactionNote("Lunch @ Cafe (50%)")).toBe("Lunch Cafe 50");
  });

  it("keeps word characters, dots and hyphens", () => {
    expect(sanitizeTransactionNote("Rent-Sept 1.5k")).toBe("Rent-Sept 1.5k");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeTransactionNote("  too   many spaces  ")).toBe(
      "too many spaces",
    );
  });

  it("caps at the UPI note length", () => {
    const note = sanitizeTransactionNote("a".repeat(200));
    expect(note).toHaveLength(UPI_NOTE_MAX_LENGTH);
  });
});

describe("buildAndroidIntentUri", () => {
  it("builds an unpinned intent", () => {
    expect(buildAndroidIntentUri(request)).toBe(
      "intent://pay?cu=INR&pa=rahul@ybl&pn=Rahul%20Sharma#Intent;scheme=upi;action=android.intent.action.VIEW;end",
    );
  });

  it("pins to a package when given one", () => {
    expect(
      buildAndroidIntentUri(request, { androidPackage: "com.phonepe.app" }),
    ).toContain("#Intent;scheme=upi;package=com.phonepe.app;");
  });

  it("appends an encoded browser fallback before end", () => {
    const uri = buildAndroidIntentUri(request, {
      fallbackUrl: "https://example.com/pay?id=1",
    });
    expect(uri).toContain(
      "S.browser_fallback_url=https%3A%2F%2Fexample.com%2Fpay%3Fid%3D1;end",
    );
  });
});

describe("getUpiAppTargets", () => {
  it("returns nothing on unsupported platforms", () => {
    expect(getUpiAppTargets("other")).toEqual([]);
  });

  it("only returns apps with a usable target for that platform", () => {
    for (const appId of getUpiAppTargets("ios")) {
      expect(getUpiAppIosScheme(appId), appId).toBeTruthy();
    }
    for (const appId of getUpiAppTargets("android")) {
      expect(getUpiAppAndroidPackage(appId), appId).toBeTruthy();
    }
  });

  it("excludes unverified targets unless asked", () => {
    const established = getUpiAppTargets("android");
    const all = getUpiAppTargets("android", { includeUnverified: true });
    expect(all.length).toBeGreaterThan(established.length);
    expect(all).toEqual(expect.arrayContaining(established));
  });

  it("includes the apps we have confirmed on a device", () => {
    expect(getUpiAppTargets("ios")).toContain("phonepe");
    expect(getUpiAppTargets("android")).toContain("googlepay");
  });
});

describe("buildUpiAppLink", () => {
  it("returns undefined off-platform", () => {
    expect(buildUpiAppLink({ platform: "other", request })).toBeUndefined();
  });

  it("uses the app's own scheme on iOS", () => {
    expect(
      buildUpiAppLink({ appId: "phonepe", platform: "ios", request }),
    ).toBe("phonepe://pay?cu=INR&pa=rahul@ybl&pn=Rahul%20Sharma");
  });

  it("returns undefined on iOS when the app has no scheme", () => {
    // amazonpay has an Android package but no confirmed iOS scheme; the caller
    // is meant to fall back to the QR rather than show a dead button.
    expect(getUpiAppIosScheme("amazonpay")).toBeUndefined();
    expect(
      buildUpiAppLink({ appId: "amazonpay", platform: "ios", request }),
    ).toBeUndefined();
  });

  it("falls back to the contested URI on iOS with no app chosen", () => {
    expect(buildUpiAppLink({ platform: "ios", request })).toBe(
      buildUpiUri(request),
    );
  });

  it("pins the intent to the chosen package on Android", () => {
    expect(
      buildUpiAppLink({ appId: "phonepe", platform: "android", request }),
    ).toContain("package=com.phonepe.app");
  });

  it("still returns a usable intent on Android with no app chosen", () => {
    const uri = buildUpiAppLink({ platform: "android", request });
    expect(uri).toContain("intent://pay?");
    expect(uri).not.toContain("package=");
  });
});
