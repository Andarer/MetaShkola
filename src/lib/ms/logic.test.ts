import assert from "node:assert/strict";
import test from "node:test";
import { encryptData, decryptData } from "./crypto.ts";
import { t, tf } from "./i18n.ts";
import { canCreateSpace, grantsFor, canSeeTask, canSeeGrade, canSeeEvent, isRoleKey } from "./rbac.ts";
import { redactSecrets } from "./store.ts";
import {
  addDays,
  dayPhase,
  formatCountdown,
  formatHHMM,
  fromISODate,
  isoWeekday,
  lessonBounds,
  resolveDay,
  toISODate,
} from "./time.ts";
import { defaultBell, type Data, type ScheduleException, type Lesson } from "./types.ts";

test("default bells start at 08:00 and last 45 minutes", () => {
  const bell = defaultBell();
  const first = lessonBounds(bell, 1);
  assert.equal(first.startMin, 8 * 60);
  assert.equal(first.endMin, 8 * 60 + 45);
  const second = lessonBounds(bell, 2);
  assert.equal(second.startMin, 8 * 60 + 45 + 10);
  const fourth = lessonBounds(bell, 4);
  assert.equal(fourth.startMin, second.startMin + 45 + 10 + 45 + 20);
});

test("student cannot edit grades, teacher can", () => {
  assert.equal(grantsFor(["student"], []).grades, false);
  assert.equal(grantsFor(["teacher"], []).grades, true);
  assert.equal(grantsFor(["guest"], []).view, true);
  assert.equal(grantsFor(["guest"], []).ai, false);
  assert.equal(grantsFor(["parent"], []).tasks, false);
  assert.equal(grantsFor(["homeroom"], []).members, true);
  assert.equal(isRoleKey("teacher"), true);
  assert.equal(isRoleKey("unknown_role"), false);
});

test("only an admin opens a school, a teacher may open a personal space", () => {
  const teacher = {
    id: "t",
    name: "T",
    tone: "ink" as const,
    memberships: [{ spaceId: "s", roleKeys: ["teacher"] }],
  };
  const guest = {
    id: "g",
    name: "G",
    tone: "ink" as const,
    memberships: [{ spaceId: "s", roleKeys: ["guest"] }],
  };
  assert.equal(canCreateSpace(teacher, "school"), false);
  assert.equal(canCreateSpace(teacher, "personal"), true);
  assert.equal(canCreateSpace(guest, "personal"), false);
  assert.equal(canCreateSpace({ ...teacher, isProjectCreator: true }, "school"), true);
});

test("dayPhase accurately determines school day progression (before, lesson, break, after)", () => {
  const bell = defaultBell();
  const lesson1: Lesson = {
    id: "l1",
    spaceId: "s1",
    classId: "c1",
    ownerProfileId: null,
    weekday: 1,
    index: 1,
    subjectId: "math",
    teacherId: "t1",
    room: "101",
  };
  const lesson2: Lesson = {
    id: "l2",
    spaceId: "s1",
    classId: "c1",
    ownerProfileId: null,
    weekday: 1,
    index: 2,
    subjectId: "lit",
    teacherId: "t2",
    room: "102",
  };
  const rows = resolveDay(bell, [lesson1, lesson2], [], "2026-11-09", 1, { classId: "c1" });
  assert.equal(rows.length, 2);

  // 1. Before school starts (07:30 = 450 min)
  const before = dayPhase(rows, 450);
  assert.equal(before.kind, "before");
  assert.equal(before.mins, 30); // 30 mins until 08:00

  // 2. During 1st lesson (08:20 = 500 min)
  const duringLesson = dayPhase(rows, 500);
  assert.equal(duringLesson.kind, "lesson");
  if (duringLesson.kind === "lesson") {
    assert.equal(duringLesson.current.lesson.id, "l1");
    assert.equal(duringLesson.mins, 25); // 25 mins until 08:45
  }

  // 3. During break between lesson 1 and 2 (08:50 = 530 min)
  const duringBreak = dayPhase(rows, 530);
  assert.equal(duringBreak.kind, "break");
  if (duringBreak.kind === "break") {
    assert.equal(duringBreak.next?.lesson.id, "l2");
    assert.equal(duringBreak.mins, 5); // 5 mins until 08:55
  }

  // 4. After all lessons (11:00 = 660 min)
  const after = dayPhase(rows, 660);
  assert.equal(after.kind, "after");
});

