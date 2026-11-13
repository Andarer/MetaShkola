import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  Check,
  AlertCircle,
  Download,
  ExternalLink,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  RotateCcw,
} from "lucide-react";
import { t } from "@/lib/ms/i18n";
import { canInSpace } from "@/lib/ms/rbac";
import { redactSecrets, useMs } from "@/lib/ms/store";
import type { CardRadius, ColorPalette, Lang, Screen, Theme, UiDensity } from "@/lib/ms/types";
import { Btn, Card, controlClass, downloadText, Field } from "@/components/ms/ui";
import { encryptData, decryptData } from "@/lib/ms/crypto";
import { DEFAULT_DESIGN, PALETTES, getContrastColor } from "@/lib/ms/design";
import { CURRENT_VERSION, CURRENT_VERSION_CODE } from "@/lib/ms/version";

export function SettingsScreen({ onOpen }: { onOpen?: (screen: Screen) => void }) {
  const data = useMs((s) => s.data);
  const setLang = useMs((s) => s.setLang);
  const setTheme = useMs((s) => s.setTheme);
  const setDesignConfig = useMs((s) => s.setDesignConfig);
  const setNotif = useMs((s) => s.setNotif);
  const importData = useMs((s) => s.importData);
  const resetAll = useMs((s) => s.resetAll);
  const flushOutbox = useMs((s) => s.flushOutbox);
  const clearOutbox = useMs((s) => s.clearOutbox);

  const design = data.design ?? DEFAULT_DESIGN;

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
          Локальный журнал изменений для автономной работы и P2P-обмена. Все операции надёжно сохраняются в памяти устройства.
        </p>

        {outboxItems.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-line bg-surface-2/40 p-2 text-xs">
            {outboxItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      item.state === "pending" ? "bg-amber-500" : "bg-sage"
                    }`}
                  />
                  <span className="font-medium text-fg">{item.summary}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted">
                  <span>{item.state === "pending" ? "Ожидает" : "На устройстве"}</span>
                  <span className="tabular-nums">{new Date(item.at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-sage font-medium">Все изменения сохранены в локальном автономном хранилище.</p>
        )}

        <div className="mt-3 flex gap-2">
          <Btn
            onClick={() => {
              const res = flushOutbox();
              if (res.status === "up_to_date") {
                setMessage("Журнал чист: все изменения сохранены на устройстве.");
              } else {
                setMessage(`Сохранено на устройстве: ${res.count} операций. Серверная синхронизация пока недоступна.`);
              }
            }}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Сохранить на устройстве</span>
          </Btn>
          {outboxItems.length > 0 ? (
            <Btn variant="ghost" onClick={clearOutbox} className="text-xs">
              Очистить журнал
            </Btn>
          ) : null}
        </div>
      </Card>

      {/* MetaDesign 2.0 Studio Card */}
      <Card className="border-copper/30">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-fg">
              <Palette className="h-5 w-5 text-copper" />
              <span>Студия персонализации MetaDesign Studio</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              Настройте оформление, типографику, кнопки, навигацию и профили с интерактивным предпросмотром. Изменения применяются мгновенно.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpen ? (
              <Btn onClick={() => onOpen("design")} className="text-xs">
                <Sliders className="h-3.5 w-3.5" />
                <span>Открыть студию (14 разделов)</span>
              </Btn>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setDesignConfig(DEFAULT_DESIGN);
                setTheme("system");
              }}
              title="Сбросить оформление"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-xs font-medium text-muted hover:text-fg hover:bg-surface-2 transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Сброс</span>
            </button>
          </div>
        </div>

        {/* 1. Theme Mode */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Режим темы
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {([
              ["light", "themeLight", Sun],
              ["dark", "themeDark", Moon],
              ["system", "themeSystem", Sparkles],
            ] as const).map(([value, key, Icon]) => (
              <Btn
                key={value}
                variant={data.theme === value ? "primary" : "ghost"}
                onClick={() => {
                  setTheme(value as Theme);
                  setDesignConfig({ theme: value as Theme });
                }}
                className="flex items-center justify-center gap-1.5 text-xs py-2"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(lang, key)}</span>
              </Btn>
            ))}
          </div>

          <label className="mt-2.5 flex items-center gap-2.5 text-xs text-muted cursor-pointer hover:text-fg">
            <input
              type="checkbox"
              checked={Boolean(design.autoThemeByTime)}
              onChange={(e) => setDesignConfig({ autoThemeByTime: e.target.checked })}
              className="rounded border-line text-copper focus:ring-copper"
            />
            <span>Автоматически: тёмная тема ночью (20:00 – 07:00), светлая днём</span>
          </label>
        </div>

        {/* 2. Color Palettes */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Фирменная палитра экосистемы (6 вариантов)
          </label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(PALETTES) as ColorPalette[]).map((palKey) => {
              const pal = PALETTES[palKey];
              const isSelected = design.palette === palKey && !design.primaryColor;
              return (
                <button
                  key={palKey}
                  type="button"
                  onClick={() =>
                    setDesignConfig({
                      palette: palKey,
                      primaryColor: undefined,
                      accentColor: undefined,
                    })
                  }
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-copper bg-copper/10 font-semibold shadow-xs"
                      : "border-line bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="flex -space-x-1 items-center">
                    <span
                      className="inline-block h-5 w-5 rounded-full border border-surface shadow-xs"
                      style={{ backgroundColor: pal.previewColor }}
                    />
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-surface shadow-xs"
                      style={{ backgroundColor: pal.accentColor }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate text-fg font-medium">{pal.nameRu}</p>
                  </div>
                  {isSelected ? <Check className="h-3.5 w-3.5 text-copper shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Custom Color Pickers */}
        <div className="mt-4 rounded-xl border border-line bg-surface-2/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg">Пользовательские акценты (Hex)</span>
            {(design.primaryColor || design.accentColor) && (
              <button
                type="button"
                onClick={() => setDesignConfig({ primaryColor: undefined, accentColor: undefined })}
                className="text-[11px] text-copper hover:underline"
              >
                Вернуть цвета палитры
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted block">Основной цвет (Primary)</label>
                {design.primaryColor && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                    style={{
                      backgroundColor: design.primaryColor,
                      color: getContrastColor(design.primaryColor),
                    }}
                  >
                    WCAG: Текст
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.primaryColor || PALETTES[design.palette]?.previewColor || "#ff8c00"}
                  onChange={(e) => setDesignConfig({ primaryColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={design.primaryColor || ""}
                  placeholder={PALETTES[design.palette]?.previewColor || "#ff8c00"}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val || /^#[0-9a-fA-F]{3,8}$/.test(val)) {
                      setDesignConfig({ primaryColor: val || undefined });
                    }
                  }}
                  className="h-8 w-full rounded-lg border border-line bg-surface px-2 font-mono text-xs text-fg uppercase"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted block">Вторичный цвет (Accent)</label>
                {design.accentColor && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold"
                    style={{
                      backgroundColor: design.accentColor,
                      color: getContrastColor(design.accentColor),
                    }}
                  >
                    WCAG: Текст
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.accentColor || PALETTES[design.palette]?.accentColor || "#1976d2"}
                  onChange={(e) => setDesignConfig({ accentColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={design.accentColor || ""}
                  placeholder={PALETTES[design.palette]?.accentColor || "#1976d2"}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val || /^#[0-9a-fA-F]{3,8}$/.test(val)) {
                      setDesignConfig({ accentColor: val || undefined });
                    }
                  }}
                  className="h-8 w-full rounded-lg border border-line bg-surface px-2 font-mono text-xs text-fg uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. UI Density & Card Radius */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Плотность интерфейса
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {([
                ["compact", "Компактная"],
                ["normal", "Обычная"],
                ["spacious", "Просторная"],
              ] as const).map(([val, label]) => (
                <Btn
                  key={val}
                  variant={design.density === val ? "primary" : "ghost"}
                  onClick={() => setDesignConfig({ density: val as UiDensity })}
                  className="text-xs py-1.5 px-2"
                >
                  {label}
                </Btn>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Скругление карточек
            </label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {([
                ["sm", "4px"],
                ["md", "8px"],
                ["lg", "12px"],
                ["full", "20px"],
              ] as const).map(([val, label]) => (
                <Btn
                  key={val}
                  variant={design.radius === val ? "primary" : "ghost"}
                  onClick={() => setDesignConfig({ radius: val as CardRadius })}
                  className="text-xs py-1.5 px-2"
                >
                  {label}
                </Btn>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Font Scale & Accessibility */}
        <div className="mt-4 pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
              Размер текста
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ["sm", "14px"],
                ["md", "16px"],
                ["lg", "18px"],
              ] as const).map(([sz, lbl]) => (
                <Btn
                  key={sz}
                  variant={design.fontSize === sz ? "primary" : "ghost"}
                  onClick={() => setDesignConfig({ fontSize: sz as "sm" | "md" | "lg" })}
                  className="text-xs py-1.5 px-2"
                >
                  {lbl}
                </Btn>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
              Комфорт глаз и батарея
            </label>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer hover:text-fg">
              <input
                type="checkbox"
                checked={Boolean(design.reducedMotion)}
                onChange={(e) => setDesignConfig({ reducedMotion: e.target.checked })}
                className="rounded border-line text-copper focus:ring-copper"
              />
              <span>Уменьшить анимации (Reduced Motion)</span>
            </label>
          </div>
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-fg">
              <Download className="h-5 w-5 text-copper" />
              <span>Мобильное приложение Android (APK v{CURRENT_VERSION})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              Нативное приложение MetaШкола для Android 5.0+ (OPPO A74 / Android 13 и совместимые) с центром обновлений MetaUpdate.
            </p>
          </div>
          <span className="text-xs font-semibold text-copper shrink-0">
            v{CURRENT_VERSION} (Сборка {CURRENT_VERSION_CODE})
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {onOpen ? (
            <Btn onClick={() => onOpen("updates")} className="text-xs">
              <RefreshCw className="h-4 w-4" />
              <span>Открыть MetaUpdate Center</span>
            </Btn>
          ) : null}

          <a
            href={`https://github.com/Andarer/MetaShkola/releases/download/v${CURRENT_VERSION}-debug/MetaSchool-debug.apk`}
            target="_blank"
            rel="noopener noreferrer"
            download={`MetaSchool-v${CURRENT_VERSION}-debug.apk`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-copper px-5 text-sm font-bold text-copper-fg shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Скачать MetaSchool-v{CURRENT_VERSION}-debug.apk (27 МБ)</span>
          </a>

          <a
            href="https://github.com/Andarer/MetaShkola/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-xs font-semibold text-fg border border-line hover:bg-surface-2 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-copper" />
            <span>GitHub Releases (Релизы проекта)</span>
          </a>

          <a
            href="https://github.com/Andarer/MetaShkola/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-xs font-medium text-muted border border-line hover:bg-surface-2 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>GitHub Actions CI/CD</span>
          </a>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs text-muted space-y-1.5">
          <p className="font-semibold text-fg">Инструкция по установке / обновлению на Android (OPPO / Xiaomi / Samsung):</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Откройте <strong>MetaUpdate Center</strong> или нажмите «Скачать MetaSchool-v{CURRENT_VERSION}-debug.apk».</li>
            <li>Разрешите установку из доверенного источника (Chrome / MetaШкола) в настройках Android.</li>
            <li>Application ID <code className="font-mono text-fg bg-surface-2 px-1 py-0.5 rounded">org.metaschool.app</code> сохраняется во всех каналах; при переходе между Debug и Release требуется переустановка с предварительным резервным копированием.</li>
          </ol>
          <p className="pt-1 text-[11px] text-muted">
            Контрольная сумма SHA-256 (Debug): <code className="font-mono text-fg bg-surface-2 px-1 py-0.5 rounded">11febcc48842737f17757536f0b0ba64b19877ee4b9b8255987e373d79794db8</code>
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
          <p><strong className="text-fg">Версия:</strong> {CURRENT_VERSION} (Сборка {CURRENT_VERSION_CODE}, Релиз ноябрь 2026)</p>
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
