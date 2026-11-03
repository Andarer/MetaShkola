import { watchGroups } from "@/lib/ms/agenda";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeGrade, canSeeTask } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { addDays, formatHHMM, isoWeekday, resolveDay, toISODate } from "@/lib/ms/time";
import type { Screen } from "@/lib/ms/types";
import { Card, personName, subjectOf, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";

const WEEK: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function dayLabel(lang: Parameters<typeof t>[0], offsetLabel: "today" | "tomorrow" | "nextStudy", date: Date): string {
  return `${t(lang, offsetLabel)} · ${t(lang, WEEK[isoWeekday(date) - 1] ?? "mon")}`;
}

export function HomeScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const groups = watchGroups(data, profile).slice(0, 3);
  const today = new Date();
  const visibleTasks = data.tasks.filter((task) => canSeeTask(data, profile, task) && task.status !== "checked");
  const visibleGrades = data.grades.filter((grade) => canSeeGrade(data, profile, grade));
  const canReports = Boolean(profile && canInSpace(profile, data.activeSpaceId, "reports", data.customRoles));
  const subjectRows = Object.values(
    visibleGrades.reduce<Record<string, { id: string; label: string; sum: number; count: number }>>((acc, grade) => {
      const key = `${grade.studentId}:${grade.subjectId}`;
      const subject = subjectOf(data, grade.subjectId)?.name ?? t(lang, "subject");
      const who = personName(data, grade.studentId);
      const row = acc[key] ?? { id: key, label: `${who} · ${subject}`, sum: 0, count: 0 };
      row.sum += grade.score;
      row.count += 1;
      acc[key] = row;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-3xl">{profile?.name}</h1>
        <p className="text-sm text-muted">{data.spaces.find((space) => space.id === data.activeSpaceId)?.name}</p>
      </header>
      {groups.map((group) => {
        let when = today;
        let rows: ReturnType<typeof resolveDay> = [];
        for (let offset = 0; offset < 7; offset += 1) {
          const date = addDays(today, offset);
          const space = data.spaces.find((item) => item.id === group.spaceId);
          if (!space) break;
          const resolved = resolveDay(space.bell, data.lessons, data.exceptions, toISODate(date), isoWeekday(date), {
            classId: group.teacherId ? undefined : group.classId,
            ownerProfileId: group.ownerProfileId,
            teacherId: group.teacherId,
          }).filter((row) => !row.cancelled);
          if (resolved.length > 0) {
            when = date;
            rows = resolved;
            break;
          }
        }
        const label =
          toISODate(when) === toISODate(today)
            ? "today"
            : toISODate(when) === toISODate(addDays(today, 1))
              ? "tomorrow"
              : "nextStudy";
        return (
          <Card key={group.id}>
            <button type="button" className="flex w-full flex-col gap-3 text-left" onClick={() => onOpen("schedule")}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl">{group.label}</h2>
                <span className="text-sm text-muted">{dayLabel(lang, label, when)}</span>
              </div>
              {rows.length === 0 ? <p className="text-sm text-muted">{t(lang, "noLessons")}</p> : null}
              {rows.slice(0, 4).map((row) => {
                const subject = subjectOf(data, row.subjectId);
                return (
                  <div key={row.lesson.id} className={cn("border-l-4 pl-3", toneBorder(subject?.tone))}>
                    <p className="text-sm tabular-nums text-muted">
                      {formatHHMM(row.startMin)}–{formatHHMM(row.endMin)}
                    </p>
                    <p className="font-semibold">{subject?.name ?? t(lang, "subject")}</p>
                    <p className="text-sm text-muted">
                      {row.room} · {personName(data, row.teacherId)}
                    </p>
                  </div>
                );
              })}
            </button>
          </Card>
        );
      })}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl">{t(lang, "tasks")}</h2>
          <button type="button" className="text-sm font-semibold text-copper" onClick={() => onOpen("tasks")}>
            {t(lang, "allTasks")}
          </button>
        </div>
        {visibleTasks.length === 0 ? <p className="text-sm text-muted">{t(lang, "noTasks")}</p> : null}
        <ul className="flex flex-col gap-3">
          {visibleTasks
            .slice()
            .sort((a, b) => a.due.localeCompare(b.due))
            .slice(0, 3)
            .map((task) => (
              <li key={task.id}>
                <p className="font-semibold">{task.title}</p>
                <p className="text-sm text-muted">
                  {personName(data, task.assigneeId)} · {task.due} · {t(lang, `pr_${task.priority}` as CopyKey)}
                </p>
              </li>
            ))}
        </ul>
      </Card>
      {canReports ? (
        <Card>
          <h2 className="text-xl">{t(lang, "reports")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t(lang, "openTasks")}: {visibleTasks.length}
          </p>
          <h3 className="mt-3 text-lg">{t(lang, "bySubject")}</h3>
          {subjectRows.length === 0 ? <p className="mt-2 text-sm text-muted">{t(lang, "none")}</p> : null}
          <ul className="mt-2 flex flex-col gap-2">
            {subjectRows.slice(0, 8).map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="font-display text-xl tabular-nums">{Math.round((row.sum / row.count) * 10) / 10}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
