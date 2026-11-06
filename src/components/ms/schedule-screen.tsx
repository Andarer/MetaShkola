import { useMemo, useState } from "react";
import { watchGroups, type WatchGroup } from "@/lib/ms/agenda";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { formatHHMM, fromISODate, isoWeekday, resolveDay, toISODate } from "@/lib/ms/time";
import type { Bell, Lesson } from "@/lib/ms/types";
import { Btn, Card, controlClass, Field, Modal, personName, subjectOf, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import { QrCode } from "lucide-react";
import { QrShareModal } from "@/components/ms/qr-modal";

const WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

export function ScheduleScreen() {
  const data = useMs((s) => s.data);
  const saveLesson = useMs((s) => s.saveLesson);
  const deleteLesson = useMs((s) => s.deleteLesson);
  const copyDay = useMs((s) => s.copyDay);
  const saveException = useMs((s) => s.saveException);
  const updateBell = useMs((s) => s.updateBell);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const groups = watchGroups(data, profile);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const [date, setDate] = useState(toISODate(new Date()));
  const [lessonOpen, setLessonOpen] = useState<Lesson | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [targets, setTargets] = useState<number[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const space = data.spaces.find((item) => item.id === group?.spaceId);
  const canEdit = Boolean(profile && space && canInSpace(profile, space.id, "schedule", data.customRoles));
  const weekday = isoWeekday(fromISODate(date));
  const rows = useMemo(() => {
    if (!group || !space) return [];
    return resolveDay(space.bell, data.lessons, data.exceptions, date, weekday, {
      classId: group.teacherId ? undefined : group.classId,
      ownerProfileId: group.ownerProfileId,
      teacherId: group.teacherId,
    });
  }, [data.exceptions, data.lessons, date, group, space, weekday]);

  if (!group || !space) {
    return <p className="text-sm text-muted">{t(lang, "noLessons")}</p>;
  }

  const subjects = data.subjects.filter((item) => item.spaceId === space.id);
  const teachers = data.profiles.filter((item) =>
    item.memberships.some(
      (membership) =>
        membership.spaceId === space.id &&
        (membership.roleKeys.includes("teacher") || membership.roleKeys.includes("homeroom")),
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t(lang, "schedule")}</h1>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setQrOpen(true)} className="flex items-center gap-1.5 text-xs">
            <QrCode className="h-4 w-4 text-copper" />
            <span>QR / Обмен</span>
          </Btn>
          {canEdit ? (
            <Btn variant="ghost" onClick={() => setBellOpen(true)} className="text-xs">
              {t(lang, "bells")}
            </Btn>
          ) : null}
        </div>
      </header>
      <Field label={t(lang, "myWatch")}>
        <select className={controlClass} value={group.id} onChange={(event) => setGroupId(event.target.value)}>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t(lang, "date")}>
        <input className={controlClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </Field>
      <div className="flex gap-2 overflow-x-auto">
        {WEEK.map((day) => (
          <button
            key={day}
            type="button"
            className={cn(
              "h-11 shrink-0 rounded-xl px-3 text-sm font-semibold",
              day === weekday ? "bg-copper text-copper-fg" : "bg-surface text-fg",
            )}
            onClick={() => {
              const base = fromISODate(date);
              const delta = day - isoWeekday(base);
              base.setDate(base.getDate() + delta);
              setDate(toISODate(base));
            }}
          >
            {t(lang, `wd${day}` as CopyKey)}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{t(lang, `wd${weekday}` as CopyKey)}</p>
      {rows.length === 0 ? <p className="text-sm text-muted">{t(lang, "noLessons")}</p> : null}
      {rows.map((row) => {
        const subject = subjectOf(data, row.subjectId);
        return (
          <Card key={row.lesson.id} className={cn("border-l-4", toneBorder(subject?.tone), row.cancelled && "opacity-60")}>
            <p className="text-sm tabular-nums text-muted">
              {formatHHMM(row.startMin)}–{formatHHMM(row.endMin)} · {t(lang, "lesson").replace("{n}", String(row.lesson.index))}
            </p>
            <h2 className="text-xl">{subject?.name}</h2>
            <p className="text-sm text-muted">
              {t(lang, "room")}: {row.room || "—"} · {personName(data, row.teacherId)}
            </p>
            {row.cancelled ? <p className="text-sm text-clay">{t(lang, "cancelled")}{row.note ? ` · ${row.note}` : ""}</p> : null}
            {!row.cancelled && row.note ? <p className="text-sm text-copper">{t(lang, "replaced")} · {row.note}</p> : null}
            {canEdit && !group.teacherId ? (
              <div className="mt-3 flex gap-2">
                <Btn variant="ghost" onClick={() => setLessonOpen(row.lesson)}>
                  {t(lang, "edit")}
                </Btn>
                <Btn variant="danger" onClick={() => deleteLesson(row.lesson.id)}>
                  {t(lang, "delete")}
                </Btn>
              </div>
            ) : null}
          </Card>
        );
      })}
      {canEdit && !group.teacherId ? (
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() => {
              const used = new Set(rows.map((row) => row.lesson.index));
              let index = 1;
              while (used.has(index) && index < 12) index += 1;
              setLessonOpen({
                id: uid(),
                spaceId: space.id,
                classId: group.classId,
                ownerProfileId: group.ownerProfileId,
                weekday,
                index,
                subjectId: subjects[0]?.id ?? "",
                teacherId: null,
                room: "",
              });
            }}
          >
            {t(lang, "addLesson")}
          </Btn>
          <Btn variant="ghost" onClick={() => { setTargets([]); setCopyOpen(true); }}>
            {t(lang, "copyDay")}
          </Btn>
          <Btn variant="ghost" onClick={() => setExOpen(true)}>
            {t(lang, "exception")}
          </Btn>
        </div>
      ) : null}
      {!canEdit ? <p className="text-sm text-muted">{t(lang, "noAccess")}</p> : null}

      <LessonModal
        lesson={lessonOpen}
        subjects={subjects}
        teachers={teachers}
        onClose={() => setLessonOpen(null)}
        onSave={(lesson) => {
          saveLesson(lesson);
          setLessonOpen(null);
        }}
      />
      <Modal open={copyOpen} title={t(lang, "copyDay")} onClose={() => setCopyOpen(false)}>
        <p className="text-sm text-muted">{t(lang, "copyTo")}</p>
        <div className="flex flex-wrap gap-2">
          {WEEK.filter((day) => day !== weekday).map((day) => (
            <button
              key={day}
              type="button"
              className={cn("h-11 rounded-xl px-3 text-sm font-semibold", targets.includes(day) ? "bg-copper text-copper-fg" : "bg-surface-2 text-fg")}
              onClick={() => setTargets((list) => (list.includes(day) ? list.filter((item) => item !== day) : [...list, day]))}
            >
              {t(lang, `wd${day}` as CopyKey)}
            </button>
          ))}
        </div>
        <Btn
          onClick={() => {
            const sample = rows[0]?.lesson;
            if (sample) copyDay(sample, targets);
            setCopyOpen(false);
          }}
        >
          {t(lang, "save")}
        </Btn>
      </Modal>
      <ExceptionModal open={exOpen} date={date} group={group} spaceId={space.id} onClose={() => setExOpen(false)} />
      <BellModal open={bellOpen} bell={space.bell} onClose={() => setBellOpen(false)} onSave={(bell) => { updateBell(space.id, bell); setBellOpen(false); }} />
      <QrShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={`MetaShare: ${space.name} (${group.label})`}
        payload={{
          format: "mspack",
          version: 1,
          kind: "schedule",
          createdAt: new Date().toISOString(),
          checksum: "",
          meta: {
            title: `Расписание: ${space.name}`,
            description: group.label,
            sourceApp: "MetaSchool",
            sourceVersion: "2.2.0",
          },
          payload: {
            space,
            subjects: data.subjects.filter((s) => s.spaceId === space.id),
            lessons: data.lessons.filter((l) => l.spaceId === space.id && (!group.classId || l.classId === group.classId)),
            exceptions: data.exceptions.filter((e) => e.spaceId === space.id),
            classes: data.classes.filter((c) => c.spaceId === space.id),
          },
        }}
      />
    </div>
  );
}

function LessonModal({
  lesson,
  subjects,
  teachers,
  onClose,
  onSave,
}: {
  lesson: Lesson | null;
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  onClose: () => void;
  onSave: (lesson: Lesson) => void;
}) {
  const lang = useMs((s) => s.data.lang);
  const [draft, setDraft] = useState<Lesson | null>(null);
  const current = draft && lesson && draft.id === lesson.id ? draft : lesson;
  if (!current) return null;
  return (
    <Modal open={Boolean(lesson)} title={t(lang, "addLesson")} onClose={onClose}>
      <Field label={t(lang, "index")}>
        <input
          className={controlClass}
          type="number"
          min={1}
          max={12}
          value={current.index}
          onChange={(event) => setDraft({ ...current, index: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })}
        />
      </Field>
      <Field label={t(lang, "subject")}>
        <select className={controlClass} value={current.subjectId} onChange={(event) => setDraft({ ...current, subjectId: event.target.value })}>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>{subject.name}</option>
          ))}
        </select>
      </Field>
      <Field label={t(lang, "teacher")}>
        <select
          className={controlClass}
          value={current.teacherId ?? ""}
          onChange={(event) => setDraft({ ...current, teacherId: event.target.value || null })}
        >
          <option value="">—</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
          ))}
        </select>
      </Field>
      <Field label={t(lang, "room")}>
        <input className={controlClass} value={current.room} onChange={(event) => setDraft({ ...current, room: event.target.value })} />
      </Field>
      <Btn onClick={() => onSave(current)} disabled={!current.subjectId}>{t(lang, "save")}</Btn>
    </Modal>
  );
}

