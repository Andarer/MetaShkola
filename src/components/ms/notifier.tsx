import { useEffect } from "react";
import { watchGroups } from "@/lib/ms/agenda";
import { t } from "@/lib/ms/i18n";
import { canSeeEvent, canSeeTask } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { dayPhase, minutesNow, resolveDay, toISODate } from "@/lib/ms/time";
import { subjectOf } from "@/components/ms/ui";

function playBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 school chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.2 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.2);
      osc.stop(ctx.currentTime + idx * 0.2 + 0.6);
    });
  } catch {
    // Audio context may be restricted without user interaction
  }
}

export function Notifier() {
  const pushInbox = useMs((s) => s.pushInbox);
  const inboxLength = useMs((s) => s.data.inbox.length);

  useEffect(() => {
    const tick = () => {
      const data = useMs.getState().data;
      const profile = data.profiles.find((item) => item.id === data.activeProfileId);
      if (!profile) return;
      const now = new Date();
      const dateISO = toISODate(now);
      const nowMin = minutesNow(now);
      const prefs = data.notif;
      const lang = data.lang;

      for (const group of watchGroups(data, profile)) {
        const space = data.spaces.find((item) => item.id === group.spaceId);
        if (!space) continue;
        const rows = resolveDay(space.bell, data.lessons, data.exceptions, dateISO, now.getDay() === 0 ? 7 : now.getDay(), {
          classId: group.teacherId ? undefined : group.classId,
          ownerProfileId: group.ownerProfileId,
          teacherId: group.teacherId,
        });
        const phase = dayPhase(rows, nowMin);
        for (const row of rows) {
          if (row.cancelled) continue;
          const subject = subjectOf(data, row.subjectId)?.name ?? "";
          const until = row.startMin - nowMin;
          if (prefs.remind15 && until <= 15 && until > 5) {
            pushInbox(t(lang, "n_remind15"), `${subject} · ${group.label}`, `${dateISO}|15|${group.id}|${row.lesson.index}`);
          }
          if (prefs.remind5 && until <= 5 && until > 0) {
            pushInbox(t(lang, "n_remind5"), `${subject} · ${group.label}`, `${dateISO}|5|${group.id}|${row.lesson.index}`);
          }
        }
        if (phase.kind === "lesson" && prefs.lessonStart && nowMin - phase.current.startMin <= 1) {
          const subject = subjectOf(data, phase.current.subjectId)?.name ?? "";
          pushInbox(t(lang, "n_lessonStart"), subject, `${dateISO}|start|${group.id}|${phase.current.lesson.index}`);
          playBellChime();
          if (prefs.breakEnd) {
            pushInbox(t(lang, "n_breakEnd"), subject, `${dateISO}|breakend|${group.id}|${phase.current.lesson.index}`);
          }
        }
        if ((phase.kind === "break" || phase.kind === "after") && phase.prev && prefs.lessonEnd) {
          const left = nowMin - phase.prev.endMin;
          if (left >= 0 && left <= 1) {
            const subject = subjectOf(data, phase.prev.subjectId)?.name ?? "";
            pushInbox(t(lang, "n_lessonEnd"), subject, `${dateISO}|end|${group.id}|${phase.prev.lesson.index}`);
            playBellChime();
            if (prefs.breakStart && phase.kind === "break") {
              pushInbox(t(lang, "n_breakStart"), subject, `${dateISO}|break|${group.id}|${phase.prev.lesson.index}`);
            }
          }
        }
        // Sync live schedule data to Android Widget & Native Bridge
        try {
          const native = (window as unknown as {
            MetaSchoolNative?: {
              syncScheduleData?: (current: string, next: string, bell: string, badge: string) => void;
              scheduleBellAlarm?: (millis: number, title: string, msg: string) => void;
            };
          }).MetaSchoolNative;

          if (native && typeof native.syncScheduleData === "function") {
            let currentLabel = "Уроки завершены";
            let nextLabel = "Заданий на сегодня нет";
            let badgeText = "MetaШкола 2.0";

            const nextLessonRow = rows.find((r) => !r.cancelled && r.startMin > nowMin);

            if (phase.kind === "lesson") {
              const sub = subjectOf(data, phase.current.subjectId)?.name ?? "Урок";
              const rem = phase.current.endMin - nowMin;
              currentLabel = `Идет урок: ${sub}`;
              nextLabel = nextLessonRow ? `След: ${subjectOf(data, nextLessonRow.subjectId)?.name ?? "Урок"}` : "Последний урок";
              badgeText = `Каб. ${phase.current.lesson.room || "—"} · Звонок через ${rem} мин`;
            } else if (phase.kind === "break") {
              const target = phase.next ?? nextLessonRow;
              const rem = target ? target.startMin - nowMin : 5;
              currentLabel = `Перемена (до звонка ${rem} мин)`;
              nextLabel = target ? `След: ${subjectOf(data, target.subjectId)?.name ?? "Урок"}` : "Конец дня";
              badgeText = target ? `Каб. ${target.lesson.room || "—"}` : "MetaШкола";
            } else if (phase.kind === "before") {
              const rem = phase.next.startMin - nowMin;
              currentLabel = `До начала уроков: ${rem} мин`;
              nextLabel = `1 урок: ${subjectOf(data, phase.next.subjectId)?.name ?? "Урок"}`;
              badgeText = `Начало в 08:00`;
            }

            native.syncScheduleData(currentLabel, nextLabel, `Звонки активны`, badgeText);
          }
        } catch {
          /* ignore bridge errors */
        }
      }

      if (prefs.tasks) {
        for (const task of data.tasks) {
          if (!canSeeTask(data, profile, task)) continue;
          if (task.due !== dateISO || task.status === "checked") continue;
          pushInbox(t(lang, "n_tasks"), task.title, `${dateISO}|task|${task.id}`);
        }
      }
      if (prefs.personal) {
        for (const event of data.events) {
          if (!canSeeEvent(data, profile, event)) continue;
          if (event.date !== dateISO) continue;
          if (event.kind !== "personal" && event.kind !== "meeting") continue;
          pushInbox(t(lang, "n_personal"), event.title, `${dateISO}|ev|${event.id}`);
        }
      }
    };

    tick();
    const timer = window.setInterval(tick, 20000);
    return () => window.clearInterval(timer);
  }, [pushInbox]);

  useEffect(() => {
    const inbox = useMs.getState().data.inbox;
    const unread = inbox.find((item) => !item.read);
    if (!unread) return;
    const key = `shown:${unread.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    // Android native bridge call
    const native = (window as unknown as { MetaSchoolNative?: { showNotification: (t: string, m: string, c?: string) => void; playVibrate: (ms: number) => void } }).MetaSchoolNative;
    if (native && typeof native.showNotification === "function") {
      try {
        native.showNotification(unread.title, unread.body, "bells");
        native.playVibrate(250);
        return;
      } catch {
        /* fallback to browser notification */
      }
    }

    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification(unread.title, { body: unread.body });
    } catch {
      /* ignore */
    }
  }, [inboxLength]);

  // Auto-sync outbox when device reconnects to internet
  useEffect(() => {
    const handleOnline = () => {
      const res = useMs.getState().flushOutbox();
      if (res && res.count > 0) {
        useMs.getState().pushInbox("Синхронизация", `Синхронизировано ${res.count} изменений после восстановления связи`, `sync-online-${Date.now()}`);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}
