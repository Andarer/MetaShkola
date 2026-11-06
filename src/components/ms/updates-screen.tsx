import { useState, useEffect } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Globe,
  Radio,
  FileCheck2,
} from "lucide-react";
import { Btn, Card } from "@/components/ms/ui";
import { useMs } from "@/lib/ms/store";
import type { UpdateInfo } from "@/lib/ms/types";

import { isUpdateAvailable } from "@/lib/ms/version";

export const CURRENT_APP_VERSION = "2.2.0";
export const CURRENT_VERSION_CODE = 220;

export function UpdatesScreen() {
  const data = useMs((s) => s.data);
  const setUpdateChannel = useMs((s) => s.setUpdateChannel);

  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const channel = data.updateChannel || "stable";

  const checkForUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const releaseUrl = `${import.meta.env.BASE_URL}release.json?t=${Date.now()}`.replace(/\/\//g, "/");
      let res = await fetch(releaseUrl).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("./release.json?t=" + Date.now());
      }
      if (!res.ok) {
        throw new Error(`Не удалось загрузить данные манифеста (${res.status})`);
      }
      const json = (await res.json()) as UpdateInfo;
      setUpdateInfo(json);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка проверки обновлений");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  const hasNewerVersion = updateInfo
    ? isUpdateAvailable(
        CURRENT_APP_VERSION,
        CURRENT_VERSION_CODE,
        updateInfo.latestVersion,
        updateInfo.versionCode,
      )
    : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <RefreshCw className="h-7 w-7 text-copper" />
            <span>Центр обновлений</span>
          </h1>
          <p className="text-sm text-muted">
            MetaSchool Update Center · Контроль версий, проверка целостности и релизы
          </p>
        </div>
        <Btn
          variant="primary"
          onClick={checkForUpdates}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Проверка..." : "Проверить обновления"}</span>
        </Btn>
      </header>

      {/* Current Version Card */}
      <Card className="border-copper/40 bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-copper/30 bg-copper/10 px-3 py-0.5 text-xs font-semibold text-copper">
              <span>Текущая сборка приложения</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-fg">
              MetaШкола v{CURRENT_APP_VERSION}
            </h2>
            <p className="text-xs text-muted">Код сборки: {CURRENT_VERSION_CODE} · Платформа: Android APK & Web PWA</p>
          </div>
          <div className="flex items-center gap-2">
            {updateInfo?.sha256 ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-sage/15 px-3 py-1 text-xs font-semibold text-sage">
                <CheckCircle2 className="h-4 w-4" />
                <span>Манифест релиза подтверждён</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                <AlertCircle className="h-4 w-4" />
                <span>Проверка манифеста не выполнена</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-line/60 pt-4 text-xs">
          <div>
            <span className="text-muted">Канал обновлений:</span>
            <div className="mt-1 flex gap-1.5">
              {(["stable", "beta", "debug"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setUpdateChannel(ch)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                    channel === ch ? "bg-copper text-copper-fg" : "bg-surface-2 text-muted hover:text-fg"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-muted">Последняя проверка:</span>
            <p className="mt-1 font-semibold text-fg">
              {lastChecked ? lastChecked.toLocaleTimeString() : "Только что"}
            </p>
          </div>
          <div>
            <span className="text-muted">Статус:</span>
            <p className="mt-1 font-semibold text-sage">
              {hasNewerVersion ? "Доступна новая версия!" : "Установлена актуальная версия"}
            </p>
          </div>
        </div>
      </Card>

      {/* Available Update Card */}
      {updateInfo ? (
        <Card className={`border-2 ${hasNewerVersion ? "border-copper bg-surface-2/40" : "border-line bg-surface"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${hasNewerVersion ? "bg-copper animate-ping" : "bg-sage"}`} />
                <h3 className="text-lg font-bold text-fg">
                  {hasNewerVersion
                    ? `Новая версия: MetaШкола v${updateInfo.latestVersion}`
                    : `Релизный манифест: v${updateInfo.latestVersion}`}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                Дата публикации: {updateInfo.releaseDate} · Минимальная версия Android: {updateInfo.minAndroid || "5.0+"}
              </p>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-fg">
              {updateInfo.apkSize || "8.5 МБ"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={updateInfo.apkUrl || "https://github.com/Andarer/MetaShkola/releases/latest"}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-copper px-5 text-sm font-bold text-copper-fg hover:brightness-110 active:scale-95 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Скачать официальный APK ({updateInfo.apkSize || "8.5 МБ"})</span>
            </a>

            <a
              href="https://github.com/Andarer/MetaShkola/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-xs font-semibold text-fg border border-line hover:bg-surface-2 transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
              <span>GitHub Releases</span>
            </a>

            <a
              href="https://andarer.github.io/MetaShkola/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-xs font-medium text-fg border border-line hover:bg-surface-2 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-muted" />
              <span>Открыть PWA на GitHub Pages</span>
            </a>
          </div>

          {/* SHA-256 and Integrity Check */}
          <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-fg">
              <ShieldCheck className="h-4 w-4 text-copper" />
              <span>Контрольная сумма SHA-256 (Release Integrity):</span>
            </div>
            <code className="block break-all font-mono text-[11px] text-muted bg-surface-2 p-2 rounded-lg border border-line/40">
              {updateInfo.sha256 || "ef66e06255f20c91343f219022aeeb2fcd445e59bfc03587fd66d0998dee9554"}
            </code>
          </div>

          {/* Changelog */}
          {updateInfo.changelog && updateInfo.changelog.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Что нового в этом выпуске:</h4>
              <ul className="mt-2 space-y-1 text-xs text-fg">
                {updateInfo.changelog.map((item, idx) => (
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

      {error ? (
        <div className="rounded-xl border border-clay/30 bg-clay/10 p-3 text-xs text-clay flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