function ExceptionModal({
  open,
  date,
  group,
  spaceId,
  onClose,
}: {
  open: boolean;
  date: string;
  group: WatchGroup;
  spaceId: string;
  onClose: () => void;
}) {
  const lang = useMs((s) => s.data.lang);
  const allSubjects = useMs((s) => s.data.subjects);
  const subjects = allSubjects.filter((item) => item.spaceId === spaceId);
  const saveException = useMs((s) => s.saveException);
  const [index, setIndex] = useState(1);
  const [kind, setKind] = useState<"cancel" | "replace">("cancel");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  if (!open) return null;
  return (
    <Modal open={open} title={t(lang, "exception")} onClose={onClose}>
      <Field label={t(lang, "index")}>
        <input className={controlClass} type="number" min={1} max={12} value={index} onChange={(event) => setIndex(Number(event.target.value) || 1)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Btn variant={kind === "cancel" ? "primary" : "ghost"} onClick={() => setKind("cancel")}>{t(lang, "exCancel")}</Btn>
        <Btn variant={kind === "replace" ? "primary" : "ghost"} onClick={() => setKind("replace")}>{t(lang, "exReplace")}</Btn>
      </div>
      {kind === "replace" ? (
        <>
          <Field label={t(lang, "subject")}>
            <select className={controlClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t(lang, "room")}>
            <input className={controlClass} value={room} onChange={(event) => setRoom(event.target.value)} />
          </Field>
        </>
      ) : null}
      <Field label={t(lang, "note")}>
        <input className={controlClass} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <Btn
        onClick={() => {
          saveException({
            id: uid(),
            spaceId,
            classId: group.classId,
            date,
            lessonIndex: index,
            kind,
            subjectId: kind === "replace" ? subjectId : undefined,
            room: room || undefined,
            note: note || undefined,
          });
          onClose();
        }}
      >
        {t(lang, "save")}
      </Btn>
    </Modal>
  );
}

function BellModal({
  open,
  bell,
  onClose,
  onSave,
}: {
  open: boolean;
  bell: Bell;
  onClose: () => void;
  onSave: (bell: Bell) => void;
}) {
  const lang = useMs((s) => s.data.lang);
  const [draft, setDraft] = useState(bell);
  if (!open) return null;
  const current = draft.firstStart === bell.firstStart && draft.lessonMinutes === bell.lessonMinutes ? draft : draft;
  return (
    <Modal open={open} title={t(lang, "bellSettings")} onClose={onClose}>
      <Field label={t(lang, "firstLesson")}>
        <input className={controlClass} type="time" value={current.firstStart} onChange={(event) => setDraft({ ...current, firstStart: event.target.value })} />
      </Field>
      <Field label={t(lang, "lessonLen")}>
        <input className={controlClass} type="number" min={20} max={90} value={current.lessonMinutes} onChange={(event) => setDraft({ ...current, lessonMinutes: Number(event.target.value) || 45 })} />
      </Field>
      <Field label={t(lang, "breakLen")}>
        <input className={controlClass} type="number" min={0} max={40} value={current.breakMinutes} onChange={(event) => setDraft({ ...current, breakMinutes: Number(event.target.value) || 0 })} />
      </Field>
      <Field label={t(lang, "bigBreak")}>
        <input className={controlClass} type="number" min={0} max={60} value={current.bigBreakMinutes} onChange={(event) => setDraft({ ...current, bigBreakMinutes: Number(event.target.value) || 0 })} />
      </Field>
      <Field label={t(lang, "bigAfter")}>
        <input
          className={controlClass}
          type="number"
          min={1}
          max={11}
          value={current.bigBreakAfter[0] ?? 3}
          onChange={(event) => setDraft({ ...current, bigBreakAfter: [Number(event.target.value) || 3] })}
        />
      </Field>
      <Field label={t(lang, "perDay")}>
        <input className={controlClass} type="number" min={1} max={12} value={current.lessonsPerDay} onChange={(event) => setDraft({ ...current, lessonsPerDay: Math.min(12, Number(event.target.value) || 1) })} />
      </Field>
      <Btn onClick={() => onSave(current)}>{t(lang, "save")}</Btn>
    </Modal>
  );
}
