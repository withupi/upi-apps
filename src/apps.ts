/**
 * VPA handle -> originating app detection.
 *
 * The handle (the part after `@`) is issued by a PSP bank on behalf of a
 * third-party app, so it is the only thing in a VPA that identifies which app
 * a payee is using. There is no runtime API for this -- the mapping only
 * exists as a table, and this is that table.
 *
 * The bulk of it comes from NPCI's published list of live UPI third-party
 * application providers (see `data/npci-tpap-list.csv` and the sheet beside
 * it). Two rules govern what gets in:
 *
 * - A handle is listed only when it identifies exactly one app. Bank-generic
 *   handles are deliberately left out -- see EXCLUDED_HANDLES below.
 * - An unmapped handle resolves to `"unknown"`, never to a guess. A confidently
 *   wrong app name is worse than no app name: it is shown to a payer who is
 *   about to send money.
 *
 * Detection is independent of deep linking. This table names far more apps than
 * `targets.json` has schemes for, which is fine -- knowing the payee is on
 * Groww does not require being able to open Groww.
 */

/**
 * Handles that appear in NPCI's list but are deliberately not mapped, because
 * they are the PSP bank's own generic handle rather than an app's.
 *
 * NPCI lists them because the app genuinely issues VPAs on them, but the
 * relationship isn't reversible: `@icici` is ICICI Bank's handle, used by
 * iMobile and others, so reading it as WhatsApp would be wrong far more often
 * than right. Same for `@axisbank`, listed under T Wallet.
 *
 * Kept here as a named constant rather than silently omitted so the next
 * refresh from the NPCI sheet doesn't quietly reintroduce them.
 */
export const EXCLUDED_HANDLES: readonly string[] = ["icici", "axisbank"];

export type UpiAppId =
  | "adityabirla"
  | "amazonpay"
  | "bajajfinserv"
  | "bharatpe"
  | "bhim"
  | "changejar"
  | "cheq"
  | "cred"
  | "curiemoney"
  | "fampay"
  | "fave"
  | "flipkart"
  | "freo"
  | "goodscore"
  | "googlepay"
  | "groww"
  | "herofincorp"
  | "indmoney"
  | "jio"
  | "jumpp"
  | "jupiter"
  | "kiwi"
  | "kreditbee"
  | "kreditpe"
  | "lxme"
  | "mobikwik"
  | "moneyview"
  | "multipl"
  | "navi"
  | "novio"
  | "onecard"
  | "paytm"
  | "phonepe"
  | "pop"
  | "rediff"
  | "refyne"
  | "riomoney"
  | "saathi"
  | "salaryse"
  | "samsungpay"
  | "scapia"
  | "shriramone"
  | "slice"
  | "snapmint"
  | "stashfin"
  | "supermoney"
  | "tataneu"
  | "timepay"
  | "whatsapp"
  | "zet";

/**
 * Display names, in each app's own brand styling rather than NPCI's listing
 * spelling (NPCI writes "Herofincorp", "IND Money", "super.money"). The
 * listing name for every app is in `data/npci-tpap-list.csv` if you need to
 * cross-reference.
 */
export const UPI_APP_LABELS: Record<UpiAppId, string> = {
  adityabirla: "Aditya Birla Capital",
  amazonpay: "Amazon Pay",
  bajajfinserv: "Bajaj Finserv",
  bharatpe: "BharatPe",
  bhim: "BHIM",
  changejar: "ChangeJar",
  cheq: "Cheq",
  cred: "CRED",
  curiemoney: "Curie Money",
  fampay: "FamPay",
  fave: "Fave",
  flipkart: "Flipkart UPI",
  freo: "Freo",
  goodscore: "GoodScore",
  googlepay: "Google Pay",
  groww: "Groww",
  herofincorp: "Hero FinCorp",
  indmoney: "INDmoney",
  jio: "Jio",
  jumpp: "JUMPP",
  jupiter: "Jupiter",
  kiwi: "Kiwi",
  kreditbee: "KreditBee",
  kreditpe: "Kredit.Pe",
  lxme: "LXME",
  mobikwik: "MobiKwik",
  moneyview: "Money View",
  multipl: "Multipl",
  navi: "Navi",
  novio: "Novio",
  onecard: "OneCard",
  paytm: "Paytm",
  phonepe: "PhonePe",
  pop: "POP",
  rediff: "Rediff",
  refyne: "Refyne",
  riomoney: "Rio Money",
  saathi: "Saathi by PayNearby",
  salaryse: "Salaryse",
  samsungpay: "Samsung Pay",
  scapia: "Scapia",
  shriramone: "Shriram One",
  slice: "slice",
  snapmint: "Snapmint",
  stashfin: "Stashfin",
  supermoney: "Super Money",
  tataneu: "Tata Neu",
  timepay: "TimePay",
  whatsapp: "WhatsApp",
  zet: "ZET",
};

