import { useState } from "react";
import { Calendar, Download, Send, RefreshCw, Check, AlertCircle } from "lucide-react";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeEvent } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import type { IntegrationService, SyncData, SyncDirection } from "@/lib/ms/types";
import { Btn, Card, controlClass, downloadText, Field, subjectOf } from "@/components/ms/ui";
import { formatHHMM } from "@/lib/ms/time";

const SERVICES: { id: IntegrationService; key: CopyKey }[] = [
  { id: "google-calendar", key: "svc_google_calendar" },
  { id: "google-drive", key: "svc_google_drive" },
  { id: "gmail", key: "svc_gmail" },
  { id: "classroom", key: "svc_classroom" },
  { id: "outlook", key: "svc_outlook" },
  { id: "onedrive", key: "svc_onedrive" },
  { id: "ms-calendar", key: "svc_ms_calendar" },
  { id: "telegram", key: "svc_telegram" },
  { id: "caldav", key: "svc_caldav" },
  { id: "webdav", key: "svc_webdav" },
  { id: "rest", key: "svc_rest" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function IntegrationsScreen() {
  const data = useMs((s) => s.data);
  const saveIntegration = useMs((s) => s.saveIntegration);
  const removeIntegration = useMs((s) => s.removeIntegration);
  const saveRule = useMs((s) => s.saveRule);
  const removeRule = useMs((s) => s.removeRule);
  const logSync = useMs((s) => s.logSync);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const space = data.spaces.find((item) => item.id === data.activeSpaceId);
  const allowed = Boolean(profile && canInSpace(profile, data.activeSpaceId, "integrations", data.customRoles));

  const [service, setService] = useState<IntegrationService>("google-calendar");
  const [account, setAccount] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [direction, setDirection] = useState<SyncDirection>("export");
  const [dataKind, setDataKind] = useState<SyncData>("calendar");

  // Telegram test state
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgStatus, setTgStatus] = useState<string | null>(null);
  const [tgSending, setTgSending] = useState(false);

  // Full iCalendar RFC 5545 exporter with lessons and events
  const exportFullIcs = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MetaShkola 2.0//RU",
      `X-WR-CALNAME:MetaШкола - ${space?.name || "Расписание"}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    // 1. Export Calendar Events
    const events = data.events.filter((event) => canSeeEvent(data, profile, event));
    for (const event of events) {
      const cleanDate = event.date.replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:ev-${event.id}@metashkola`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:${event.title.replace(/[\n,;]/g, " ")}`,
        `DESCRIPTION:Событие MetaШкола (${event.kind})`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      );
    }

    // 2. Export Weekly Lessons according to Bell Schedule
    if (space) {
      const bell = space.bell;
      const [startH, startM] = bell.firstStart.split(":").map(Number);
      const dayCodes = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];

      // Find date of current week's Monday
      const monday = new Date();
      const currentDay = monday.getDay() === 0 ? 7 : monday.getDay();
      monday.setDate(monday.getDate() - currentDay + 1);

      for (const lesson of data.lessons) {
        if (lesson.spaceId !== space.id) continue;
        const subject = subjectOf(data, lesson.subjectId);
        const dayCode = dayCodes[lesson.weekday] || "MO";

        // Calculate lesson start and end
        let startMin = startH * 60 + startM;
        for (let i = 1; i < lesson.index; i++) {
          startMin += bell.lessonMinutes;
          const isBig = bell.bigBreakAfter.includes(i);
          startMin += isBig ? bell.bigBreakMinutes : bell.breakMinutes;
        }
        const endMin = startMin + bell.lessonMinutes;

        const lessonStartH = Math.floor(startMin / 60);
        const lessonStartM = startMin % 60;
        const lessonEndH = Math.floor(endMin / 60);
        const lessonEndM = endMin % 60;

        const lessonDate = new Date(monday);
        lessonDate.setDate(monday.getDate() + lesson.weekday - 1);

        const y = lessonDate.getFullYear();
        const m = pad(lessonDate.getMonth() + 1);
        const d = pad(lessonDate.getDate());

        const dtStart = `${y}${m}${d}T${pad(lessonStartH)}${pad(lessonStartM)}00`;
        const dtEnd = `${y}${m}${d}T${pad(lessonEndH)}${pad(lessonEndM)}00`;

        lines.push(
          "BEGIN:VEVENT",
          `UID:lesson-${lesson.id}@metashkola`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`,
          `SUMMARY:${(subject?.name || "Урок").replace(/[\n,;]/g, " ")} (${lesson.index} урок)`,
          `LOCATION:${lesson.room ? `Кабинет ${lesson.room}` : "MetaШкола"}`,
          `DESCRIPTION:Расписание звонков: ${formatHHMM(startMin)}–${formatHHMM(endMin)}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
        );
      }
    }

    lines.push("END:VCALENDAR");
    downloadText("metashkola_schedule.ics", lines.join("\r\n"), "text/calendar");
    logSync(`Полный календарь .ics экспортирован (${data.lessons.length} уроков, ${events.length} событий)`, true);
  };

  // Telegram real notification tester
  const handleTestTelegram = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) {
      setTgStatus("Укажите Bot Token и Chat ID Telegram");
      return;
    }
    setTgSending(true);
    setTgStatus(null);
    try {
      const text = `🔔 <b>MetaШкола 2.0</b>\nУведомление расписания активно.\n\nПространство: <b>${space?.name || "Школа"}</b>\nВремя: ${new Date().toLocaleTimeString()}\nСтатус: синхронизация работает.`;
      const url = `https://api.telegram.org/bot${tgToken.trim()}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId.trim(),
          text,
          parse_mode: "HTML",
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setTgStatus("Сообщение успешно доставлено в Telegram!");
        logSync(`Telegram bot alert sent to chat ${tgChatId.trim()}`, true);
      } else {
        setTgStatus(`Ошибка Telegram: ${json.description || "Запрос отклонен"}`);
        logSync(`Telegram bot error: ${json.description}`, false);
      }
    } catch {
      setTgStatus("Сетевая ошибка при обращении к Telegram API.");
      logSync("Telegram network error", false);
    } finally {
      setTgSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "integrations")}</h1>
      <p className="text-sm text-muted">{t(lang, "integrationsLead")}</p>

      {/* Universal iCalendar Export */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-copper" />
              <span>Календарный шлюз (.ics)</span>
            </h2>
            <p className="mt-1 text-sm text-muted">
              Универсальный экспорт расписания уроков и звонков для Google Календаря, Apple Calendar, Samsung и Outlook.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={exportFullIcs} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Скачать календарь расписания (.ics)</span>
          </Btn>
          <a
            href="https://calendar.google.com/calendar/r/settings/export"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold hover:bg-surface-2 transition-colors"
          >
            Открыть импорт Google Calendar
          </a>
        </div>
      </Card>

      {/* Telegram Notifications */}
      <Card>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Send className="h-5 w-5 text-copper" />
          <span>Telegram-оповещения</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Прямая отправка сигналов звонков, домашних заданий и оценок родителям и ученикам через вашего бота в Telegram.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bot Token (@BotFather)">
            <input
              className={controlClass}
              placeholder="123456789:ABCdefGhI..."
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
            />
          </Field>
          <Field label="Chat ID (@userinfobot или группы)">
            <input
              className={controlClass}
              placeholder="987654321 или -100..."
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={handleTestTelegram} disabled={tgSending} className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>{tgSending ? "Отправка..." : "Отправить тестовое оповещение"}</span>
          </Btn>
          {tgStatus ? (
            <p className={`text-xs font-semibold ${tgStatus.includes("успешно") ? "text-sage" : "text-clay"}`}>
              {tgStatus}
            </p>
          ) : null}
        </div>
      </Card>

      {/* Connected Services */}
      <Card>
        <h2 className="text-xl font-semibold">Подключенные службы</h2>
        {allowed ? (
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveIntegration({
                id: uid(),
                service,
                label: t(lang, SERVICES.find((item) => item.id === service)?.key ?? "svc_rest"),
                accountLabel: account,
                enabled: true,
              });
              setAccount("");
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t(lang, "preset")}>
                <select className={controlClass} value={service} onChange={(event) => setService(event.target.value as IntegrationService)}>
                  {SERVICES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(lang, item.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t(lang, "accountLabel")}>
                <input
                  className={controlClass}
                  placeholder="user@example.com или профиль"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                />
              </Field>
            </div>
            <Btn type="submit">{t(lang, "add")}</Btn>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted">{t(lang, "noAccess")}</p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {data.integrations.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted">{item.accountLabel || "Активен локально"}</p>
              </div>
              {allowed ? (
                <Btn variant="danger" className="text-xs py-1 h-8" onClick={() => removeIntegration(item.id)}>
                  {t(lang, "delete")}
                </Btn>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {/* Rules */}
      {allowed && data.integrations.length > 0 ? (
        <Card>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const id = integrationId || data.integrations[0]?.id;
              if (!id) return;
              saveRule({
                id: uid(),
                integrationId: id,
                direction,
                dataKind,
                frequency: "manual",
                profileId: "all",
                enabled: true,
              });
            }}
          >
            <h2 className="text-xl font-semibold">{t(lang, "enableRule")}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={t(lang, "integrations")}>
                <select className={controlClass} value={integrationId || data.integrations[0]?.id} onChange={(event) => setIntegrationId(event.target.value)}>
                  {data.integrations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t(lang, "direction")}>
                <select className={controlClass} value={direction} onChange={(event) => setDirection(event.target.value as SyncDirection)}>
                  <option value="import">{t(lang, "dir_import")}</option>
                  <option value="export">{t(lang, "dir_export")}</option>
                  <option value="both">{t(lang, "dir_both")}</option>
                </select>
              </Field>
              <Field label={t(lang, "dataKind")}>
                <select className={controlClass} value={dataKind} onChange={(event) => setDataKind(event.target.value as SyncData)}>
                  <option value="calendar">{t(lang, "data_calendar")}</option>
                  <option value="materials">{t(lang, "data_materials")}</option>
                  <option value="notifications">{t(lang, "data_notifications")}</option>
                  <option value="tasks">{t(lang, "data_tasks")}</option>
                </select>
              </Field>
            </div>
            <Btn type="submit">{t(lang, "save")}</Btn>
          </form>
        </Card>
      ) : null}

      {/* Journal */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t(lang, "journal")}</h2>
          <Btn variant="ghost" className="text-xs py-1 h-8 flex items-center gap-1" onClick={() => logSync("Сверка локального журнала синхронизации", true)}>
            <RefreshCw className="h-3 w-3" />
            <span>Сверить</span>
          </Btn>
        </div>
        <div className="mt-3 flex flex-col gap-1 max-h-56 overflow-y-auto">
          {data.syncLog.length === 0 ? <p className="text-sm text-muted">{t(lang, "journalEmpty")}</p> : null}
          {data.syncLog.map((row) => (
            <div key={row.id} className="flex items-center gap-2 border-b border-line/40 py-1.5 text-xs">
              {row.ok ? <Check className="h-3.5 w-3.5 text-sage shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-clay shrink-0" />}
              <span className="tabular-nums text-muted shrink-0">{row.at ? new Date(row.at).toLocaleTimeString() : "—"}</span>
              <span className="truncate">{row.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
