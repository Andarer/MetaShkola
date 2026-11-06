import type {
  Data,
  MetaShareKind,
  MetaSharePackage,
  MetaShareSchedulePayload,
  MetaShareSpacePayload,
} from "./types";
import { uid } from "./id";

/**
 * Deterministic JSON stringifier (canonicalization) for cryptographic hashing.
 * Sorts object keys recursively so identical data structures yield identical hashes.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalizeJson).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const items = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
  return "{" + items.join(",") + "}";
}

function getCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  throw new Error("Web Crypto API is not available");
}

/**
 * Computes standard SHA-256 hex digest using Web Crypto API
 */
export async function computeSha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const cryptoApi = getCrypto();
  const hashBuffer = await cryptoApi.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Legacy checksum for backward compatibility with v1
 */
export function calculateLegacyChecksum(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Creates a validated .mspack package for schedule or space export with SHA-256 integrity
 */
export async function createMetaSharePackageAsync(
  kind: MetaShareKind,
  title: string,
  payload: MetaShareSchedulePayload | MetaShareSpacePayload | Partial<Data>,
  options?: {
    description?: string;
    authorName?: string;
  },
): Promise<MetaSharePackage> {
  const canonical = canonicalizeJson(payload);
  const sha256 = await computeSha256Hex(canonical);
  const legacyChecksum = calculateLegacyChecksum(canonical);

  return {
    format: "mspack",
    version: 1,
    packageId: uid(),
    kind,
    createdAt: new Date().toISOString(),
    checksum: legacyChecksum,
    integrity: {
      algorithm: "SHA-256",
      sha256,
    },
    meta: {
      title,
      description: options?.description,
      sourceApp: "MetaSchool",
      sourceVersion: "2.2.0",
      authorName: options?.authorName,
    },
    payload,
  };
}

/**
 * Synchronous creator wrapper (calculates legacy checksum immediately and placeholder SHA)
 */
export function createMetaSharePackage(
  kind: MetaShareKind,
  title: string,
  payload: MetaShareSchedulePayload | MetaShareSpacePayload | Partial<Data>,
  options?: {
    description?: string;
    authorName?: string;
  },
): MetaSharePackage {
  const canonical = canonicalizeJson(payload);
  const legacyChecksum = calculateLegacyChecksum(canonical);

  return {
    format: "mspack",
    version: 1,
    packageId: uid(),
    kind,
    createdAt: new Date().toISOString(),
    checksum: legacyChecksum,
    meta: {
      title,
      description: options?.description,
      sourceApp: "MetaSchool",
      sourceVersion: "2.2.0",
      authorName: options?.authorName,
    },
    payload,
  };
}

export type MetaShareValidationResult =
  | {
      ok: true;
      pkg: MetaSharePackage;
      summary: string;
      details: {
        lessonsCount: number;
        subjectsCount: number;
        classesCount: number;
        spaceName: string;
      };
    }
  | { ok: false; error: string };

/**
 * Maximum allowed uncompressed package size (10 MB) to prevent memory exhaustion / DoS
 */
export const MAX_PACKAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validates any incoming raw payload to ensure it is a legitimate .mspack package
 * Includes schema validation, identifier sanity, and SHA-256 / Checksum verification.
 */
export async function validateMetaSharePackageAsync(raw: unknown): Promise<MetaShareValidationResult> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Данные не являются объектом" };
  }

  const jsonStr = JSON.stringify(raw);
  if (jsonStr.length > MAX_PACKAGE_SIZE_BYTES) {
    return { ok: false, error: "Размер пакета превышает допустимый лимит (10 МБ)" };
  }

  const pkg = raw as Partial<MetaSharePackage>;

  if (pkg.format !== "mspack" || pkg.version !== 1) {
    return { ok: false, error: "Неподдерживаемый формат или версия пакета (ожидается mspack v1)" };
  }

  if (!pkg.kind || !["schedule", "space", "backup"].includes(pkg.kind)) {
    return { ok: false, error: "Неизвестный тип пакета MetaShare" };
  }

  if (!pkg.payload || typeof pkg.payload !== "object") {
    return { ok: false, error: "Содержимое пакета (payload) повреждено или отсутствует" };
  }

  // Cryptographic integrity verification:
  const canonical = canonicalizeJson(pkg.payload);

  if (pkg.integrity && pkg.integrity.algorithm === "SHA-256") {
    const expectedSha256 = await computeSha256Hex(canonical);
    if (pkg.integrity.sha256 !== expectedSha256) {
      return { ok: false, error: "Нарушена целостность: не совпадает контрольная сумма SHA-256" };
    }
  } else if (pkg.checksum) {
    const expectedLegacy = calculateLegacyChecksum(canonical);
    const directLegacy = calculateLegacyChecksum(JSON.stringify(pkg.payload));
    if (pkg.checksum !== expectedLegacy && pkg.checksum !== directLegacy) {
      return { ok: false, error: "Нарушена контрольная сумма пакета (checksum mismatch)" };
    }
  } else {
    return { ok: false, error: "Отсутствует обязательная контрольная сумма пакета" };
  }

  // Schema & Referential Integrity checks
  let lessonsCount = 0;
  let subjectsCount = 0;
  let classesCount = 0;
  let spaceName = "Не указано";

  if (pkg.kind === "schedule") {
    const payload = pkg.payload as MetaShareSchedulePayload;
    if (!payload.space || !payload.space.id || !payload.space.name) {
      return { ok: false, error: "Пакет расписания не содержит описания учебного пространства (space)" };
    }
    spaceName = payload.space.name;
    lessonsCount = Array.isArray(payload.lessons) ? payload.lessons.length : 0;
    subjectsCount = Array.isArray(payload.subjects) ? payload.subjects.length : 0;
    classesCount = Array.isArray(payload.classes) ? payload.classes.length : 0;

    // Referential integrity check: every lesson subjectId must exist in subjects list
    if (Array.isArray(payload.lessons) && Array.isArray(payload.subjects)) {
      const subjectIds = new Set(payload.subjects.map((s) => s.id));
      for (const lesson of payload.lessons) {
        if (!lesson.id || !lesson.subjectId) {
          return { ok: false, error: "В пакете найден урок с отсутствующим ID или предметом" };
        }
        if (!subjectIds.has(lesson.subjectId)) {
          return {
            ok: false,
            error: `Нарушена целостность связей: предмет ID «${lesson.subjectId}» отсутствует в списке предметов`,
          };
        }
      }
    }
  } else if (pkg.kind === "space") {
    const payload = pkg.payload as MetaShareSpacePayload;
    if (!payload.space || !payload.space.id) {
      return { ok: false, error: "Пакет пространства не содержит данных пространства (space)" };
    }
    spaceName = payload.space.name;
    lessonsCount = payload.lessons?.length || 0;
    subjectsCount = payload.subjects?.length || 0;
    classesCount = payload.classes?.length || 0;
  } else if (pkg.kind === "backup") {
    const payload = pkg.payload as Partial<Data>;
    spaceName = "Полная резервная копия";
    lessonsCount = payload.lessons?.length || 0;
    subjectsCount = payload.subjects?.length || 0;
  }

  const summary =
    pkg.kind === "schedule"
      ? `Расписание «${spaceName}»: ${lessonsCount} уроков, ${subjectsCount} предметов`
      : `Пакет ${pkg.meta?.title || "MetaShare"} (${pkg.kind}): «${spaceName}»`;

  return {
    ok: true,
    pkg: pkg as MetaSharePackage,
    summary,
    details: {
      lessonsCount,
      subjectsCount,
      classesCount,
      spaceName,
    },
  };
}

