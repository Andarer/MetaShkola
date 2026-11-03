import { useMemo, useState } from "react";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeEvent } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { addDays, isoWeekday, startOfDay, toISODate } from "@/lib/ms/time";
import type { CalEvent, EventKind } from "@/lib/ms/types";
import { Btn, Card, controlClass, Field, Modal } from "@/components/ms/ui";
import { cn } from "@/lib/cn";

const KINDS: EventKind[] = ["study", "weekend", "vacation", "holiday", "test", "exam", "event", "personal", "meeting"];

function kindKey(kind: EventKind): CopyKey {
  return `ev_${kind}` as CopyKey;
}

export function CalendarScreen() {
  const data = useMs((s) => s.data);
  const saveEvent = useMs((s) => s.saveEvent);
  const removeEvent = useMs((s) => s.removeEvent);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(toISODate(new Date()));
  const [open, setOpen] = useState(false);
  const canCreate = Boolean(profile && canInSpace(profile, data.activeSpaceId, "create", data.customRoles));
  const events = data.events.filter((event) => canSeeEvent(data, profile, event));
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -(isoWeekday(monthStart) - 1));
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const selectedEvents = events.filter((event) => event.date <= selected && (event.endDate ?? event.date) >= selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl">{t(lang, "calendar")}</h1>
        {canCreate ? <Btn onClick={() => setOpen(true)}>{t(lang, "add")}</Btn> : null}
      </div>
      <div className="flex items-center justify-between">
        <Btn variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</Btn>
        <p className="font-semibold tabular-nums">{cursor.getFullYear()}-{String(cursor.getMonth() + 1).padStart(2, "0")}</p>
        <Btn variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</Btn>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <span key={day}>{t(lang, `wd${day}` as CopyKey).slice(0, 2)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const marked = events.some((event) => event.date <= iso && (event.endDate ?? event.date) >= iso);
          return (
            <button
              key={iso}
              type="button"
              className={cn(
                "h-11 rounded-xl text-sm tabular-nums",
                selected === iso ? "bg-copper text-copper-fg" : "bg-surface text-fg",
                !inMonth && "opacity-40",
              )}
              onClick={() => setSelected(iso)}
            >
              {day.getDate()}
              {marked ? <span className="mt-0.5 block h-1 rounded-full bg-current" /> : null}
            </button>
          );
        })}
      </div>
      {selectedEvents.length === 0 ? <p className="text-sm text-muted">{t(lang, "noEvents")}</p> : null}
      {selectedEvents.map((event) => (
        <Card key={event.id}>
          <p className="text-sm text-copper">{t(lang, kindKey(event.kind))}</p>
          <h2 className="text-xl">{event.title}</h2>
          {event.note ? <p className="text-sm text-muted">{event.note}</p> : null}
          {canCreate && event.spaceId === data.activeSpaceId ? (
            <Btn variant="danger" className="mt-2" onClick={() => removeEvent(event.id)}>{t(lang, "delete")}</Btn>
          ) : null}
        </Card>
      ))}
      <EventComposer open={open} date={selected} onClose={() => setOpen(false)} onSave={saveEvent} />
    </div>
  );
}

function EventComposer({
  open,
  date,
  onClose,
  onSave,
}: {
  open: boolean;
  date: string;
  onClose: () => void;
  onSave: (event: CalEvent) => void;
}) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("personal");
  const [note, setNote] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  if (!open) return null;
  const classes = data.classes.filter((item) => item.spaceId === data.activeSpaceId);
  return (
    <Modal open={open} title={t(lang, "newEvent")} onClose={onClose}>
      <Field label={t(lang, "title")}><input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label={t(lang, "kind")}>
        <select className={controlClass} value={kind} onChange={(event) => setKind(event.target.value as EventKind)}>
          {KINDS.map((item) => <option key={item} value={item}>{t(lang, kindKey(item))}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "classLabel")}>
        <select className={controlClass} value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">{t(lang, "everyone")}</option>
          {classes.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "date")}><input className={controlClass} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
      <Field label={t(lang, "note")}><input className={controlClass} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      <Btn
        disabled={!title.trim()}
        onClick={() => {
          onSave({
            id: uid(),
            spaceId: data.activeSpaceId,
            title: title.trim(),
            date,
            endDate: endDate || undefined,
            kind,
            classId: classId || undefined,
            profileId: kind === "personal" ? data.activeProfileId : undefined,
            note,
          });
          onClose();
        }}
      >
        {t(lang, "save")}
      </Btn>
    </Modal>
  );
}
