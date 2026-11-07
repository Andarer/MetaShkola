import { useState, useEffect } from "react";
import { useMs } from "@/lib/ms/store";
import { Card, Btn, downloadText } from "@/components/ms/ui";
import {
  Code,
  Smartphone,
  Cpu,
  Database,
  Shield,
  Layers,
  FileText,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { CURRENT_VERSION, CURRENT_VERSION_CODE } from "@/lib/ms/version";

export function DeveloperScreen() {
  const { data } = useMs();
  const [copied, setCopied] = useState(false);
  const [swStatus, setSwStatus] = useState<string>("Проверка...");
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    // Check Service Worker registration state
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          if (reg.active) {
            setSwStatus(`Активен (Scope: ${reg.scope})`);
          } else if (reg.installing) {
            setSwStatus("Установка...");
          } else if (reg.waiting) {
            setSwStatus("Ожидает активации");
          }
        } else {
          setSwStatus("Не зарегистрирован в текущем контексте");
        }
      }).catch(() => {
        setSwStatus("Ошибка опроса Service Worker");
      });
    } else {
      setSwStatus("Не поддерживается браузером/средой");
    }

    // Check Storage Estimate
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        setStorageEstimate({
          usage: est.usage || 0,
          quota: est.quota || 0,
        });
      }).catch(() => {
        // Storage estimate restricted
      });
    }
  }, []);

  const totalLessons = data.lessons?.length || 0;
  const totalTasks = (data.tasks?.length || 0) + (data.personalTasks?.length || 0);
  const totalNotes = data.personalNotes?.length || 0;
  const totalHabits = data.habits?.length || 0;
  const totalAlarms = data.alarms?.length || 0;
  const totalPosts = data.communityPosts?.length || 0;
  const totalAudit = data.audit?.length || 0;
  const outboxCount = data.outbox?.length || 0;
  const pendingOutbox = (data.outbox || []).filter((o) => o.state === "pending").length;

  const appBuildReport = {
    generatedAt: new Date().toISOString(),
    applicationId: "org.metaschool.app",
    version: CURRENT_VERSION,
    versionCode: CURRENT_VERSION_CODE,
    channel: data.updateChannel,
    architecture: "100% Offline-First / Universal Web & Native Android",
    conceptAuthor: "Andárer",
    runtime: {
      isAndroidNative: typeof window !== "undefined" && Boolean((window as unknown as { MetaSchoolNative?: unknown }).MetaSchoolNative),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Headless/Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "ru-RU",
      onlineStatus: typeof navigator !== "undefined" ? (navigator.onLine ? "Online" : "Offline") : "Unknown",
      serviceWorker: swStatus,
      storageEstimate: storageEstimate
        ? `${(storageEstimate.usage / (1024 * 1024)).toFixed(2)} MB / ${(storageEstimate.quota / (1024 * 1024)).toFixed(0)} MB`
        : "Local Storage (~5-10MB quota)",
    },
    databaseMetrics: {
      profilesCount: data.profiles?.length || 0,
      spacesCount: data.spaces?.length || 0,
      subjectsCount: data.subjects?.length || 0,
      classesCount: data.classes?.length || 0,
      lessonsCount: totalLessons,
      homeworkTasksCount: data.tasks?.length || 0,
      personalTasksCount: data.personalTasks?.length || 0,
      personalNotesCount: totalNotes,
      habitsCount: totalHabits,
      alarmsCount: totalAlarms,
      communityPostsCount: totalPosts,
      auditLogCount: totalAudit,
      outboxTotal: outboxCount,
      outboxPending: pendingOutbox,
    },
    modulesState: {
      metaEducation: "Active / Stable",
      metaPersonal: "Active (Notes, Tasks, Habits)",
      metaTools: "Active (Alarms, Timers, Stopwatch)",
      metaCommunity: "Active (Posts, Moderation, RBAC)",
      metaShare: "Active (Format: mspack, Checksum: SHA-256)",
      metaAI: "Active (Built-in + Local Providers)",
      metaDeveloper: "Active (Self-Diagnostics)",
    },
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(JSON.stringify(appBuildReport, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadReport = () => {
    const jsonStr = JSON.stringify(appBuildReport, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadText(`metashkola-diagnostic-report-${dateStr}.json`, jsonStr, "application/json");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-copper" />
            <h1 className="text-xl font-bold tracking-tight text-fg">MetaDeveloper</h1>
          </div>
          <p className="text-xs text-muted">
            Инженерная диагностика платформы · Сборка {CURRENT_VERSION} ({CURRENT_VERSION_CODE})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="ghost"
            className="h-9 px-2.5 text-xs gap-1.5"
            onClick={handleCopyReport}
            data-testid="copy-diagnostic-btn"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Скопировано" : "Копировать"}</span>
          </Btn>
          <Btn
            className="h-9 px-3 text-xs gap-1.5"
            onClick={handleDownloadReport}
            data-testid="download-diagnostic-btn"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Экспорт отчёта</span>
          </Btn>
        </div>
      </div>

      {/* Grid: App & Build Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-copper font-semibold text-sm">
            <Cpu className="h-4 w-4" />
            <span>Спецификация сборки</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Application ID:</span>
              <span className="font-mono font-medium text-fg">org.metaschool.app</span>
            </div>
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">SemVer Version:</span>
              <span className="font-mono font-bold text-copper">{CURRENT_VERSION}</span>
            </div>
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Version Code:</span>
              <span className="font-mono font-semibold text-fg">{CURRENT_VERSION_CODE}</span>
            </div>
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Канал обновления:</span>
              <span className="capitalize font-medium text-fg">{data.updateChannel}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Концепция:</span>
              <span className="font-medium text-fg">Andárer</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-copper font-semibold text-sm">
            <Smartphone className="h-4 w-4" />
            <span>Среда выполнения и платформа</span>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Режим клиента:</span>
              <span className="font-medium text-fg">
                {typeof window !== "undefined" && (window as unknown as { MetaSchoolNative?: unknown }).MetaSchoolNative
                  ? "Android Native (WebView Container)"
                  : "Web PWA (Standalone/Browser)"}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Service Worker:</span>
              <span className="font-mono text-[11px] text-fg truncate max-w-[200px]" title={swStatus}>
                {swStatus}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/40 py-1">
              <span className="text-muted">Сетевой статус:</span>
              <span className="flex items-center gap-1 font-semibold text-sage">
                <CheckCircle2 className="h-3 w-3" />
                {typeof navigator !== "undefined" && navigator.onLine ? "Доступен" : "Оффлайн"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Оценка хранилища:</span>
              <span className="font-mono text-fg text-[11px]">
                {storageEstimate
                  ? `${(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB`
                  : "LocalStorage (Active)"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Database & Entities Metrics */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-copper font-semibold text-sm">
            <Database className="h-4 w-4" />
            <span>Метрики локальной базы данных (metashkola-db-v1)</span>
          </div>
          <span className="text-xs text-muted font-mono">100% Offline-authoritative</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{data.profiles?.length || 0}</span>
            <p className="text-[11px] text-muted mt-0.5">Профилей</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalLessons}</span>
            <p className="text-[11px] text-muted mt-0.5">Уроков в расписании</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalTasks}</span>
            <p className="text-[11px] text-muted mt-0.5">Заданий и дел</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalNotes}</span>
            <p className="text-[11px] text-muted mt-0.5">Личных заметок</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalHabits}</span>
            <p className="text-[11px] text-muted mt-0.5">Привычек</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalAlarms}</span>
            <p className="text-[11px] text-muted mt-0.5">Будильников</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-fg">{totalPosts}</span>
            <p className="text-[11px] text-muted mt-0.5">Постов сообщества</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/40 p-2.5">
            <span className="text-xl font-bold text-copper">{totalAudit}</span>
            <p className="text-[11px] text-muted mt-0.5">Записей аудита</p>
          </div>
        </div>
      </Card>

      {/* Module Architecture Status Matrix */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-copper font-semibold text-sm">
          <Layers className="h-4 w-4" />
          <span>Матрица состояния модулей экосистемы 3.0</span>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaEducation</p>
              <p className="text-muted text-[11px]">Школьное расписание, звонки, домашние задания, оценки, кабинеты</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaPersonal</p>
              <p className="text-muted text-[11px]">Личные заметки, изолированные списки задач, трекер привычек</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaTools</p>
              <p className="text-muted text-[11px]">Будильники, пресетные таймеры (Помодоро/Урок), секундомер с кругами</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaCommunity</p>
              <p className="text-muted text-[11px]">Группы, публикации, фильтры видимости (RBAC), реакции и модерация</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaShare (.mspack)</p>
              <p className="text-muted text-[11px]">Криптографическая верификация SHA-256, проверка связности без перезаписи</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line p-2.5">
            <div>
              <p className="font-semibold text-fg">MetaDeveloper & Diagnostics</p>
              <p className="text-muted text-[11px]">Инженерные отчёты без утечки секретов, диагностика Service Worker и хранилища</p>
            </div>
            <span className="rounded-md bg-sage/15 px-2 py-0.5 font-semibold text-sage">Готов</span>
          </div>
        </div>
      </Card>

      {/* Safety Notice */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-copper/30 bg-copper/5 p-3.5 text-xs text-muted">
        <Shield className="h-5 w-5 text-copper shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-fg">Политика безопасности диагностических отчётов</p>
          <p className="mt-0.5">
            В соответствии с регламентом архитектуры MetaШкола, экспортируемый отчёт содержит только технические идентификаторы, статистические метрики и характеристики окружения. Пользовательские PIN-коды, приватные ключи и токены исключены на уровне схемы отчёта.
          </p>
        </div>
      </div>
    </div>
  );
}