/**
 * Every handle this package resolves. Most of it -- the `#region` block below
 * -- comes straight from NPCI's third-party app list, minus EXCLUDED_HANDLES;
 * regenerate that part with `pnpm sync:npci --write` after dropping a newer
 * export of the list into `data/npci-tpap-list.csv`. The region markers are
 * what that script rewrites, so don't hand-edit inside them, and don't move
 * entries in or out of the region by hand either -- the handles after it are
 * deliberately not NPCI-sourced (see the comment there) and the script would
 * otherwise have no way to tell the two apart.
 */
const HANDLE_TO_APP: Record<string, UpiAppId> = {
  // #region npci-generated
  abcdicici: "adityabirla",
  abfspay: "bajajfinserv",
  apl: "amazonpay",
  axisb: "cred",
  axl: "phonepe",
  bpunity: "bharatpe",
  cqaxis: "cheq",
  fkaxis: "flipkart",
  freoicici: "freo",
  fvaxis: "fave",
  goaxb: "kiwi",
  gsaxis: "goodscore",
  hfaxis: "herofincorp",
  ibl: "phonepe",
  ikwik: "mobikwik",
  inhdfc: "indmoney",
  jarunity: "changejar",
  jpyes: "jumpp",
  jupiteraxis: "jupiter",
  kbaxis: "kreditbee",
  kphdfc: "kreditpe",
  lxaxis: "lxme",
  mbkns: "mobikwik",
  mlyes: "multipl",
  mvhdfc: "moneyview",
  naviaxis: "navi",
  nvdcb: "novio",
  nyes: "navi",
  okaxis: "googlepay",
  okhdfcbank: "googlepay",
  okicici: "googlepay",
  oksbi: "googlepay",
  oneyes: "onecard",
  paytm: "paytm",
  pingpay: "samsungpay",
  pnyes: "saathi",
  ptaxis: "paytm",
  pthdfc: "paytm",
  ptsbi: "paytm",
  ptyes: "paytm",
  rapl: "amazonpay",
  rfunity: "refyne",
  rmrbl: "riomoney",
  rpaxis: "rediff",
  seyes: "salaryse",
  sfunity: "stashfin",
  shriramhdfcbank: "shriramone",
  smyes: "snapmint",
  superyes: "supermoney",
  tapicici: "tataneu",
  timecosmos: "timepay",
  tlaxis: "scapia",
  tnaxis: "tataneu",
  waaxis: "whatsapp",
  wahdfcbank: "whatsapp",
  waicici: "whatsapp",
  wasbi: "whatsapp",
  yapl: "amazonpay",
  ybl: "phonepe",
  yescred: "cred",
  yescurie: "curiemoney",
  yesfam: "fampay",
  yesg: "groww",
  yespop: "pop",
  ztrbl: "zet",

  // #endregion

  // Handles below are deliberately not NPCI-sourced, and `sync:npci` never
  // touches them. Being absent from NPCI's current list doesn't make a handle
  // dead -- it means the app isn't a live TPAP *today*, which is a different
  // claim:
  //
  // - `upi` is BHIM, NPCI's own app, so it was never a third-party entry.
  // - `slc` is slice, which became a small finance bank and left the list.
  // - `jio` and `okbizaxis` (Google Pay for Business) are issued outside the
  //   consumer-app listing.
  // - `fam` and `mbk` are earlier handles for apps that now also appear under
  //   newer ones (`yesfam`, `ikwik`/`mbkns`). VPAs issued on them are still in
  //   circulation and still resolve.
  //
  // Removing any of these would turn a correct answer into "unknown" for
  // people who already hold those VPAs, which is a regression with nothing
  // gained.
  fam: "fampay",
  jio: "jio",
  mbk: "mobikwik",
  okbizaxis: "googlepay",
  slc: "slice",
  upi: "bhim",
};