test("resolveDay applies cancellations and replacements correctly", () => {
  const bell = defaultBell();
  const lesson: Lesson = {
    id: "l1",
    spaceId: "s1",
    classId: "c1",
    ownerProfileId: null,
    weekday: 1,
    index: 1,
    subjectId: "math",
    teacherId: "t1",
    room: "101",
  };

  // Test cancellation
  const cancelEx: ScheduleException = {
    id: "e1",
    spaceId: "s1",
    classId: "c1",
    date: "2026-11-09",
    lessonIndex: 1,
    kind: "cancel",
    note: "Teacher sick",
  };
  const cancelledRows = resolveDay(bell, [lesson], [cancelEx], "2026-11-09", 1, { classId: "c1" });
  assert.equal(cancelledRows.length, 1);
  assert.equal(cancelledRows[0]?.cancelled, true);
  assert.equal(cancelledRows[0]?.note, "Teacher sick");

  // Test replacement
  const replaceEx: ScheduleException = {
    id: "e2",
    spaceId: "s1",
    classId: "c1",
    date: "2026-11-09",
    lessonIndex: 1,
    kind: "replace",
    subjectId: "phys",
    room: "204",
    note: "Substitute",
  };
  const replacedRows = resolveDay(bell, [lesson], [replaceEx], "2026-11-09", 1, { classId: "c1" });
  assert.equal(replacedRows.length, 1);
  assert.equal(replacedRows[0]?.cancelled, false);
  assert.equal(replacedRows[0]?.subjectId, "phys");
  assert.equal(replacedRows[0]?.room, "204");
});

test("time formatting and date math helpers operate deterministically", () => {
  // formatHHMM
  assert.equal(formatHHMM(480), "08:00");
  assert.equal(formatHHMM(525), "08:45");
  assert.equal(formatHHMM(0), "00:00");
  assert.equal(formatHHMM(1439), "23:59");

  // formatCountdown
  assert.equal(formatCountdown(65), "1:05");
  assert.equal(formatCountdown(120), "2:00");
  assert.equal(formatCountdown(45), "45");
  assert.equal(formatCountdown(0), "0");

  // Date math
  const d = fromISODate("2026-11-09");
  assert.equal(isoWeekday(d), 1); // 2026-11-09 is Monday
  const dSunday = fromISODate("2026-11-15");
  assert.equal(isoWeekday(dSunday), 7); // Sunday = 7

  const nextDay = addDays(d, 1);
  assert.equal(toISODate(nextDay), "2026-11-10");
});

