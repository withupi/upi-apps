/**
 * Refresh the handle map from NPCI's third-party app list.
 *
 * NPCI publishes the live TPAP list as a spreadsheet. Export it to
 * `data/npci-tpap-list.csv` (columns: tpap, pspBank, handle, goLive), keeping
 * the original alongside it for provenance, then:
 *
 *   pnpm sync:npci           # print the diff
 *   pnpm sync:npci --write   # apply it to src/apps.ts
 *
 * Only the `#region npci-generated` block inside HANDLE_TO_APP in src/apps.ts
 * is touched. Handles that aren't on NPCI's list live after that region and
 * are never removed by this script -- see the comment there for why.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  EXCLUDED_HANDLES,
  UPI_APP_LABELS,
  type UpiAppId,
} from "../src/apps.ts";

/**
 * NPCI's listing name for each app -> our id.
 *
 * Explicit rather than slugified because NPCI's spelling moves ("FamApp by
 * Trio" was FamPay) while the id is a public API we don't get to change.
 * A listing name missing from here is a hard error: a new app needs an id, a
 * label, and a decision, not a silently generated slug.
 */
const TPAP_TO_APP_ID: Record<string, UpiAppId> = {
  "Aditya Birla Capital Digital": "adityabirla",
  "Amazon Pay": "amazonpay",
  "Bajaj Finserv": "bajajfinserv",
  BharatPe: "bharatpe",
  ChangeJar: "changejar",
  Cheq: "cheq",
  CRED: "cred",
  "Curie Money": "curiemoney",
  "FamApp by Trio": "fampay",
  Fave: "fave",
  "Flipkart UPI": "flipkart",
  Freo: "freo",
  GoodScore: "goodscore",
  "Google Pay": "googlepay",
  Groww: "groww",
  Herofincorp: "herofincorp",
  "IND Money": "indmoney",
  JUMPP: "jumpp",
  "Jupiter Money": "jupiter",
  Kiwi: "kiwi",
  "Kredit Bee": "kreditbee",
  "Kredit.Pe": "kreditpe",
  "Lxme UPI": "lxme",
  MobiKwik: "mobikwik",
  "Money View": "moneyview",
  Multipl: "multipl",
  Navi: "navi",
  Novio: "novio",
  "One Card": "onecard",
  Paytm: "paytm",
  PhonePe: "phonepe",
  "POP UPI": "pop",
  Rediff: "rediff",
  Refyne: "refyne",
  "Rio Money": "riomoney",
  "Saathi - Pay Nearby": "saathi",
  salaryse: "salaryse",
  "Samsung Pay": "samsungpay",
  Scapia: "scapia",
  "Shriram One": "shriramone",
  Snapmint: "snapmint",
  Stashfin: "stashfin",
  "super.money": "supermoney",
  "Tata Neu": "tataneu",
  TimePay: "timepay",
  WhatsApp: "whatsapp",
  ZET: "zet",
};

/**
 * Listed apps we deliberately don't map at all, because every handle they are
 * listed under is a bank-generic one (see EXCLUDED_HANDLES in src/apps.ts).
 */
const SKIPPED_TPAPS = new Set(["T Wallet"]);

const root = new URL("..", import.meta.url);
const csvPath = new URL("data/npci-tpap-list.csv", root);
const appsPath = new URL("src/apps.ts", root);

const REGION =
  /(\/\/ #region npci-generated\n)([\s\S]*?)(\n {2}\/\/ #endregion)/;

function parseCsv(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header!.split(",");

  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(
      columns.map((c, i) => [c, (cells[i] ?? "").trim()]),
    );
  });
}

function parseCurrentRegion(source: string): Record<string, string> {
  const match = source.match(REGION);
  if (!match) throw new Error("npci-generated region not found in src/apps.ts");

  const entries: Record<string, string> = {};
  for (const line of match[2]!.split("\n")) {
    const entry = line.match(/^\s*([\w"']+):\s*"([\w]+)",\s*$/);
    if (entry) entries[entry[1]!.replace(/["']/g, "")] = entry[2]!;
  }
  return entries;
}

const rows = parseCsv(await readFile(fileURLToPath(csvPath), "utf8"));
const excluded = new Set(EXCLUDED_HANDLES);
const next: Record<string, UpiAppId> = {};
const skipped: string[] = [];
const unmapped = new Set<string>();

for (const { tpap, handle } of rows) {
  if (!tpap || !handle) continue;
  if (SKIPPED_TPAPS.has(tpap)) {
    skipped.push(`@${handle} (${tpap}) -- every listed handle is bank-generic`);
    continue;
  }

  if (excluded.has(handle)) {
    skipped.push(`@${handle} (${tpap}) -- bank-generic, in EXCLUDED_HANDLES`);
    continue;
  }

  const appId = TPAP_TO_APP_ID[tpap];
  if (!appId) {
    unmapped.add(tpap);
    continue;
  }

  next[handle] = appId;
}

if (unmapped.size > 0) {
  console.error("Listed apps with no id in TPAP_TO_APP_ID:\n");
  for (const tpap of unmapped) console.error(`  ${tpap}`);
  console.error(
    "\nAdd each to TPAP_TO_APP_ID here, to UpiAppId and to UPI_APP_LABELS in" +
      " src/apps.ts, then re-run.",
  );
  process.exit(1);
}

const missingLabel = [...new Set(Object.values(next))].filter(
  (appId) => !UPI_APP_LABELS[appId],
);
if (missingLabel.length > 0) {
  console.error(`No label for: ${missingLabel.join(", ")}`);
  process.exit(1);
}

const source = await readFile(fileURLToPath(appsPath), "utf8");
const current = parseCurrentRegion(source);

const added = Object.keys(next).filter((h) => !(h in current));
const removed = Object.keys(current).filter((h) => !(h in next));
const changed = Object.keys(next).filter(
  (h) => h in current && current[h] !== next[h],
);

const report = (title: string, lines: string[]) => {
  if (lines.length === 0) return;
  console.log(`\n${title} (${lines.length})`);
  for (const line of lines) console.log(`  ${line}`);
};

report(
  "Added",
  added.map((h) => `@${h} -> ${next[h]}`),
);
report(
  "Removed (no longer listed)",
  removed.map((h) => `@${h} -> ${current[h]}`),
);
report(
  "Reassigned",
  changed.map((h) => `@${h}: ${current[h]} -> ${next[h]}`),
);
report("Skipped", skipped);

if (added.length + removed.length + changed.length === 0) {
  console.log("\nUp to date: no changes from the list.");
  process.exit(0);
}

if (!process.argv.includes("--write")) {
  console.log("\nRe-run with --write to apply.");
  process.exit(1);
}

const body = Object.keys(next)
  .sort()
  .map((handle) => `  ${handle}: "${next[handle]}",\n`)
  .join("");

await writeFile(
  fileURLToPath(appsPath),
  source.replace(
    REGION,
    (_match: string, open: string, _body: string, close: string) =>
      open + body + close,
  ),
);

console.log("\nWrote src/apps.ts. Review the diff, then add a changeset.");