/** Every handle this package recognises, for tests and tooling. */
export const KNOWN_HANDLES: readonly string[] = Object.keys(HANDLE_TO_APP);

/**
 * The app behind a VPA, or `"unknown"` when the handle isn't one we can
 * attribute to exactly one app.
 *
 * Splits on the *last* `@`: the local part of a VPA is not supposed to contain
 * one, but taking the last is free and costs nothing if some PSP ever allows it.
 */
export function detectUpiApp(upiId: string): UpiAppId | "unknown" {
  const atIndex = upiId.lastIndexOf("@");
  if (atIndex === -1) return "unknown";

  const handle = upiId
    .slice(atIndex + 1)
    .trim()
    .toLowerCase();
  return HANDLE_TO_APP[handle] ?? "unknown";
}

/**
 * Who issues a handle, from the same NPCI list as the region above: the PSP
 * bank that runs it for the app, and the month NPCI lists it as going live
 * (`YYYY-MM`).
 *
 * Kept apart from HANDLE_TO_APP because it covers a different set: it includes
 * EXCLUDED_HANDLES (they still have a bank, just not one app), and it can't
 * cover the non-NPCI handles listed after the region above, which have no
 * published PSP. Bank names are normalised from NPCI's spelling, which mixes
 * "ICICI" with "ICICI Bank" and calls NSDL Payments Bank "NSDL Bank". Same
 * rules as above: `pnpm sync:npci --write` rewrites the region.
 */