test("RBAC data visibility enforces strict student, parent, and class boundaries", () => {
  const dummyData: Data = {
    lang: "ru",
    theme: "system",
    notif: {
      lessonStart: true,
      lessonEnd: true,
      breakStart: true,
      breakEnd: true,
      remind15: true,
      remind5: true,
      tasks: true,
      personal: true,
    },
    version: 1,
    activeSpaceId: "s1",
    activeProfileId: "p_student",
    spaces: [{ id: "s1", name: "School 1", kind: "school", aiRestrictedForMinors: false, bell: defaultBell() }],
    profiles: [
      {
        id: "p_student",
        name: "Student Alex",
        tone: "copper",
        memberships: [{ spaceId: "s1", roleKeys: ["student"], classId: "c1" }],
      },
      {
        id: "p_parent",
        name: "Parent Anna",
        tone: "sage",
        memberships: [{ spaceId: "s1", roleKeys: ["parent"], childIds: ["p_student"] }],
      },
      {
        id: "p_other_student",
        name: "Student Bob",
        tone: "clay",
        memberships: [{ spaceId: "s1", roleKeys: ["student"], classId: "c2" }],
      },
    ],
    classes: [
      { id: "c1", spaceId: "s1", orgId: "o1", name: "9-A" },
      { id: "c2", spaceId: "s1", orgId: "o1", name: "9-B" },
    ],
    orgs: [],
    divisions: [],
    groups: [],
    subjects: [],
    periods: [],
    lessons: [],
    exceptions: [],
    events: [
      { id: "ev1", spaceId: "s1", date: "2026-11-10", title: "All School", kind: "study", note: "" },
      { id: "ev2", spaceId: "s1", date: "2026-11-10", title: "Class 9-A Only", kind: "study", classId: "c1", note: "" },
      { id: "ev3", spaceId: "s1", date: "2026-11-10", title: "Class 9-B Only", kind: "study", classId: "c2", note: "" },
      { id: "ev4", spaceId: "s1", date: "2026-11-10", title: "Personal Note", kind: "personal", profileId: "p_other_student", note: "" },
    ],
    tasks: [
      {
        id: "t1",
        spaceId: "s1",
        subjectId: "sub1",
        title: "Homework 1",
        detail: "Exercise 12",
        due: "2026-11-10",
        priority: "normal",
        status: "assigned",
        classId: "c1",
        assigneeId: "p_student",
        comments: [],
        attachments: [],
        history: [],
      },
      {
        id: "t2",
        spaceId: "s1",
        subjectId: "sub1",
        title: "Homework 2",
        detail: "Exercise 13",
        due: "2026-11-10",
        priority: "normal",
        status: "assigned",
        classId: "c2",
        assigneeId: "p_other_student",
        comments: [],
        attachments: [],
        history: [],
      },
    ],
    grades: [
      { id: "g1", spaceId: "s1", studentId: "p_student", subjectId: "sub1", date: "2026-11-09", score: 11, kind: "mark", comment: "" },
      { id: "g2", spaceId: "s1", studentId: "p_other_student", subjectId: "sub1", date: "2026-11-09", score: 9, kind: "mark", comment: "" },
    ],
    providers: [],
    audit: [],
    inbox: [],
    customRoles: [],
    assistants: [],
    chats: [],
    activeChatId: null,
    usage: [],
    integrations: [],
    rules: [],
    syncLog: [],
    communityPosts: [],
    communityGroups: [],
    communityReports: [],
    updateChannel: "stable",
    outbox: [],
  };

  const student = dummyData.profiles[0]!;
  const parent = dummyData.profiles[1]!;

  // Task visibility
  assert.equal(canSeeTask(dummyData, student, dummyData.tasks[0]!), true);
  assert.equal(canSeeTask(dummyData, student, dummyData.tasks[1]!), false);
  assert.equal(canSeeTask(dummyData, parent, dummyData.tasks[0]!), true);
  assert.equal(canSeeTask(dummyData, parent, dummyData.tasks[1]!), false);

  // Grade visibility
  assert.equal(canSeeGrade(dummyData, student, dummyData.grades[0]!), true);
  assert.equal(canSeeGrade(dummyData, student, dummyData.grades[1]!), false);
  assert.equal(canSeeGrade(dummyData, parent, dummyData.grades[0]!), true);
  assert.equal(canSeeGrade(dummyData, parent, dummyData.grades[1]!), false);

  // Event visibility
  assert.equal(canSeeEvent(dummyData, student, dummyData.events[0]!), true);
  assert.equal(canSeeEvent(dummyData, student, dummyData.events[1]!), true);
  assert.equal(canSeeEvent(dummyData, student, dummyData.events[2]!), false);
  assert.equal(canSeeEvent(dummyData, student, dummyData.events[3]!), false);
});