/**
 * Synchronous validator (fallback for synchronous parsing with legacy checksum check)
 */
export function validateMetaSharePackage(raw: unknown): MetaShareValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Данные не являются объектом" };
  }
  const pkg = raw as Partial<MetaSharePackage>;
  if (pkg.format !== "mspack" || pkg.version !== 1) {
    return { ok: false, error: "Неподдерживаемый формат или версия пакета (ожидается mspack v1)" };
  }
  if (!pkg.kind || !["schedule", "space", "backup"].includes(pkg.kind)) {
    return { ok: false, error: "Неизвестный тип пакета MetaShare" };
  }
  if (!pkg.payload || typeof pkg.payload !== "object") {
    return { ok: false, error: "Содержимое пакета (payload) повреждено или отсутствует" };
  }
  const canonical = canonicalizeJson(pkg.payload);
  if (pkg.checksum) {
    const expectedLegacy = calculateLegacyChecksum(canonical);
    const directLegacy = calculateLegacyChecksum(JSON.stringify(pkg.payload));
    if (pkg.checksum !== expectedLegacy && pkg.checksum !== directLegacy) {
      return { ok: false, error: "Нарушена контрольная сумма пакета (checksum mismatch)" };
    }
  }

  const p = pkg.payload as any;
  const lessonsCount = p.lessons?.length || 0;
  const subjectsCount = p.subjects?.length || 0;
  const classesCount = p.classes?.length || 0;
  const spaceName = p.space?.name || "Школа";

  return {
    ok: true,
    pkg: pkg as MetaSharePackage,
    summary: `Пакет MetaShare: «${spaceName}» (${lessonsCount} уроков)`,
    details: {
      lessonsCount,
      subjectsCount,
      classesCount,
      spaceName,
    },
  };
}

/**
 * Helper to parse QR or text input safely
 */
export async function parseMetaShareInputAsync(input: string): Promise<MetaShareValidationResult> {
  try {
    const parsed = JSON.parse(input.trim());
    return await validateMetaSharePackageAsync(parsed);
  } catch {
    return { ok: false, error: "Некорректный синтаксис JSON" };
  }
}

export function parseMetaShareInput(input: string): MetaShareValidationResult {
  try {
    const parsed = JSON.parse(input.trim());
    return validateMetaSharePackage(parsed);
  } catch {
    return { ok: false, error: "Некорректный синтаксис JSON" };
  }
}
