/**
 * Publish the current version, if it isn't already on the registry.
 *
 * `changeset publish` would normally do this, but its pnpm code path is broken
 * (it reads `versions` off a single-version manifest), and for a one-package
 * repo it only adds that risk. Everything else about the changesets flow --
 * changelogs, version PRs -- is untouched.
 *
 * The guard matters because the release workflow runs this on every push to
 * main, including pushes with nothing to release.
 *
 * Printing "New tag:" is how changesets/action learns something shipped; it
 * greps stdout for that line to create the GitHub release.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));

const published = (() => {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
})();

if (published) {
  console.log(`${name}@${version} is already published, nothing to do.`);
  process.exit(0);
}

execFileSync("npm", ["publish", "--access", "public"], { stdio: "inherit" });
console.log(`New tag: ${name}@${version}`);
