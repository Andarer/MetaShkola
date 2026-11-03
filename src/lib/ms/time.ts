import type { Bell, Lesson, ScheduleException } from "./types.ts";

export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 8 * 60;
  return h * 60 + m;
}

export function formatHHMM(mins: number): string {
  const wrapped = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function lessonBounds(bell: Bell, index: number): { startMin: number; endMin: number } {
  let cursor = parseHHMM(bell.firstStart);
  const safeIndex = Math.min(12, Math.max(1, index));
  for (let i = 1; i < safeIndex; i += 1) {
    cursor += bell.lessonMinutes;
    cursor += bell.bigBreakAfter.includes(i) ? bell.bigBreakMinutes : bell.breakMinutes;
  }
  return { startMin: cursor, endMin: cursor + bell.lessonMinutes };
}

export function isoWeekday(date: Date): number {
  const n = date.getDay();
  return n === 0 ? 7 : n;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function minutesNow(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export type ResolvedLesson = {
  lesson: Lesson;
  startMin: number;
  endMin: number;
  subjectId: string;
  teacherId: string | null;
  room: string;
  cancelled: boolean;
  note?: string;
};

export function resolveDay(
  bell: Bell,
  lessons: Lesson[],
  exceptions: ScheduleException[],
  dateISO: string,
  weekday: number,
  filter: { classId?: string | null; ownerProfileId?: string | null; teacherId?: string | null },
): ResolvedLesson[] {
  const rows = lessons.filter((lesson) => {
    if (lesson.weekday !== weekday) return false;
    if (filter.teacherId) return lesson.teacherId === filter.teacherId;
    if (filter.ownerProfileId) return lesson.ownerProfileId === filter.ownerProfileId && !lesson.classId;
    if (filter.classId) return lesson.classId === filter.classId;
    return false;
  });
  return rows
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((lesson) => {
      const bounds = lessonBounds(bell, lesson.index);
      const exception = exceptions.find(
        (item) =>
          item.date === dateISO &&
          item.lessonIndex === lesson.index &&
          item.spaceId === lesson.spaceId &&
          item.classId === lesson.classId,
      );
      if (!exception) {
        return {
          lesson,
          ...bounds,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          room: lesson.room,
          cancelled: false,
        };
      }
      if (exception.kind === "cancel") {
        return {
          lesson,
          ...bounds,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          room: lesson.room,
          cancelled: true,
          note: exception.note,
        };
      }
      return {
        lesson,
        ...bounds,
        subjectId: exception.subjectId || lesson.subjectId,
        teacherId: exception.teacherId === undefined ? lesson.teacherId : exception.teacherId,
        room: exception.room || lesson.room,
        cancelled: false,
        note: exception.note,
      };
    });
}

export type DayPhase =
  | { kind: "before"; next: ResolvedLesson; mins: number }
  | { kind: "lesson"; current: ResolvedLesson; mins: number }
  | { kind: "break"; prev: ResolvedLesson; next?: ResolvedLesson; mins: number }
  | { kind: "after"; prev?: ResolvedLesson }
  | { kind: "empty" };

export function dayPhase(rows: ResolvedLesson[], nowMin: number): DayPhase {
  const active = rows.filter((row) => !row.cancelled);
  if (active.length === 0) return { kind: "empty" };
  const first = active[0];
  if (!first) return { kind: "empty" };
  if (nowMin < first.startMin) return { kind: "before", next: first, mins: first.startMin - nowMin };
  for (let i = 0; i < active.length; i += 1) {
    const row = active[i];
    if (!row) continue;
    if (nowMin >= row.startMin && nowMin < row.endMin) {
      return { kind: "lesson", current: row, mins: row.endMin - nowMin };
    }
    const next = active[i + 1];
    if (nowMin >= row.endMin && next && nowMin < next.startMin) {
      return { kind: "break", prev: row, next, mins: next.startMin - nowMin };
    }
  }
  return { kind: "after", prev: active[active.length - 1] };
}

export function formatCountdown(mins: number): string {
  const safe = Math.max(0, mins);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h <= 0) return String(m);
  return `${h}:${String(m).padStart(2, "0")}`;
}
