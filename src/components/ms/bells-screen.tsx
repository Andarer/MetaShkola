import { useEffect, useState } from "react";
import { watchGroups } from "@/lib/ms/agenda";
import { tf, t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";
import { dayPhase, formatCountdown, formatHHMM, isoWeekday, minutesNow, resolveDay, toISODate } from "@/lib/ms/time";
import { Card, controlClass, Field, subjectOf, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";

export function BellsScreen() {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const groups = watchGroups(data, profile);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const space = data.spaces.find((item) => item.id === group?.spaceId);
  if (!group || !space) return <p className="text-sm text-muted">{t(lang, "noLessons")}</p>;
  const date = toISODate(now);
  const rows = resolveDay(space.bell, data.lessons, data.exceptions, date, isoWeekday(now), {
    classId: group.teacherId ? undefined : group.classId,
    ownerProfileId: group.ownerProfileId,
    teacherId: group.teacherId,
  });
  const phase = dayPhase(rows, minutesNow(now));
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  let headline = t(lang, "phaseEmpty");
  let sub = "";
  if (phase.kind === "before") {
    headline = t(lang, "phaseBefore");
    sub = tf(lang, "bellIn", { t: formatCountdown(phase.mins) });
  } else if (phase.kind === "lesson") {
    headline = t(lang, "phaseLesson");
    sub = tf(lang, "untilEnd", { t: formatCountdown(phase.mins) });
  } else if (phase.kind === "break") {
    headline = t(lang, "phaseBreak");
    sub = tf(lang, "bellIn", { t: formatCountdown(phase.mins) });
  } else if (phase.kind === "after") {
    headline = t(lang, "phaseAfter");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "bells")}</h1>
      <Field label={t(lang, "myWatch")}>
        <select className={controlClass} value={group.id} onChange={(event) => setGroupId(event.target.value)}>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </Field>
      <Card>
        <p className="font-display text-4xl tabular-nums">{clock}</p>
        <p className="mt-2 text-lg font-semibold">{headline}</p>
        {sub ? <p className="text-copper">{sub}</p> : null}
      </Card>
      {rows.map((row) => {
        const subject = subjectOf(data, row.subjectId);
        const current = phase.kind === "lesson" && phase.current.lesson.id === row.lesson.id;
        return (
          <div key={row.lesson.id} className={cn("rounded-2xl border border-line bg-surface p-4 border-l-4", toneBorder(subject?.tone), row.cancelled && "opacity-50", current && "ring-2 ring-copper")}>
            <p className="text-sm tabular-nums text-muted">{formatHHMM(row.startMin)}–{formatHHMM(row.endMin)}</p>
            <p className="font-semibold">{subject?.name}</p>
            <p className="text-sm text-muted">{row.cancelled ? t(lang, "cancelled") : row.room}</p>
          </div>
        );
      })}
    </div>
  );
}
