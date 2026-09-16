import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

/**
 * The vendored h5p-libraries.zip holds every H5P runtime library needed by
 * every content type we build (quiz, book, video), fetched by
 * scripts/fetch-h5p-libraries.mjs. Each content-type builder only wants its
 * own subset in the .h5p it produces - loadVendorFiles() filters by
 * top-level folder name so a quiz download never carries Book/Video-only
 * libraries and vice versa.
 */

const VENDOR_ZIP = path.join(process.cwd(), "lib", "h5p", "vendor", "h5p-libraries.zip");

let allVendorFilesCache: Map<string, Buffer> | null = null;
async function loadAllVendorFiles(): Promise<Map<string, Buffer>> {
  if (allVendorFilesCache) return allVendorFilesCache;
  const zip = await JSZip.loadAsync(await readFile(VENDOR_ZIP));
  const files = new Map<string, Buffer>();
  await Promise.all(
    Object.values(zip.files).map(async (f) => {
      if (!f.dir) files.set(f.name, await f.async("nodebuffer"));
    }),
  );
  allVendorFilesCache = files;
  return files;
}

/** Only the vendored files under the given top-level library folders (e.g. "H5P.TrueFalse-1.8"). */
export async function loadVendorFiles(keepFolders: string[]): Promise<Map<string, Buffer>> {
  const all = await loadAllVendorFiles();
  const keep = new Set(keepFolders);
  const out = new Map<string, Buffer>();
  for (const [name, data] of all) {
    const top = name.split("/")[0];
    if (keep.has(top)) out.set(name, data);
  }
  return out;
}

export function folderNamesFor(deps: { machineName: string; majorVersion: number; minorVersion: number }[]): string[] {
  return deps.map((d) => `${d.machineName}-${d.majorVersion}.${d.minorVersion}`);
}