const HANDLE_PSP: Record<string, readonly [pspBank: string, goLive: string]> = {
  // #region npci-psp-generated
  abcdicici: ["ICICI Bank", "2024-04"],
  abfspay: ["Axis Bank", "2021-03"],
  apl: ["Axis Bank", "2019-01"],
  axisb: ["Axis Bank", "2019-04"],
  axisbank: ["Axis Bank", "2024-11"],
  axl: ["Axis Bank", "2016-08"],
  bpunity: ["Unity Small Finance Bank", "2024-08"],
  cqaxis: ["Axis Bank", "2026-06"],
  fkaxis: ["Axis Bank", "2024-03"],
  freoicici: ["ICICI Bank", "2024-08"],
  fvaxis: ["Axis Bank", "2025-12"],
  goaxb: ["Axis Bank", "2023-05"],
  gsaxis: ["Axis Bank", "2026-07"],
  hfaxis: ["Axis Bank", "2025-12"],
  ibl: ["ICICI Bank", "2016-08"],
  icici: ["ICICI Bank", "2020-11"],
  ikwik: ["HDFC Bank", "2018-05"],
  inhdfc: ["HDFC Bank", "2024-10"],
  jarunity: ["Unity Small Finance Bank", "2025-05"],
  jpyes: ["Yes Bank", "2025-12"],
  jupiteraxis: ["Axis Bank", "2021-06"],
  kbaxis: ["Axis Bank", "2025-07"],
  kphdfc: ["HDFC Bank", "2024-09"],
  lxaxis: ["Axis Bank", "2025-09"],
  mbkns: ["NSDL Payments Bank", "2025-09"],
  mlyes: ["Yes Bank", "2026-04"],
  mvhdfc: ["HDFC Bank", "2024-10"],
  naviaxis: ["Axis Bank", "2023-08"],
  nvdcb: ["DCB Bank", "2025-12"],
  nyes: ["Yes Bank", "2025-09"],
  okaxis: ["Axis Bank", "2017-09"],
  okhdfcbank: ["HDFC Bank", "2017-09"],
  okicici: ["ICICI Bank", "2017-09"],
  oksbi: ["State Bank of India", "2017-09"],
  oneyes: ["Yes Bank", "2024-09"],
  paytm: ["Yes Bank", "2024-03"],
  pingpay: ["Axis Bank", "2018-02"],
  pnyes: ["Yes Bank", "2025-10"],
  ptaxis: ["Axis Bank", "2024-03"],
  pthdfc: ["HDFC Bank", "2024-03"],
  ptsbi: ["State Bank of India", "2024-03"],
  ptyes: ["Yes Bank", "2024-03"],
  rapl: ["RBL Bank", "2019-01"],
  rfunity: ["Unity Small Finance Bank", "2026-08"],
  rmrbl: ["RBL Bank", "2024-11"],
  rpaxis: ["Axis Bank", "2025-12"],
  seyes: ["Yes Bank", "2024-07"],
  sfunity: ["Unity Small Finance Bank", "2026-02"],
  shriramhdfcbank: ["HDFC Bank", "2023-09"],
  smyes: ["Yes Bank", "2026-03"],
  superyes: ["Yes Bank", "2024-06"],
  tapicici: ["ICICI Bank", "2022-04"],
  timecosmos: ["Cosmos Co-operative Bank", "2021-08"],
  tlaxis: ["Axis Bank", "2025-12"],
  tnaxis: ["Axis Bank", "2026-04"],
  waaxis: ["Axis Bank", "2020-11"],
  wahdfcbank: ["HDFC Bank", "2020-11"],
  waicici: ["ICICI Bank", "2020-11"],
  wasbi: ["State Bank of India", "2020-11"],
  yapl: ["Yes Bank", "2019-01"],
  ybl: ["Yes Bank", "2016-08"],
  yescred: ["Yes Bank", "2019-04"],
  yescurie: ["Yes Bank", "2024-11"],
  yesfam: ["Yes Bank", "2024-05"],
  yesg: ["Yes Bank", "2022-10"],
  yespop: ["Yes Bank", "2024-06"],
  ztrbl: ["RBL Bank", "2025-12"],
  // #endregion
};

/** What the package knows about one handle. */
export type UpiHandleInfo = {
  /** Lowercase, without the `@`. */
  handle: string;
  /** `null` for EXCLUDED_HANDLES: a real handle, but not one app's. */
  appId: UpiAppId | null;
  /** The PSP bank NPCI lists for the handle, or `null` for handles NPCI doesn't list. */
  pspBank: string | null;
  /** NPCI's go-live month as `YYYY-MM`, or `null` alongside a null `pspBank`. */
  goLive: string | null;
};

function toHandleInfo(handle: string): UpiHandleInfo {
  const psp = HANDLE_PSP[handle];
  return {
    handle,
    appId: HANDLE_TO_APP[handle] ?? null,
    pspBank: psp?.[0] ?? null,
    goLive: psp?.[1] ?? null,
  };
}

/**
 * Every handle the package has anything to say about: KNOWN_HANDLES followed
 * by EXCLUDED_HANDLES, so a directory of handles can explain the bank-generic
 * ones instead of leaving them out.
 */
export const UPI_HANDLES: readonly UpiHandleInfo[] = [
  ...KNOWN_HANDLES,
  ...EXCLUDED_HANDLES,
].map(toHandleInfo);

/**
 * Details for one handle, given a full VPA (`someone@ybl`), `@ybl`, or a bare
 * `ybl`. Unlike `detectUpiApp`, a string with no `@` is read as the handle
 * itself, since "what is ybl" is how people ask. Returns `null` for a handle
 * the package doesn't know.
 */
export function getUpiHandleInfo(upiIdOrHandle: string): UpiHandleInfo | null {
  const handle = upiIdOrHandle
    .slice(upiIdOrHandle.lastIndexOf("@") + 1)
    .trim()
    .toLowerCase();
  if (!handle) return null;
  if (!(handle in HANDLE_TO_APP) && !EXCLUDED_HANDLES.includes(handle)) {
    return null;
  }
  return toHandleInfo(handle);
}
