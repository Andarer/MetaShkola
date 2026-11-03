import { useEffect, useState } from "react";
import { Volume2, Settings2, Bell as BellIcon, Check } from "lucide-react";
import { watchGroups } from "@/lib/ms/agenda";
import { tf, t } from "@/lib/ms/i18n";
import { canInSpace } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { dayPhase, formatCountdown, formatHHMM, isoWeekday, minutesNow, resolveDay, toISODate } from "@/lib/ms/time";
import { Btn, Card, controlClass, Field, Modal, subjectOf, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import type { Bell } from "@/lib/ms/types";

function playBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.2 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.2);
      osc.stop(ctx.currentTime + idx * 0.2 + 0.6);
    });
  } catch {
    // Audio restricted without user interaction
  }
}

export function BellsScreen() {
  const data = useMs((s) => s.data);
  const updateBell = useMs((s) => s.updateBell);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const groups = watchGroups(data, profile);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [now, setNow] = useState(() => new Date());
  const [bellModalOpen, setBellModalOpen] = useState(false);
  const [chimePlayed, setChimePlayed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const group = groups.find((item) => item.id === groupId) ?? groups[0];
  const space = data.spaces.find((item) => item.id === group?.spaceId);
  const canEdit = Boolean(profile && space && canInSpace(profile, space.id, "schedule", data.customRoles));

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

  const handleTestChime = () => {
    playBellChime();
    setChimePlayed(true);
    setTimeout(() => setChimePlayed(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t(lang, "bells")}</h1>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={handleTestChime} className="flex items-center gap-1.5 text-xs">
            {chimePlayed ? <Check className="h-4 w-4 text-sage" /> : <Volume2 className="h-4 w-4 text-copper" />}
            <span>Прослушать звонок</span>
          </Btn>
          {canEdit ? (
            <Btn variant="ghost" onClick={() => setBellModalOpen(true)} className="flex items-center gap-1.5 text-xs">
              <Settings2 className="h-4 w-4 text-muted" />
              <span>Настройка</span>
            </Btn>
          ) : null}
        </div>
      </header>

      <Field label={t(lang, "myWatch")}>
        <select className={controlClass} value={group.id} onChange={(event) => setGroupId(event.target.value)}>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </Field>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-4xl tabular-nums">{clock}</p>
            <p className="mt-2 text-lg font-semibold">{headline}</p>
            {sub ? <p className="text-copper font-medium">{sub}</p> : null}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-copper/10 text-copper">
            <BellIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/50 pt-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-muted">Первый урок</p>
            <p className="font-semibold">{space.bell.firstStart}</p>
          </div>
          <div>
            <p className="text-muted">Длительность</p>
            <p className="font-semibold">{space.bell.lessonMinutes} мин</p>
          </div>
          <div>
            <p className="text-muted">Обычная перемена</p>
            <p className="font-semibold">{space.bell.breakMinutes} мин</p>
          </div>
          <div>
            <p className="text-muted">Большая перемена</p>
            <p className="font-semibold">{space.bell.bigBreakMinutes} мин (после {space.bell.bigBreakAfter.join(", ")})</p>
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-semibold mt-1">Звонки на сегодня</h2>
      {rows.map((row) => {
        const subject = subjectOf(data, row.subjectId);
        const current = phase.kind === "lesson" && phase.current.lesson.id === row.lesson.id;
        return (
          <div
            key={row.lesson.id}
            className={cn(
              "rounded-2xl border border-line bg-surface p-4 border-l-4 transition-all",
              toneBorder(subject?.tone),
              row.cancelled && "opacity-50",
              current && "ring-2 ring-copper shadow-sm"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm tabular-nums font-semibold text-muted">
                {formatHHMM(row.startMin)} – {formatHHMM(row.endMin)}
              </p>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                {row.lesson.index} урок
              </span>
            </div>
            <p className="mt-1 font-semibold text-base">{subject?.name}</p>
            <p className="text-xs text-muted">{row.cancelled ? t(lang, "cancelled") : (row.room ? `Кабинет ${row.room}` : "—")}</p>
          </div>
        );
      })}

      {canEdit ? (
        <EditBellModal
          open={bellModalOpen}
          bell={space.bell}
          onClose={() => setBellModalOpen(false)}
          onSave={(updated) => {
            updateBell(space.id, updated);
            setBellModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function EditBellModal({
  open,
  bell,
  onClose,
  onSave,
}: {
  open: boolean;
  bell: Bell;
  onClose: () => void;
  onSave: (b: Bell) => void;
}) {
  const [firstStart, setFirstStart] = useState(bell.firstStart);
  const [lessonMinutes, setLessonMinutes] = useState(bell.lessonMinutes);
  const [breakMinutes, setBreakMinutes] = useState(bell.breakMinutes);
  const [bigBreakMinutes, setBigBreakMinutes] = useState(bell.bigBreakMinutes);
  const [lessonsPerDay, setLessonsPerDay] = useState(bell.lessonsPerDay);

  if (!open) return null;

  return (
    <Modal open={open} title="Настройка расписания звонков" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            firstStart,
            lessonMinutes,
            breakMinutes,
            bigBreakMinutes,
            bigBreakAfter: bell.bigBreakAfter,
            lessonsPerDay,
          });
        }}
      >
        <Field label="Начало первого урока">
          <input
            className={controlClass}
            type="time"
            value={firstStart}
            onChange={(e) => setFirstStart(e.target.value)}
            required
          />
        </Field>
        <Field label="Длительность урока (мин)">
          <input
            className={controlClass}
            type="number"
            min={20}
            max={90}
            value={lessonMinutes}
            onChange={(e) => setLessonMinutes(Number(e.target.value) || 45)}
            required
          />
        </Field>
        <Field label="Обычная перемена (мин)">
          <input
            className={controlClass}
            type="number"
            min={5}
            max={30}
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value) || 10)}
            required
          />
        </Field>
        <Field label="Большая перемена (мин)">
          <input
            className={controlClass}
            type="number"
            min={10}
            max={45}
            value={bigBreakMinutes}
            onChange={(e) => setBigBreakMinutes(Number(e.target.value) || 20)}
            required
          />
        </Field>
        <Field label="Количество уроков в день">
          <input
            className={controlClass}
            type="number"
            min={1}
            max={12}
            value={lessonsPerDay}
            onChange={(e) => setLessonsPerDay(Number(e.target.value) || 6)}
            required
          />
        </Field>
        <Btn type="submit" className="mt-2">
          Сохранить настройки звонков
        </Btn>
      </form>
    </Modal>
  );
}
