import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Globe,
  History,
  Info,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Btn, Card, controlClass } from "@/components/ms/ui";
import {
  canNativeInstallPackages,
  getNativeSigningFingerprint,
  getPlatform,
  requestNativeInstallPermission,
  triggerNativeApkInstall,
} from "@/lib/ms/native";
import { useMs } from "@/lib/ms/store";
import {
  DEFAULT_UPDATE_SETTINGS,
  type ReleaseChannel,
  type ReleaseItem,
  type ReleaseManifest,
  syncMetaUpdate,
  verifyReleaseItem,
} from "@/lib/ms/updates";
import { CURRENT_VERSION, CURRENT_VERSION_CODE, isDowngrade, isUpdateAvailable } from "@/lib/ms/version";

export const CURRENT_APP_VERSION = CURRENT_VERSION;
export { CURRENT_VERSION_CODE };

const STATUS_LABELS: Record<string, { label: string; colorClass: string }> = {
  detected: { label: "Обнаружен", colorClass: "text-muted" },
  pending_verification: { label: "Ожидает проверки", colorClass: "text-muted" },
  verifying: { label: "Проверяется", colorClass: "text-copper" },
  verified: { label: "Подтверждён", colorClass: "text-sage" },
  ready_to_install: { label: "Готов к установке", colorClass: "text-sage" },
  incompatible: { label: "Несовместим", colorClass: "text-clay" },
  corrupted: { label: "Повреждён", colorClass: "text-clay" },
  verification_failed: { label: "Ошибка проверки", colorClass: "text-clay" },
  deprecated: { label: "Устарел", colorClass: "text-muted" },
  revoked: { label: "Отозван", colorClass: "text-clay" },
};

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto API недоступен для вычисления SHA-256.");
  }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function UpdatesScreen() {
  const data = useMs((s) => s.data);
  const setUpdateChannel = useMs((s) => s.setUpdateChannel);
  const setUpdateSettings = useMs((s) => s.setUpdateSettings);
  const saveCachedManifest = useMs((s) => s.saveCachedManifest);
  const markVersionNotified = useMs((s) => s.markVersionNotified);

  const settings = { ...DEFAULT_UPDATE_SETTINGS, ...(data.updateSettings || {}) };
  const channel: ReleaseChannel = data.updateChannel || settings.channel || "stable";

  const [loading, setLoading] = useState(false);
  const [manifest, setManifest] = useState<ReleaseManifest | null>(data.cachedReleaseManifest ?? null);
  const [source, setSource] = useState<"github_api" | "manifest_cache" | "offline">(
    settings.lastSyncedSource || "manifest_cache"
  );
  const [error, setError] = useState<string | null>(null);
  const [checksOpen, setChecksOpen] = useState(false);

  // Channel preview modal/banner before switching
  const [pendingChannel, setPendingChannel] = useState<ReleaseChannel | null>(null);

  // History filters & expanded release
  const [historyFilter, setHistoryFilter] = useState<"all" | ReleaseChannel>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  // Download & SHA-256 verification state
  const [downloadingTag, setDownloadingTag] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [downloadResult, setDownloadResult] = useState<{
    tag: string;
    ok: boolean;
    computedSha256?: string;
    message: string;
  } | null>(null);
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<ReleaseItem | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const platform = getPlatform();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const nativeFingerprint = useMemo(() => getNativeSigningFingerprint(), []);
  const nativeCanInstall = useMemo(() => (platform === "android" ? canNativeInstallPackages() : false), [platform]);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await syncMetaUpdate(manifest || data.cachedReleaseManifest);
      setManifest(res.manifest);
      setSource(res.source);
      saveCachedManifest(res.manifest);
      setUpdateSettings({
        lastCheckedAt: new Date().toISOString(),
        lastSyncedSource: res.source,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка синхронизации с GitHub Releases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releases = manifest?.releases ?? [];
  const channelReleases = useMemo(
    () => releases.filter((r) => r.channel === channel),
    [releases, channel]
  );

  const activeRelease: ReleaseItem | undefined = channelReleases[0] || releases[0];
  const verification = useMemo(() => {
    if (!activeRelease) return null;
    return verifyReleaseItem(activeRelease, platform);
  }, [activeRelease, platform]);

  const hasNewerVersion = activeRelease
    ? isUpdateAvailable(CURRENT_APP_VERSION, CURRENT_VERSION_CODE, activeRelease.version, activeRelease.versionCode)
    : false;

  const isExactCurrent = activeRelease
    ? activeRelease.version.split("-")[0] === CURRENT_APP_VERSION &&
      activeRelease.versionCode === CURRENT_VERSION_CODE
    : false;

  const previewTargetRelease = pendingChannel
    ? releases.find((r) => r.channel === pendingChannel)
    : undefined;

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return releases.filter((r) => {
      if (historyFilter !== "all" && r.channel !== historyFilter) return false;
      if (!q) return true;
      return (
        r.version.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.changelog.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [releases, historyFilter, searchQuery]);

  const startDownloadWithVerify = async (release: ReleaseItem) => {
    if (settings.wifiOnly && typeof navigator !== "undefined") {
      const conn = (navigator as unknown as { connection?: { type?: string } }).connection;
      if (conn?.type && conn.type !== "wifi" && conn.type !== "ethernet") {
        setInstallNotice("Включён режим «Только по Wi-Fi». Переключитесь на Wi-Fi или отключите ограничение в настройках ниже.");
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setDownloadingTag(release.tag);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setDownloadResult(null);
    setInstallNotice(null);

    try {
      const response = await fetch(release.apkUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Сервер вернул HTTP ${response.status} при скачивании APK.`);
      }

      const contentLen = Number(response.headers.get("content-length") || 0);
      setTotalBytes(contentLen);

      let fullBuffer: ArrayBuffer;
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            setDownloadedBytes(received);
            if (contentLen > 0) {
              setDownloadProgress(Math.min(100, Math.round((received / contentLen) * 100)));
            }
          }
        }

        const merged = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.length;
        }
        fullBuffer = merged.buffer;
      } else {
        fullBuffer = await response.arrayBuffer();
        setDownloadedBytes(fullBuffer.byteLength);
        setDownloadProgress(100);
      }

      const computedHash = await computeSha256Hex(fullBuffer);
      const expected = (release.sha256 || "").toLowerCase();
      const matched = expected.length === 64 && computedHash.toLowerCase() === expected;

      if (!matched) {
        setDownloadResult({
          tag: release.tag,
          ok: false,
          computedSha256: computedHash,
          message: "Контрольная сумма SHA-256 не совпадает! Установка заблокирована в целях безопасности.",
        });
        return;
      }

      // Trigger local file save in browser/PWA or proceed to Android native installer
      const blob = new Blob([fullBuffer], { type: "application/vnd.android.package-archive" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = release.fileName || `MetaSchool-${release.version}.apk`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);

      setDownloadResult({
        tag: release.tag,
        ok: true,
        computedSha256: computedHash,
        message: "Файл APK скачан и прошёл полную проверку целостности SHA-256.",
      });
      markVersionNotified(release.tag);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        setDownloadResult({
          tag: release.tag,
          ok: false,
          message: "Загрузка отменена пользователем.",
        });
      } else {
        setDownloadResult({
          tag: release.tag,
          ok: false,
          message:
            "Прямая потоковая загрузка заблокирована CORS политики GitHub Releases в браузере. Используйте прямую ссылку браузера или нативный Android-загрузчик.",
        });
      }
    } finally {
      setDownloadingTag(null);
    }
  };

  const handleInstallAction = (release: ReleaseItem) => {
    if (verification?.status === "corrupted") {
      setInstallNotice("Установка невозможна: релиз не прошёл проверку целостности.");
      return;
    }

    if (platform === "android") {
      if (!nativeCanInstall) {
        requestNativeInstallPermission();
        setInstallNotice("Выдайте разрешение «Установка неизвестных приложений» для MetaШкола и повторите попытку.");
        return;
      }
      const res = triggerNativeApkInstall(release.apkUrl, release.sha256, release.version);
      setInstallNotice(res.message);
      return;
    }

    // In Web/PWA, launch verified download or open GitHub Release asset directly
    window.open(release.apkUrl, "_blank", "noopener,noreferrer");
    setInstallNotice(
      `В среде ${platform.toUpperCase()} автоматический PackageInstaller недоступен: файл ${release.fileName} открыт для скачивания и ручной установки.`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <RefreshCw className="h-7 w-7 text-copper" />
            <span>MetaUpdate Center</span>
          </h1>
          <p className="text-sm text-muted">
            Управление версиями, синхронизация GitHub Releases и 17-ступенчатая проверка целостности
          </p>
        </div>
        <Btn variant="primary" onClick={handleSync} disabled={loading} className="text-xs">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Синхронизация..." : "Проверить обновления"}</span>
        </Btn>
      </header>

      {/* 1. Top Telemetry & Status Bar */}
      <Card className="border-copper/40 bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-copper">
              Установленная сборка · org.metaschool.app
            </p>
            <h2 className="mt-1 text-2xl font-bold text-fg">
              MetaШкола v{CURRENT_APP_VERSION} <span className="text-base font-normal text-muted">(Build {CURRENT_VERSION_CODE})</span>
            </h2>
            <p className="mt-1 text-xs text-muted">
              Среда: {platform === "android" ? "Android Native APK" : platform === "pwa" ? "PWA Standalone" : "Web Browser"}
              {nativeFingerprint ? ` · Подпись: ${nativeFingerprint}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${isOnline ? "text-sage" : "text-clay"}`}>
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span>{isOnline ? "Онлайн" : "Офлайн"}</span>
            </span>
            <span className="text-[11px] text-muted">
              Источник: {source === "github_api" ? "GitHub API" : source === "manifest_cache" ? "Локальный манифест" : "Офлайн-кэш"}
            </span>
            <span className="text-[11px] text-muted tabular-nums">
              {settings.lastCheckedAt ? new Date(settings.lastCheckedAt).toLocaleString() : "Не проверялось"}
            </span>
          </div>
        </div>

        {/* Channel Switcher (with Pre-Switch Preview) */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-muted block">Активный канал обновлений</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["stable", "beta", "debug"] as ReleaseChannel[]).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      if (ch !== channel) setPendingChannel(ch);
                    }}
                    className={`min-h-9 rounded-xl px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                      channel === ch
                        ? "bg-copper text-copper-fg"
                        : "bg-surface-2 text-muted hover:text-fg"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-right">
              <span className="text-muted block">Последняя в канале [{channel}]:</span>
              <span className="font-bold text-fg">
                {activeRelease ? `v${activeRelease.version} (Build ${activeRelease.versionCode})` : "Нет данных"}
              </span>
            </div>
          </div>

          {/* Pre-switch preview confirmation box */}
          {pendingChannel ? (
            <div className="mt-3 rounded-xl border border-copper/50 bg-copper/10 p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-fg">
                    Переключить канал обновлений на «{pendingChannel.toUpperCase()}»?
                  </p>
                  <p className="text-muted mt-0.5">
                    Доступная версия: <strong>{previewTargetRelease ? `v${previewTargetRelease.version} (${previewTargetRelease.apkSize})` : "не найдена"}</strong>.
                    Переключение канала не запускает автоматическую установку.
                  </p>
                  {pendingChannel === "debug" ? (
                    <p className="mt-1 text-clay font-semibold">
                      Внимание: Debug APK подписывается отладочным debug.keystore. Установка поверх Stable (релизного ключа) невозможна на Android без удаления или резервного копирования.
                    </p>
                  ) : pendingChannel === "beta" ? (
                    <p className="mt-1 text-muted">
                      Beta-версии содержат новые функции и предназначены для предварительного тестирования.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={() => {
                    setUpdateChannel(pendingChannel);
                    setPendingChannel(null);
                  }}
                  className="text-xs"
                >
                  Подтвердить переход на {pendingChannel.toUpperCase()}
                </Btn>
                <Btn variant="ghost" onClick={() => setPendingChannel(null)} className="text-xs">
                  Отмена
                </Btn>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* 2. Active / Available Update Card */}
      {activeRelease ? (
        <Card className={`border-2 ${hasNewerVersion ? "border-copper bg-surface-2/30" : "border-line bg-surface"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className={STATUS_LABELS[verification?.status || activeRelease.status]?.colorClass || "text-sage"}>
                  {hasNewerVersion
                    ? "Доступна для установки"
                    : isExactCurrent
                      ? "Установлена актуальная версия"
                      : STATUS_LABELS[verification?.status || activeRelease.status]?.label || "Проверено"}
                </span>
                <span className="text-muted">·</span>
                <span className="uppercase text-copper">{activeRelease.channel}</span>
                <span className="text-muted">·</span>
                <span className="text-muted">{activeRelease.apkSize}</span>
              </div>
              <h3 className="mt-1 text-xl font-bold text-fg">
                MetaШкола v{activeRelease.version} <span className="text-sm font-normal text-muted">(Build {activeRelease.versionCode})</span>
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Дата публикации: {activeRelease.releaseDate} · {activeRelease.minAndroid} · {activeRelease.compatibility}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant="primary"
              onClick={() => startDownloadWithVerify(activeRelease)}
              disabled={downloadingTag === activeRelease.tag}
              className="text-xs"
            >
              <Download className="h-4 w-4" />
              <span>
                {downloadingTag === activeRelease.tag
                  ? `Загрузка (${downloadProgress}%)...`
                  : isExactCurrent
                    ? `Переустановить текущую (${activeRelease.apkSize})`
                    : `Скачать и проверить SHA-256 (${activeRelease.apkSize})`}
              </span>
            </Btn>

            {downloadingTag === activeRelease.tag ? (
              <Btn
                variant="danger"
                onClick={() => abortRef.current?.abort()}
                className="text-xs"
              >
                Отменить
              </Btn>
            ) : null}

            <Btn variant="ghost" onClick={() => handleInstallAction(activeRelease)} className="text-xs">
              <Smartphone className="h-4 w-4 text-copper" />
              <span>{platform === "android" ? "Установить на Android" : "Скачать APK напрямую"}</span>
            </Btn>

            <a
              href={activeRelease.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-surface-2"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
              <span>GitHub Release</span>
            </a>

            <a
              href="https://andarer.github.io/MetaShkola/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-surface-2"
            >
              <Globe className="h-3.5 w-3.5 text-muted" />
              <span>PWA версия</span>
            </a>
          </div>

          {/* Download progress bar */}
          {downloadingTag === activeRelease.tag ? (
            <div className="mt-3 space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-copper transition-all" style={{ width: `${downloadProgress}%` }} />
              </div>
              <p className="text-[11px] text-muted tabular-nums">
                Загружено: {(downloadedBytes / (1024 * 1024)).toFixed(2)} МБ
                {totalBytes > 0 ? ` из ${(totalBytes / (1024 * 1024)).toFixed(2)} МБ (${downloadProgress}%)` : ""}
              </p>
            </div>
          ) : null}

          {downloadResult && downloadResult.tag === activeRelease.tag ? (
            <div
              className={`mt-3 rounded-xl border p-3 text-xs ${
                downloadResult.ok ? "border-sage/40 bg-sage/10 text-sage" : "border-clay/40 bg-clay/10 text-clay"
              }`}
            >
              <p className="font-semibold">{downloadResult.message}</p>
              {downloadResult.computedSha256 ? (
                <code className="mt-1 block break-all font-mono text-[10px]">
                  Вычисленный SHA-256: {downloadResult.computedSha256}
                </code>
              ) : null}
            </div>
          ) : null}

          {installNotice ? (
            <div className="mt-3 rounded-xl border border-copper/40 bg-copper/10 p-3 text-xs text-fg flex items-start gap-2">
              <Info className="h-4 w-4 text-copper shrink-0 mt-0.5" />
              <span>{installNotice}</span>
            </div>
          ) : null}

          {/* SHA-256 & Certificate Fingerprint */}
          <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-fg">
                <ShieldCheck className="h-4 w-4 text-copper" />
                <span>SHA-256 ({activeRelease.fileName})</span>
              </span>
              {activeRelease.certFingerprint ? (
                <span className="text-[11px] text-muted">{activeRelease.certFingerprint}</span>
              ) : null}
            </div>
            <code className="block break-all font-mono text-[11px] text-muted bg-surface-2 p-2 rounded-lg">
              {activeRelease.sha256}
            </code>
          </div>

          {/* 17 Verification Criteria Panel */}
          {verification ? (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-xs">
              <button
                type="button"
                onClick={() => setChecksOpen((prev) => !prev)}
                className="flex w-full items-center justify-between font-bold text-fg"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage" />
                  <span>
                    Результаты верификации: {verification.checks.filter((c) => c.passed).length} / {verification.checks.length} проверок пройдено
                  </span>
                </span>
                {checksOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {checksOpen ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-line/60">
                  {verification.checks.map((chk, idx) => (
                    <div key={chk.id} className="flex items-start gap-1.5">
                      {chk.passed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-sage shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-clay shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-fg">
                          {idx + 1}. {chk.label}
                        </span>
                        {chk.details ? <span className="ml-1 text-[10px] text-muted">({chk.details})</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Changelog */}
          {activeRelease.changelog && activeRelease.changelog.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Что нового в выпуске:</h4>
              <ul className="mt-1.5 space-y-1 text-xs text-fg">
                {activeRelease.changelog.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-copper font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* 3. Rollback & Downgrade Warning Dialog */}
      {rollbackTarget ? (
        <Card className="border-clay/50 bg-clay/5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-clay shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs">
              <h3 className="text-sm font-bold text-fg">
                Откат к предыдущей версии: v{rollbackTarget.version} (Build {rollbackTarget.versionCode})
              </h3>
              <p className="text-muted">
                Android запрещает установку APK с более низким <code>versionCode</code> поверх установленного (ошибка <code>INSTALL_FAILED_VERSION_DOWNGRADE</code>), а также при несовпадении сертификата подписи.
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-fg">
                <li>Сделайте резервную копию базы данных в <strong>Настройки → JSON или зашифрованный бэкап (.msenc)</strong>.</li>
                <li>Удалите текущую MetaШкола с устройства (если выполняется откат версии или смена канала Stable ↔ Debug).</li>
                <li>Скачайте и установите выбранный APK вручную.</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <Btn variant="primary" onClick={() => handleInstallAction(rollbackTarget)} className="text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>Скачать v{rollbackTarget.version} ({rollbackTarget.apkSize})</span>
                </Btn>
                <Btn variant="ghost" onClick={() => setRollbackTarget(null)} className="text-xs">
                  Закрыть предупреждение
                </Btn>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 4. Full Release History with Filters & Search */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-copper" />
            <span>История версий ({filteredHistory.length})</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "stable", "beta", "debug"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setHistoryFilter(f)}
                className={`min-h-8 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase ${
                  historyFilter === f ? "bg-copper text-copper-fg" : "bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {f === "all" ? "Все" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 relative">
          <Search className="h-4 w-4 text-muted absolute left-3 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по версии, тегу или изменениям..."
            className={`${controlClass} pl-9 text-sm`}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {filteredHistory.length === 0 ? (
            <p className="text-xs text-muted py-2">По вашему фильтру релизы не найдены.</p>
          ) : null}
          {filteredHistory.map((item) => {
            const expanded = expandedTag === item.tag;
            const downgrade = isDowngrade(CURRENT_APP_VERSION, CURRENT_VERSION_CODE, item.version, item.versionCode);
            const isCurrentItem =
              item.version.split("-")[0] === CURRENT_APP_VERSION && item.versionCode === CURRENT_VERSION_CODE;
            return (
              <div key={item.tag} className="rounded-xl border border-line bg-surface-2/30 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-fg">v{item.version}</span>
                      <span className="text-muted">Build {item.versionCode}</span>
                      <span className="uppercase font-semibold text-copper">{item.channel}</span>
                      {isCurrentItem ? <span className="font-semibold text-sage">· Текущая</span> : null}
                      {downgrade ? <span className="text-muted">· Предыдущая</span> : null}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {item.releaseDate} · {item.apkSize} · CI: {item.ciStatus || "success"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {downgrade ? (
                      <Btn variant="ghost" onClick={() => setRollbackTarget(item)} className="text-xs">
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Откат</span>
                      </Btn>
                    ) : (
                      <Btn variant="ghost" onClick={() => handleInstallAction(item)} className="text-xs">
                        <Download className="h-3.5 w-3.5" />
                        <span>APK</span>
                      </Btn>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedTag(expanded ? null : item.tag)}
                      className="inline-flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-fg"
                    >
                      <span>Детали</span>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-3 pt-2.5 border-t border-line/60 space-y-2">
                    <p className="text-[11px] text-muted">
                      <strong>Совместимость:</strong> {item.compatibility} · {item.minAndroid} → {item.targetAndroid}
                    </p>
                    <p className="text-[11px] font-mono break-all text-muted">
                      <strong>SHA-256:</strong> {item.sha256}
                    </p>
                    {item.certFingerprint ? (
                      <p className="text-[11px] text-muted">
                        <strong>Сертификат:</strong> {item.certFingerprint}
                      </p>
                    ) : null}
                    {item.changelog.length > 0 ? (
                      <div>
                        <p className="font-semibold text-fg">Изменения:</p>
                        <ul className="list-disc pl-4 text-muted space-y-0.5">
                          {item.changelog.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {item.knownIssues && item.knownIssues.length > 0 ? (
                      <p className="text-[11px] text-clay">
                        <strong>Особенности:</strong> {item.knownIssues.join("; ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. Update Settings Card */}
      <Card>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-copper" />
          <span>Настройки проверки и загрузки обновлений</span>
        </h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {([
            ["autoCheck", "Автоматическая фоновая проверка обновлений"],
            ["checkOnLaunch", "Проверять при запуске приложения"],
            ["checkOnResume", "Проверять при возврате в приложение (с троттлингом)"],
            ["notifyOnNewVersion", "Добавлять уведомление о новой версии в «Входящие»"],
            ["wifiOnly", "Скачивать APK только при наличии Wi-Fi (в поддерживаемых браузерах)"],
            ["confirmBeforeDownload", "Спрашивать подтверждение перед загрузкой"],
            ["confirmBeforeInstall", "Спрашивать подтверждение перед установкой"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/30 px-3 py-2 cursor-pointer">
              <span className="text-fg">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(e) => setUpdateSettings({ [key]: e.target.checked })}
              />
            </label>
          ))}
          <label className="flex min-h-10 items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/30 px-3 py-2">
            <span className="text-fg">Интервал автопроверки (часов)</span>
            <select
              value={settings.checkIntervalHours}
              onChange={(e) => setUpdateSettings({ checkIntervalHours: Number(e.target.value) })}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-fg"
            >
              <option value={1}>1 час</option>
              <option value={6}>6 часов</option>
              <option value={12}>12 часов</option>
              <option value={24}>24 часа</option>
            </select>
          </label>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-clay/30 bg-clay/10 p-3 text-xs text-clay flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
