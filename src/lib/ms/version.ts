/**
 * Robust SemVer and versionCode comparison utility for MetaSchool Update Center.
 * Strict comparison: Older version or same version is NEVER treated as an update.
 */

export const CURRENT_VERSION = "2.2.2";
export const CURRENT_VERSION_CODE = 222;

export function parseSemVer(v: string): [number, number, number] {
  if (!v || typeof v !== "string") return [0, 0, 0];
  const cleaned = v.trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Returns true ONLY if `latest` is strictly newer than `current`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  if (!latest || !current) return false;
  const [cMaj, cMin, cPatch] = parseSemVer(current);
  const [lMaj, lMin, lPatch] = parseSemVer(latest);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

/**
 * Checks whether an available release is strictly newer based on:
 * 1. versionCode (primary check if available)
 * 2. SemVer comparison (secondary check)
 */
export function isUpdateAvailable(
  currentVersion: string,
  currentCode: number,
  remoteVersion?: string,
  remoteCode?: number,
): boolean {
  // If remote versionCode is explicitly specified, it is authoritative
  if (typeof remoteCode === "number" && !isNaN(remoteCode)) {
    if (remoteCode > currentCode) return true;
    if (remoteCode < currentCode) return false;
    // If version codes are equal, fallback to SemVer (e.g., pre-release patches)
  }

  if (remoteVersion) {
    return isNewerVersion(currentVersion, remoteVersion);
  }

  return false;
}
