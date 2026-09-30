/**
 * Detects whether any of our vendored H5P Hub bundles have changed upstream,
 * without downloading the full (~1-2MB each) bundles - a HEAD request's
 * ETag is enough to know "something changed, go look" without the cost of
 * a full fetch every check.
 *
 * Deliberately detection-only: this never touches the vendored zip or the
 * PRELOADED_DEPENDENCIES version numbers in the builder files. A changed
 * ETag can mean a real new content-type version, or just an unrelated
 * dependency inside the same bundle getting rebuilt - either way, a human
 * (or a future session) should look at what actually changed before
 * updating anything, the same "detect and warn, don't auto-overwrite"
 * principle used elsewhere in this app (see the h5p.com two-way-sync design
 * notes).
 */

export const HUB_SOURCES = [
  "https://api.h5p.org/v1/content-types/H5P.QuestionSet",
  "https://api.h5p.org/v1/content-types/H5P.InteractiveBook",
  "https://api.h5p.org/v1/content-types/H5P.InteractiveVideo",
];

export interface SourceStatus {
  source: string;
  etag: string | null;
  lastModified: string | null;
}

export interface UpdateCheckResult {
  checkedAt: string;
  current: SourceStatus[];
  baseline: Record<string, { etag: string | null; lastModified: string | null }> | null;
  changed: string[]; // sources whose etag differs from the recorded baseline
  unbaselined: string[]; // sources with no recorded baseline at all (never fetched, or meta file missing)
}

async function headStatus(source: string): Promise<SourceStatus> {
  const res = await fetch(source, { method: "HEAD", headers: { "User-Agent": "h5p-chatgpt-app/0.1" } });
  if (!res.ok) throw new Error(`HEAD failed for ${source}: ${res.status} ${res.statusText}`);
  return {
    source,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
  };
}

/**
 * baseline is the parsed contents of lib/h5p/vendor/h5p-libraries.meta.json,
 * or null if that file doesn't exist yet (e.g. first run before any fetch
 * has recorded one).
 */
export async function checkForHubUpdates(
  baseline: UpdateCheckResult["baseline"],
): Promise<UpdateCheckResult> {
  const current = await Promise.all(HUB_SOURCES.map(headStatus));

  const changed: string[] = [];
  const unbaselined: string[] = [];

  for (const status of current) {
    const recorded = baseline?.[status.source];
    if (!recorded) {
      unbaselined.push(status.source);
      continue;
    }
    if (recorded.etag !== status.etag) {
      changed.push(status.source);
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    current,
    baseline,
    changed,
    unbaselined,
  };
}
