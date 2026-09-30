/**
 * On-demand check: have any of the 3 H5P Hub bundles we vendor from changed
 * since we last ran fetch-h5p-libraries.mjs? Cheap (HEAD requests only) - no
 * need to re-download the ~1-2MB bundles just to check.
 *
 * Run by hand any time, or via the /api/cron/check-h5p-updates route on a
 * schedule (see vercel.json). Exits non-zero (and prints what changed) so it
 * can gate a CI step too, though nothing currently wires that up.
 *
 *   node scripts/check-h5p-updates.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkForHubUpdates } from "../lib/h5p/checkHubUpdates.ts";

const META_PATH = path.join("lib", "h5p", "vendor", "h5p-libraries.meta.json");

let baseline = null;
try {
  const raw = JSON.parse(await readFile(META_PATH, "utf8"));
  baseline = raw.sources;
} catch {
  console.warn(`No baseline found at ${META_PATH} - run fetch-h5p-libraries.mjs first. Reporting current state only.`);
}

const result = await checkForHubUpdates(baseline);

console.log(`Checked ${result.current.length} H5P Hub sources at ${result.checkedAt}`);
for (const status of result.current) {
  console.log(`  ${status.source} -> etag=${status.etag ?? "(none)"}`);
}

if (result.unbaselined.length) {
  console.log(`\nNo recorded baseline for ${result.unbaselined.length} source(s) - run fetch-h5p-libraries.mjs to record one:`);
  for (const s of result.unbaselined) console.log(`  - ${s}`);
}

if (result.changed.length) {
  console.log(`\nCHANGED since baseline (${result.changed.length}):`);
  for (const s of result.changed) console.log(`  - ${s}`);
  console.log("\nSomething upstream changed. This does not mean re-run fetch-h5p-libraries.mjs blindly -");
  console.log("check what actually changed (new content-type version? unrelated dependency rebuild?) before updating the vendored zip.");
  process.exit(1);
}

console.log("\nNo changes detected - vendored libraries are up to date with the Hub.");
