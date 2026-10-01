/**
 * Catches the exact bug that shipped in MVP 4: H5P.JoubelUI (and
 * H5P.Question, which itself needs JoubelUI) depend on H5P.Transition and
 * H5P.FontIcons, but 6 of 7 new content types didn't declare those - the
 * player 404s fetching them, which a real browser reports as a CORS error
 * (no CORS headers on a 404), not a clear "missing dependency" message.
 * Structural package validation (does content.json parse, are declared
 * deps bundled) doesn't catch this - it only checks what WE declared, not
 * what the libraries THEMSELVES actually need. This reads each declared
 * library's own library.json out of the already-built zip and checks its
 * preloadedDependencies are all present in our own top-level list too.
 *
 * Usage in a smoke test, after building:
 *   import { checkDependencyClosure } from "./_lib/checkDependencyClosure.mjs";
 *   const closureErrors = await checkDependencyClosure(zip, h5pJson.preloadedDependencies);
 *   errors.push(...closureErrors);
 */
export async function checkDependencyClosure(zip, preloadedDependencies) {
  const errors = [];
  const declaredFolders = new Set(preloadedDependencies.map((d) => `${d.machineName}-${d.majorVersion}.${d.minorVersion}`));

  for (const dep of preloadedDependencies) {
    const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}`;
    const file = zip.file(`${folder}/library.json`);
    if (!file) continue; // already reported as "declared dependency not bundled" by the caller

    const lib = JSON.parse(await file.async("string"));
    for (const transitive of lib.preloadedDependencies || []) {
      const transitiveFolder = `${transitive.machineName}-${transitive.majorVersion}.${transitive.minorVersion}`;
      if (!declaredFolders.has(transitiveFolder)) {
        errors.push(
          `${folder} needs ${transitiveFolder} (its own preloadedDependencies) but that's not in ` +
            `our top-level preloadedDependencies - the player will 404 trying to fetch it.`,
        );
      }
    }
  }
  return errors;
}