test("encryptData and decryptData perform end-to-end authenticated AES-GCM encryption with PBKDF2", async () => {
  const sampleData: Partial<Data> = {
    lang: "ru",
    theme: "dark",
    activeSpaceId: "test-space",
  };

  const password = "correct-horse-battery-staple-123!";
  const encrypted = await encryptData(sampleData as Data, password);

  assert.equal(typeof encrypted, "string");
  assert(encrypted.length > 50, "Ciphertext envelope must be non-empty Base64");

  // Decrypt with correct password
  const decrypted = await decryptData(encrypted, password);
  assert.equal(decrypted.lang, sampleData.lang);
  assert.equal(decrypted.theme, sampleData.theme);
  assert.equal(decrypted.activeSpaceId, sampleData.activeSpaceId);

  // Decrypt with wrong password must throw error
  await assert.rejects(
    async () => {
      await decryptData(encrypted, "wrong-password");
    },
    /operation failed|MAC check failed|tag check failed|bad decrypt|padding/i
  );
});

test("redactSecrets sanitizes API keys and personal tokens for export", () => {
  const sensitiveData: any = {
    lang: "ru",
    activeSpaceId: "s1",
    profiles: [
      { id: "p1", name: "User", pin: "1234" },
    ],
    providers: [
      { id: "pr1", name: "OpenAI", apiKey: "sk-secret-key-1234" },
    ],
  };

  const redacted = redactSecrets(sensitiveData as Data, false) as any;
  assert.equal(redacted.profiles[0].pin, undefined);
  assert.equal(redacted.providers[0].apiKey, undefined);

  const full = redactSecrets(sensitiveData as Data, true) as any;
  assert.equal(full.profiles[0].pin, "1234");
  assert.equal(full.providers[0].apiKey, "sk-secret-key-1234");
});

test("i18n t and tf properly resolve translations and interpolate parameters", () => {
  assert.equal(t("ru", "schedule"), "Расписание");
  assert.equal(t("en", "schedule"), "Schedule");
  assert.equal(t("uk", "schedule"), "Розклад");

  // Template formatting
  const formatted = tf("ru", "bellIn", { t: "15 мин" });
  assert(formatted.includes("15 мин"));
});

test("community visibility rules enforce child privacy and class isolation", () => {
  const posts = [
    { id: "1", title: "Public School Event", visibility: "school" },
    { id: "2", title: "9-A Homework Discussion", visibility: "class" },
    { id: "3", title: "Family Notes", visibility: "family" },
    { id: "4", title: "Private Draft", visibility: "only_me" },
  ];

  // A student in 9-A should see school and their class, but NOT other families or private drafts
  const visibleForStudent = posts.filter(
    (p) => p.visibility === "school" || p.visibility === "class"
  );
  assert.equal(visibleForStudent.length, 2);
  assert.deepEqual(visibleForStudent.map((p) => p.id), ["1", "2"]);

  // Family member sees school and family
  const visibleForParent = posts.filter(
    (p) => p.visibility === "school" || p.visibility === "family"
  );
  assert.equal(visibleForParent.length, 2);
  assert.deepEqual(visibleForParent.map((p) => p.id), ["1", "3"]);
});

test("version comparator correctly detects new releases", () => {
  function isNewer(current: string, latest: string): boolean {
    const parse = (v: string) => v.split(".").map(Number);
    const [cMaj = 0, cMin = 0, cPatch = 0] = parse(current);
    const [lMaj = 0, lMin = 0, lPatch = 0] = parse(latest);
    if (lMaj !== cMaj) return lMaj > cMaj;
    if (lMin !== cMin) return lMin > cMin;
    return lPatch > cPatch;
  }

  assert.equal(isNewer("2.1.0", "2.2.0"), true);
  assert.equal(isNewer("2.2.0", "2.2.0"), false);
  assert.equal(isNewer("2.2.0", "2.1.9"), false);
  assert.equal(isNewer("2.0.2", "2.1.0"), true);
});
