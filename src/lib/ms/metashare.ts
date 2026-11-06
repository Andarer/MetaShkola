import type {
  Data,
  MetaShareKind,
  MetaSharePackage,
  MetaShareSchedulePayload,
  MetaShareSpacePayload,
  Space,
} from "./types";

/**
 * Deterministic checksum calculation for MetaShare package integrity
 */
export function calculateChecksum(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Creates a validated .mspack package for schedule or space export
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
  const contentString = JSON.stringify(payload);
  const checksum = calculateChecksum(contentString);

  return {
    format: "mspack",
    version: 1,
    kind,
    createdAt: new Date().toISOString(),
    checksum,
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
  | { ok: true; pkg: MetaSharePackage; summary: string }
  | { ok: false; error: string };

/**
 * Validates any incoming raw payload to ensure it is a legitimate .mspack package
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

  // Validate integrity checksum
  const expectedChecksum = calculateChecksum(JSON.stringify(pkg.payload));
  if (pkg.checksum && pkg.checksum !== expectedChecksum) {
    return { ok: false, error: "Нарушена контрольная сумма пакета: данные повреждены" };
  }

  let summary = `Пакет ${pkg.meta?.title || "MetaShare"} (${pkg.kind})`;
  if (pkg.kind === "schedule") {
    const payload = pkg.payload as MetaShareSchedulePayload;
    const lessonsCount = payload.lessons?.length || 0;
    const subjectsCount = payload.subjects?.length || 0;
    summary = `Расписание «${payload.space?.name || "Школа"}»: ${lessonsCount} уроков, ${subjectsCount} предметов`;
  } else if (pkg.kind === "space") {
    const payload = pkg.payload as MetaShareSpacePayload;
    summary = `Пространство «${payload.space?.name || "Школа"}» с полной структурой`;
  }

  return {
    ok: true,
    pkg: pkg as MetaSharePackage,
    summary,
  };
}

/**
 * Helper to encode package for QR code or compact URI exchange
 * Uses Base64/URI encoding when appropriate or pure JSON
 */
export function encodeMetaShareForQr(pkg: MetaSharePackage): string {
  // If payload is small enough, compact JSON representation
  return JSON.stringify(pkg);
}

/**
 * Helper to parse QR or text input safely
 */
export function parseMetaShareInput(input: string): MetaShareValidationResult {
  try {
    const parsed = JSON.parse(input.trim());
    return validateMetaSharePackage(parsed);
  } catch {
    return { ok: false, error: "Некорректный синтаксис JSON" };
  }
}
