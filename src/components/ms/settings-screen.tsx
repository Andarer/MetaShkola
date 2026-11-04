import { useState } from "react";
import { ShieldCheck, Lock, Unlock, RefreshCw, Check, AlertCircle, Download, ExternalLink } from "lucide-react";
import { t } from "@/lib/ms/i18n";
import { canInSpace } from "@/lib/ms/rbac";
import { redactSecrets, useMs } from "@/lib/ms/store";
import type { Lang, Theme } from "@/lib/ms/types";
import { Btn, Card, controlClass, downloadText, Field } from "@/components/ms/ui";
import { encryptData, decryptData } from "@/lib/ms/crypto";

export function SettingsScreen() {
  const data = useMs((s) => s.data);
  const setLang = useMs((s) => s.setLang);
  const setTheme = useMs((s) => s.setTheme);
  const setNotif = useMs((s) => s.setNotif);
  const importData = useMs((s) => s.importData);
  const resetAll = useMs((s) => s.resetAll);
  const flushOutbox = useMs((s) => s.flushOutbox);
  const clearOutbox = useMs((s) => s.clearOutbox);

  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const canAdmin = Boolean(
    profile &&
      canInSpace(profile, data.activeSpaceId, "import", data.customRoles) &&
      (profile.memberships.find((item) => item.spaceId === data.activeSpaceId)?.roleKeys ?? []).some((key) =>
        ["creator", "sysadmin", "orgAdmin", "familyAdmin"].includes(key)
      )
  );
  const canReset = Boolean(profile?.isProjectCreator || canAdmin);

  const [secrets, setSecrets] = useState(false);
  const [message, setMessage] = useState("");
  const [perm, setPerm] = useState("");

  // Encrypted backup state
  const [encPassword, setEncPassword] = useState("");
  const [encStatus, setEncStatus] = useState<string | null>(null);
  const [encWorking, setEncWorking] = useState(false);

  const notifKeys = [
    ["lessonStart", "n_lessonStart"],
    ["lessonEnd", "n_lessonEnd"],
    ["breakStart", "n_breakStart"],
    ["breakEnd", "n_breakEnd"],
    ["remind15", "n_remind15"],
    ["remind5", "n_remind5"],
    ["tasks", "n_tasks"],
    ["personal", "n_personal"],
  ] as const;

  const outboxItems = data.outbox || [];

  const handleExportEncrypted = async () => {
    if (!encPassword.trim()) {
      setEncStatus("Укажите пароль для шифрования бэкапа.");
      return;
    }
    setEncWorking(true);
    setEncStatus(null);
    try {
      const payload = redactSecrets(data, secrets);
      const encryptedBase64 = await encryptData(payload, encPassword.trim());
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadText(`metashkola-backup-${dateStr}.msenc`, encryptedBase64, "application/octet-stream");
      setEncStatus("Зашифрованный бэкап успешно скачан!");
    } catch {
      setEncStatus("Ошибка шифрования бэкапа.");
    } finally {
      setEncWorking(false);
    }
  };

  const handleImportEncrypted = async (file: File) => {
    if (!encPassword.trim()) {
      setEncStatus("Введите пароль для расшифровки бэкапа.");
      return;
    }
    setEncWorking(true);
    setEncStatus(null);
    try {
      const text = await file.text();
      const decrypted = await decryptData(text, encPassword.trim());
      const res = importData(decrypted, "replace");
      if (res.ok) {
        setEncStatus("База данных успешно восстановлена из зашифрованного бэкапа!");
      } else {
        setEncStatus("Ошибка структуры данных после расшифровки.");
      }
    } catch {
      setEncStatus("Неверный пароль или поврежденный файл бэкапа.");
    } finally {
      setEncWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "settings")}</h1>

      {/* Offline Sync & Outbox Queue Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-sage animate-pulse" />
            <h2 className="text-xl font-semibold">Очередь оффлайн-синхронизации</h2>
          </div>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
            {outboxItems.length} в очереди
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          При работе без сети все ваши действия ставятся в локальную очередь и автоматически синхронизируются при появлении интернета.
        </p>

        {outboxItems.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-line bg-surface-2/40 p-2 text-xs">
            {outboxItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="font-medium text-fg">{item.summary}</span>
                <span className="text-muted tabular-nums">{new Date(item.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-sage font-medium">Все данные полностью синхронизированы с локальным хранилищем.</p>
        )}

        <div className="mt-3 flex gap-2">
          <Btn
            onClick={() => {
              const res = flushOutbox();
              setMessage(`Синхронизировано ${res.count} операций.`);
            }}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Синхронизировать сейчас</span>
          </Btn>
          {outboxItems.length > 0 ? (
            <Btn variant="ghost" onClick={clearOutbox} className="text-xs">
              Очистить очередь
            </Btn>
          ) : null}
        </div>
      </Card>

      {/* Theme Settings */}
      <Card>
        <h2 className="text-xl">{t(lang, "theme")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["light", "themeLight"],
            ["dark", "themeDark"],
            ["system", "themeSystem"],
          ] as const).map(([value, key]) => (
            <Btn key={value} variant={data.theme === value ? "primary" : "ghost"} onClick={() => setTheme(value as Theme)}>
              {t(lang, key)}
            </Btn>
          ))}
        </div>
      </Card>

      {/* Language Settings */}
      <Card>
        <h2 className="text-xl">{t(lang, "language")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["ru", "uk", "en"] as Lang[]).map((code) => (
            <Btn key={code} variant={lang === code ? "primary" : "ghost"} onClick={() => setLang(code)}>
              {code.toUpperCase()}
            </Btn>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="text-xl">{t(lang, "notif")}</h2>
        <p className="mt-2 text-sm text-muted">{t(lang, "notifHint")}</p>
        <div className="mt-3 flex flex-col gap-2">
          {notifKeys.map(([key, label]) => (
            <label key={key} className="flex h-11 items-center justify-between gap-3 text-sm">
              <span>{t(lang, label)}</span>
              <input type="checkbox" checked={data.notif[key]} onChange={(event) => setNotif(key, event.target.checked)} />
            </label>
          ))}
        </div>
        <Btn
          className="mt-3"
          variant="ghost"
          onClick={async () => {
            if (typeof Notification === "undefined") {
              setPerm(t(lang, "notifDenied"));
              return;
            }
            const result = await Notification.requestPermission();
            setPerm(result === "granted" ? t(lang, "notifGranted") : t(lang, "notifDenied"));
          }}
        >
          {t(lang, "notifBrowser")}
        </Btn>
        {perm ? <p className="mt-2 text-sm text-muted">{perm}</p> : null}
        <p className="mt-3 text-sm text-muted">{t(lang, "cloudNotif")}</p>
      </Card>

      {/* Android APK Download & Installation */}
      <Card className="border-copper/40 bg-surface-2/60">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-fg">
              <Download className="h-5 w-5 text-copper" />
              <span>Мобильное приложение Android (APK)</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              Установите нативное приложение MetaШкола 2.0 на смартфон или планшет с Android 5.0+ (Lollipop до Android 14+ / OPPO A74).
            </p>
          </div>
          <span className="rounded-full bg-copper/20 px-2.5 py-0.5 text-xs font-semibold text-copper">
            v2.0.1 (8.3 МБ)
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="./downloads/MetaSchool-v2.0.1.apk"
            download="MetaSchool-v2.0.1.apk"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-copper px-5 text-sm font-bold text-copper-fg shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Скачать MetaSchool-v2.0.1.apk</span>
          </a>

          <a
            href="https://github.com/Andarer/MetaShkola/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-xs font-medium text-fg border border-line hover:bg-surface-2 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted" />
            <span>Репозиторий и релизы на GitHub</span>
          </a>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs text-muted space-y-1.5">
          <p className="font-semibold text-fg">Инструкция по установке на Android (OPPO / Xiaomi / Samsung):</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Нажмите <strong>«Скачать MetaSchool-v2.0.1.apk»</strong> и дождитесь завершения загрузки в браузере.</li>
            <li>Откройте скачанный файл в шторке уведомлений или через приложение «Файлы» (папка Загрузки).</li>
            <li>Если система предупредит о неизвестном источнике — разрешите установку для текущего браузера в настройках безопасности.</li>
            <li>Приложение установится с полной поддержкой фоновых звонков, расписания и работы без интернета (Offline-First).</li>
          </ol>
          <p className="pt-1 text-[11px] text-muted">
            Контрольная сумма SHA-256: <code className="font-mono text-fg bg-surface-2 px-1 py-0.5 rounded">10c012dbc3e01976bb9c3d0441ca27cb9aa417349e8ed4ffdf281fb0b16185e7</code>
          </p>
        </div>
      </Card>

      {/* Encrypted Master Backup (AES-GCM) */}
      <Card>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-copper" />
          <span>Зашифрованное резервное копирование (AES-GCM)</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Создавайте защищенные паролем резервные копии (`.msenc`) для безопасного хранения в Google Drive, Telegram или на флешке.
        </p>

        {canAdmin ? (
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Мастер-пароль шифрования бэкапа">
              <input
                type="password"
                className={controlClass}
                placeholder="Надежный секретный пароль..."
                value={encPassword}
                onChange={(e) => setEncPassword(e.target.value)}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Btn onClick={handleExportEncrypted} disabled={encWorking} className="flex items-center gap-2 text-xs">
                <Lock className="h-4 w-4" />
                <span>{encWorking ? "Шифрование..." : "Скачать зашифрованный бэкап (.msenc)"}</span>
              </Btn>

              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-surface-2 px-4 text-xs font-semibold hover:bg-surface-2/80 transition-colors">
                <Unlock className="h-4 w-4 mr-2" />
                <span>Восстановить из .msenc</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".msenc"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportEncrypted(f);
                  }}
                />
              </label>
            </div>

            {encStatus ? (
              <p className={`text-xs font-semibold ${encStatus.includes("успешно") ? "text-sage" : "text-clay"}`}>
                {encStatus}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{t(lang, "noAccess")}</p>
        )}
      </Card>

      {/* JSON Plaintext Export / Import */}
      <Card>
        <h2 className="text-xl">{t(lang, "exportJson")}</h2>
        {canAdmin ? (
          <>
            <label className="mt-3 flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={secrets} onChange={(event) => setSecrets(event.target.checked)} />
              {t(lang, "includeSecrets")}
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => downloadText("metashkola.json", JSON.stringify(redactSecrets(data, secrets), null, 2), "application/json")}>
                {t(lang, "exportJson")}
              </Btn>
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-surface-2 px-4 text-sm font-semibold">
                {t(lang, "importJson")}
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const raw = JSON.parse(await file.text()) as unknown;
                      const result = importData(raw, "merge");
                      setMessage(result.ok ? t(lang, "imported") : t(lang, "err_format"));
                    } catch {
                      setMessage(t(lang, "err_format"));
                    }
                  }}
                />
              </label>
              <Btn
                variant="ghost"
                onClick={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/json";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const raw = JSON.parse(await file.text()) as unknown;
                      const result = importData(raw, "replace");
                      setMessage(result.ok ? t(lang, "imported") : t(lang, "err_format"));
                    } catch {
                      setMessage(t(lang, "err_format"));
                    }
                  };
                  input.click();
                }}
              >
                {t(lang, "replace")}
              </Btn>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{t(lang, "noAccess")}</p>
        )}
        {message ? <p className="mt-2 text-sm text-sage">{message}</p> : null}
      </Card>

      {/* About & Runtime info */}
      <Card>
        <h2 className="text-xl">{t(lang, "about")}</h2>
        <p className="mt-2 text-sm">{t(lang, "aboutBody")}</p>
        <p className="mt-2 text-sm font-semibold text-copper">{t(lang, "authorLine")}</p>
        <div className="mt-3 rounded-xl border border-line bg-surface-2/40 p-3 text-xs text-muted space-y-1">
          <p><strong className="text-fg">Версия:</strong> 2.0.0 (Сборка 200, Релиз ноябрь 2026)</p>
          <p><strong className="text-fg">Платформа:</strong> {(typeof window !== "undefined" && (window as unknown as { MetaSchoolNative?: unknown }).MetaSchoolNative) ? "Android Native Client (API 21..34)" : "Web Platform (PWA Offline-First)"}</p>
          <p><strong className="text-fg">Устройство:</strong> {typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 75) + "..." : "OPPO A74 / Compatible"}</p>
          <p><strong className="text-fg">Хранилище:</strong> 100% Автономное (Local Storage & IndexedDB)</p>
        </div>
        <h3 className="mt-4 text-lg">{t(lang, "architecture")}</h3>
        <p className="mt-2 text-sm">{t(lang, "archOk")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "archNo")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "delivery")}</p>
      </Card>

      {/* Audit Log */}
      <Card>
        <h2 className="text-xl">{t(lang, "audit")}</h2>
        {data.audit.slice(0, 12).map((item) => (
          <p key={item.id} className="mt-2 text-sm text-muted">{item.text}</p>
        ))}
      </Card>

      {canReset ? (
        <Btn
          variant="danger"
          onClick={() => {
            if (window.confirm(t(lang, "resetConfirm"))) resetAll();
          }}
        >
          {t(lang, "reset")}
        </Btn>
      ) : null}
    </div>
  );
}
