import { describe, expect, it } from "vitest";

import {
  detectUpiApp,
  EXCLUDED_HANDLES,
  KNOWN_HANDLES,
  UPI_APP_LABELS,
  type UpiAppId,
} from "./apps";
import targetsData from "./targets.json";

describe("detectUpiApp", () => {
  it("resolves handles to their app", () => {
    expect(detectUpiApp("someone@ybl")).toBe("phonepe");
    expect(detectUpiApp("someone@okhdfcbank")).toBe("googlepay");
    expect(detectUpiApp("someone@paytm")).toBe("paytm");
    expect(detectUpiApp("someone@waaxis")).toBe("whatsapp");
    expect(detectUpiApp("someone@yesg")).toBe("groww");
  });

  it("is case- and whitespace-insensitive on the handle", () => {
    expect(detectUpiApp("Someone@YBL")).toBe("phonepe");
    expect(detectUpiApp("someone@ Ybl ")).toBe("phonepe");
  });

  it("returns unknown rather than guessing", () => {
    expect(detectUpiApp("someone@notahandle")).toBe("unknown");
    // `ok` prefixes are a Google Pay convention, but only the listed ones are
    // Google Pay -- this must not become a startsWith heuristic.
    expect(detectUpiApp("someone@okunknownbank")).toBe("unknown");
    expect(detectUpiApp("")).toBe("unknown");
    expect(detectUpiApp("no-at-sign")).toBe("unknown");
    expect(detectUpiApp("trailing@")).toBe("unknown");
  });

  it("keeps bank-generic handles unmapped", () => {
    // NPCI lists these under WhatsApp and T Wallet, but they are the bank's own
    // handle and are shared across apps. Mapping them would be confidently
    // wrong for most VPAs that carry them.
    for (const handle of EXCLUDED_HANDLES) {
      expect(detectUpiApp(`someone@${handle}`)).toBe("unknown");
    }
  });

  it("splits on the last @", () => {
    expect(detectUpiApp("we.ird@name@ybl")).toBe("phonepe");
  });

  it("still resolves handles that predate the current NPCI list", () => {
    // Real VPAs in circulation; absence from the live TPAP list is not death.
    expect(detectUpiApp("someone@upi")).toBe("bhim");
    expect(detectUpiApp("someone@fam")).toBe("fampay");
    expect(detectUpiApp("someone@mbk")).toBe("mobikwik");
    expect(detectUpiApp("someone@slc")).toBe("slice");
    expect(detectUpiApp("someone@jio")).toBe("jio");
    expect(detectUpiApp("someone@okbizaxis")).toBe("googlepay");
  });
});

describe("table integrity", () => {
  it("gives every known handle a resolvable, labelled app", () => {
    for (const handle of KNOWN_HANDLES) {
      const appId = detectUpiApp(`someone@${handle}`);
      expect(appId, handle).not.toBe("unknown");
      expect(UPI_APP_LABELS[appId as UpiAppId], handle).toBeTruthy();
    }
  });

  it("has no handle carrying an @ or uppercase", () => {
    for (const handle of KNOWN_HANDLES) {
      expect(handle).toBe(handle.toLowerCase());
      expect(handle).not.toContain("@");
    }
  });

  it("only names apps in targets.json that detection knows about", () => {
    for (const appId of Object.keys(targetsData.targets)) {
      expect(UPI_APP_LABELS[appId as UpiAppId], appId).toBeTruthy();
    }
  });
});
