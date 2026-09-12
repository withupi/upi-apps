/**
 * Keep the README's verification status table in sync with src/targets.json.
 *
 * The table is generated, not hand-maintained -- every promotion in
 * targets.json (see docs/verify-upi-targets.md) should show up here without
 * anyone remembering to update prose separately. `pnpm docs:status` writes
 * it; `pnpm docs:status --check` (what CI runs) fails instead, so a
 * targets.json change that didn't regenerate the table is caught before
 * merge rather than left to drift.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { UPI_APP_LABELS, type UpiAppId } from "../src/apps.ts";
import targetsData from "../src/targets.json" with { type: "json" };

const root = new URL("..", import.meta.url);
const readmePath = new URL("README.md", root);

const START = "<!-- status:start -->";
const END = "<!-- status:end -->";

type Confidence = "established" | "unverified" | undefined;

function cell(confidence: Confidence, hasTarget: boolean): string {
  if (!hasTarget) return "—";
  return confidence === "established" ? "✅ Established" : "⚠️ Unverified";
}

const targets = targetsData.targets as Partial<
  Record<
    UpiAppId,
    {
      androidConfidence?: "established" | "unverified";
      androidPackage?: string;
      iosConfidence?: "established" | "unverified";
      iosScheme?: string;
    }
  >
>;

const appIds = (Object.keys(targets) as UpiAppId[]).sort((a, b) =>
  UPI_APP_LABELS[a].localeCompare(UPI_APP_LABELS[b]),
);

const rows = appIds.map((appId) => {
  const target = targets[appId]!;
  return `| ${UPI_APP_LABELS[appId]} | ${cell(target.androidConfidence, Boolean(target.androidPackage))} | ${cell(target.iosConfidence, Boolean(target.iosScheme))} |`;
});

const table = ["| App | Android | iOS |", "| --- | --- | --- |", ...rows].join(
  "\n",
);

const block = `${START}\n\n${table}\n\n${END}`;

const readme = await readFile(fileURLToPath(readmePath), "utf8");
const regex = new RegExp(`${START}[\\s\\S]*?${END}`);

if (!regex.test(readme)) {
  console.error(`Couldn't find ${START} / ${END} markers in README.md.`);
  process.exit(1);
}

// Prettier-format the result, so this script's output and `pnpm format`
// always agree -- otherwise the two would fight over the table's column
// widths on every run.
const next = await prettier.format(readme.replace(regex, block), {
  filepath: fileURLToPath(readmePath),
});

if (next === readme) {
  console.log("README status table is up to date.");
  process.exit(0);
}

if (!process.argv.includes("--write")) {
  console.log("README status table is stale. Re-run with --write to apply.");
  process.exit(1);
}

await writeFile(fileURLToPath(readmePath), next);
console.log("Updated the README status table.");
