import { Clock, Palette, RefreshCw, Users, Wrench } from "lucide-react";
import { watchGroups } from "@/lib/ms/agenda";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeGrade, canSeeTask } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { addDays, dayPhase, formatHHMM, isoWeekday, resolveDay, toISODate } from "@/lib/ms/time";
import { defaultHomeBlocks, type Screen } from "@/lib/ms/types";
import { Btn, Card, personName, subjectOf, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import { CURRENT_VERSION } from "@/lib/ms/version";

const WEEK: ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function dayLabel(lang: Parameters<typeof t>[0], offsetLabel: "today" | "tomorrow" | "nextStudy", date: Date): string {
  return `${t(lang, offsetLabel)} · ${t(lang, WEEK[isoWeekday(date) - 1] ?? "mon")}`;
}

export function HomeScreen({ onOpen }: { onOpen: (screen: Screen) => void }) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const activeSpace = data.spaces.find((space) => space.id === data.activeSpaceId);
  const groups = watchGroups(data, profile).slice(0, 3);
  const today = new Date();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const homeBlocks =
    data.design?.homeBlocks && data.design.homeBlocks.length > 0
      ? data.design.homeBlocks
      : defaultHomeBlocks();
  const compact = Boolean(data.design?.homeCompact);

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

  const firstGroup = groups[0];
  const todayRows =
    firstGroup && activeSpace
      ? resolveDay(activeSpace.bell, data.lessons, data.exceptions, toISODate(today), isoWeekday(today), {
          classId: firstGroup.teacherId ? undefined : firstGroup.classId,
          ownerProfileId: firstGroup.ownerProfileId,
          teacherId: firstGroup.teacherId,
        }).filter((row) => !row.cancelled)
      : [];
  const currentPhase = dayPhase(todayRows, nowMinutes);

  const myPersonalNotes = (data.personalNotes || []).filter((n) => n.profileId === profile?.id).slice(0, compact ? 2 : 3);
  const myPersonalTasks = (data.personalTasks || []).filter((pt) => pt.profileId === profile?.id && !pt.done).slice(0, 3);
  const recentPosts = (data.communityPosts || []).filter((p) => p.spaceId === data.activeSpaceId).slice(0, compact ? 2 : 3);

  const renderBlock = (blockId: string) => {
    if (blockId === "nowLesson") {
      return (
        <Card key="nowLesson" className="border-copper/30">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-copper" />
              <span>{t(lang, "now")}</span>
            </h2>
            <button type="button" className="text-xs font-semibold text-copper" onClick={() => onOpen("bells")}>
              {t(lang, "bells")}
            </button>
          </div>
          {currentPhase.kind === "empty" ? (
            <p className="mt-2 text-sm text-muted">{t(lang, "phaseEmpty")}</p>
          ) : currentPhase.kind === "before" ? (
            <p className="mt-2 text-sm text-fg">
              {t(lang, "phaseBefore")} · {subjectOf(data, currentPhase.next.subjectId)?.name ?? t(lang, "subject")} ({formatHHMM(currentPhase.next.startMin)}, через {currentPhase.mins} мин)
            </p>
          ) : currentPhase.kind === "lesson" ? (
            <div className="mt-2">
              <p className="font-bold text-fg">
                {subjectOf(data, currentPhase.current.subjectId)?.name ?? t(lang, "subject")} · Каб. {currentPhase.current.room}
              </p>
              <p className="text-xs text-muted">
                {t(lang, "phaseLesson")} · осталось {currentPhase.mins} мин ({formatHHMM(currentPhase.current.startMin)}–{formatHHMM(currentPhase.current.endMin)})
              </p>
            </div>
          ) : currentPhase.kind === "break" ? (
            <p className="mt-2 text-sm text-fg">
              {t(lang, "phaseBreak")} · осталось {currentPhase.mins} мин
              {currentPhase.next ? ` · дальше ${subjectOf(data, currentPhase.next.subjectId)?.name ?? t(lang, "subject")}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">{t(lang, "phaseAfter")}</p>
          )}
        </Card>
      );
    }

    if (blockId === "schedule") {
      return (
        <div key="schedule" className="flex flex-col gap-3">
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
                <button type="button" className="flex w-full flex-col gap-2.5 text-left" onClick={() => onOpen("schedule")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-xl">{group.label}</h2>
                    <span className="text-sm text-muted">{dayLabel(lang, label, when)}</span>
                  </div>
                  {rows.length === 0 ? <p className="text-sm text-muted">{t(lang, "noLessons")}</p> : null}
                  {rows.slice(0, compact ? 2 : 4).map((row) => {
                    const subject = subjectOf(data, row.subjectId);
                    return (
                      <div key={row.lesson.id} className={cn("border-l-4 pl-3", toneBorder(subject?.tone))}>
                        <p className="text-sm tabular-nums text-muted">
                          {formatHHMM(row.startMin)}–{formatHHMM(row.endMin)}
                        </p>
                        <p className="font-semibold">{subject?.name ?? t(lang, "subject")}</p>
                        {!compact ? (
                          <p className="text-sm text-muted">
                            {row.room} · {personName(data, row.teacherId)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </button>
              </Card>
            );
          })}
        </div>
      );
    }

    if (blockId === "tasks") {
      return (
        <div key="tasks" className="flex flex-col gap-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl">{t(lang, "tasks")}</h2>
              <button type="button" className="text-sm font-semibold text-copper" onClick={() => onOpen("tasks")}>
                {t(lang, "allTasks")}
              </button>
            </div>
            {visibleTasks.length === 0 ? <p className="text-sm text-muted">{t(lang, "noTasks")}</p> : null}
            <ul className="flex flex-col gap-2.5">
              {visibleTasks
                .slice()
                .sort((a, b) => a.due.localeCompare(b.due))
                .slice(0, compact ? 2 : 3)
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
          {canReports && !compact ? (
            <Card>
              <h2 className="text-xl">{t(lang, "reports")}</h2>
              <p className="mt-2 text-sm text-muted">
                {t(lang, "openTasks")}: {visibleTasks.length}
              </p>
              <h3 className="mt-3 text-lg">{t(lang, "bySubject")}</h3>
              {subjectRows.length === 0 ? <p className="mt-2 text-sm text-muted">{t(lang, "none")}</p> : null}
              <ul className="mt-2 flex flex-col gap-2">
                {subjectRows.slice(0, 6).map((row) => (
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

    if (blockId === "quickActions") {
      return (
        <Card key="quickActions">
          <h2 className="text-lg font-bold">Быстрые переходы</h2>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Btn variant="ghost" onClick={() => onOpen("tools")} className="justify-start text-xs">
              <Wrench className="h-4 w-4 text-copper" />
              <span>{t(lang, "tools")}</span>
            </Btn>
            <Btn variant="ghost" onClick={() => onOpen("design")} className="justify-start text-xs">
              <Palette className="h-4 w-4 text-copper" />
              <span>MetaDesign Studio</span>
            </Btn>
            <Btn variant="ghost" onClick={() => onOpen("updates")} className="justify-start text-xs">
              <RefreshCw className="h-4 w-4 text-copper" />
              <span>MetaUpdate</span>
            </Btn>
          </div>
        </Card>
      );
    }

    if (blockId === "personalNotes") {
      return (
        <Card key="personalNotes">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{t(lang, "personal")}</h2>
            <button type="button" className="text-xs font-semibold text-copper" onClick={() => onOpen("personal")}>
              Открыть
            </button>
          </div>
          {myPersonalNotes.length === 0 && myPersonalTasks.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Личных заметок и активных дел пока нет.</p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {myPersonalTasks.map((pt) => (
                <p key={pt.id} className="text-fg">• [Задача] {pt.title}</p>
              ))}
              {myPersonalNotes.map((pn) => (
                <p key={pn.id} className="text-muted">• {pn.title || pn.content.slice(0, 60)}</p>
              ))}
            </div>
          )}
        </Card>
      );
    }

    if (blockId === "community") {
      return (
        <Card key="community">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold flex items-center gap-1.5">
              <Users className="h-4 w-4 text-copper" />
              <span>{t(lang, "community")}</span>
            </h2>
            <button type="button" className="text-xs font-semibold text-copper" onClick={() => onOpen("community")}>
              Все посты
            </button>
          </div>
          {recentPosts.length === 0 ? (
            <p className="mt-2 text-xs text-muted">В ленте сообщества этого пространства пока нет публикаций.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs">
              {recentPosts.map((post) => (
                <li key={post.id} className="border-b border-line/50 pb-1.5 last:border-none last:pb-0">
                  <p className="font-semibold text-fg">{post.title || post.authorName}</p>
                  <p className="text-muted truncate">{post.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">{profile?.name}</h1>
          <p className="text-sm text-muted">{activeSpace?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen("updates")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-copper px-3.5 text-xs font-bold text-copper-fg hover:brightness-110 transition-all"
            title={`Центр обновлений MetaШкола ${CURRENT_VERSION}`}
          >
            <span>APK v{CURRENT_VERSION}</span>
            <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">8.6 МБ</span>
          </button>
        </div>
      </header>

      {homeBlocks.filter((b) => b.enabled).map((b) => renderBlock(b.id))}
    </div>
  );
}
