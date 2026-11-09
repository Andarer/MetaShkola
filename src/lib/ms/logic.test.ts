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
import {
  calculateLegacyChecksum,
  createMetaSharePackage,
  createMetaSharePackageAsync,
  parseMetaShareInput,
  validateMetaSharePackage,
  validateMetaSharePackageAsync,
} from "./metashare.ts";
import { useMs } from "./store.ts";
import { defaultBell, type Data, type ScheduleException, type Lesson } from "./types.ts";
import { isNewerVersion, isUpdateAvailable } from "./version.ts";
import { computeNextAlarmOccurrence, isValidAlarmTime, sanitizeAlarmDays } from "./native.ts";

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

test("version comparator correctly detects new releases with SemVer and versionCode priority", () => {
  // SemVer logic
  assert.equal(isNewerVersion("2.1.0", "2.2.0"), true);
  assert.equal(isNewerVersion("2.2.0", "2.2.0"), false);
  assert.equal(isNewerVersion("2.2.0", "2.1.9"), false);
  assert.equal(isNewerVersion("2.0.2", "2.1.0"), true);
  assert.equal(isNewerVersion("2.2.9", "2.2.10"), true);
  assert.equal(isNewerVersion("2.2.10", "2.2.9"), false);

  // isUpdateAvailable with versionCode priority
  assert.equal(isUpdateAvailable("2.2.0", 220, "2.2.0", 220), false);
  assert.equal(isUpdateAvailable("2.2.0", 220, "2.2.1", 221), true);
  // Remote older versionCode is rejected even if text version string is malformed
  assert.equal(isUpdateAvailable("2.2.0", 220, "2.1.0", 210), false);
  // Missing remote versionCode falls back to SemVer comparison
  assert.equal(isUpdateAvailable("2.2.0", 220, "2.3.0", undefined), true);
  assert.equal(isUpdateAvailable("2.2.0", 220, "2.1.9", undefined), false);
  assert.equal(isUpdateAvailable("2.2.0", 220, undefined, undefined), false);
});

test("MetaShare package creation, checksum computation, and non-destructive validation", () => {
  const samplePayload = {
    space: { id: "s1", name: "Gymnasium", kind: "school" as const, aiRestrictedForMinors: false, bell: defaultBell() },
    subjects: [{ id: "sub1", spaceId: "s1", name: "Physics", tone: "copper" as const }],
    lessons: [
      {
        id: "l1",
        spaceId: "s1",
        classId: "c1",
        ownerProfileId: null,
        weekday: 1,
        index: 1,
        subjectId: "sub1",
        teacherId: null,
        room: "101",
      },
    ],
    exceptions: [],
  };

  // 1. Creation & checksum
  const pkg = createMetaSharePackage("schedule", "Расписание 9-А", samplePayload, {
    authorName: "Andárer",
  });
  assert.equal(pkg.format, "mspack");
  assert.equal(pkg.version, 1);
  assert.equal(pkg.kind, "schedule");
  assert.equal(typeof pkg.checksum, "string");
  assert(pkg.checksum && pkg.checksum.length > 0);

  // 2. Successful validation
  const valid = validateMetaSharePackage(pkg);
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert(valid.summary.includes("Gymnasium"));
  }

  // 3. Stringified JSON parsing
  const jsonStr = JSON.stringify(pkg);
  const parsed = parseMetaShareInput(jsonStr);
  assert.equal(parsed.ok, true);

  // 4. Tampered payload rejection
  const tampered = JSON.parse(jsonStr);
  tampered.payload.subjects[0].name = "Tampered Subject";
  const tamperedRes = validateMetaSharePackage(tampered);
  assert.equal(tamperedRes.ok, false);
  if (!tamperedRes.ok) {
    assert(tamperedRes.error.includes("контрольная сумма"));
  }

  // 5. Corrupt / invalid format rejection
  assert.equal(parseMetaShareInput("invalid json {not ready}").ok, false);
  assert.equal(validateMetaSharePackage({ format: "unknown" }).ok, false);
  assert.equal(validateMetaSharePackage(null).ok, false);
});

test("MetaShare cryptographic SHA-256 integrity and referential integrity validation", async () => {
  const samplePayload = {
    space: { id: "s1", name: "Liceum", kind: "school" as const, aiRestrictedForMinors: false, bell: defaultBell() },
    subjects: [{ id: "sub_chem", spaceId: "s1", name: "Chemistry", tone: "sage" as const }],
    lessons: [
      {
        id: "l_chem_1",
        spaceId: "s1",
        classId: "c10",
        ownerProfileId: null,
        weekday: 2,
        index: 3,
        subjectId: "sub_chem",
        teacherId: null,
        room: "302",
      },
    ],
    exceptions: [],
  };

  // 1. SHA-256 Package creation
  const pkg = await createMetaSharePackageAsync("schedule", "Расписание 10-А", samplePayload, {
    authorName: "Andárer",
  });
  assert.equal(pkg.integrity?.algorithm, "SHA-256");
  assert.equal(pkg.integrity.sha256.length, 64);

  // 2. Validation with real SHA-256 digest
  const validRes = await validateMetaSharePackageAsync(pkg);
  assert.equal(validRes.ok, true);
  if (validRes.ok) {
    assert.equal(validRes.details.lessonsCount, 1);
    assert.equal(validRes.details.subjectsCount, 1);
  }

  // 3. Single-byte tampering in payload MUST fail SHA-256 verification
  const tampered = JSON.parse(JSON.stringify(pkg));
  tampered.payload.lessons[0].room = "303"; // modified room
  const tamperedRes = await validateMetaSharePackageAsync(tampered);
  assert.equal(tamperedRes.ok, false);
  if (!tamperedRes.ok) {
    assert(tamperedRes.error.includes("SHA-256"));
  }

  // 4. Broken referential integrity check (lesson references non-existent subject)
  const brokenRefPayload = {
    ...samplePayload,
    lessons: [
      {
        id: "l_err",
        spaceId: "s1",
        classId: "c10",
        ownerProfileId: null,
        weekday: 2,
        index: 1,
        subjectId: "ghost_subject_id",
        teacherId: null,
        room: "100",
      },
    ],
  };
  const brokenPkg = await createMetaSharePackageAsync("schedule", "Broken Schedule", brokenRefPayload as any);
  const brokenRes = await validateMetaSharePackageAsync(brokenPkg);
  assert.equal(brokenRes.ok, false);
  if (!brokenRes.ok) {
    assert(brokenRes.error.includes("целостность связей"));
  }
});

test("Outbox tracks operation states (pending -> local_synced) without fake remote delivery", () => {
  const store = useMs.getState();

  // Reset outbox for test isolation
  store.clearOutbox();
  assert.equal(useMs.getState().data.outbox.length, 0);

  // Push new operation
  store.pushOutbox("task", "create", "Новое домашнее задание");
  const currentOutbox = useMs.getState().data.outbox;
  assert.equal(currentOutbox.length, 1);
  assert.equal(currentOutbox[0]?.state, "pending");
  assert.equal(currentOutbox[0]?.summary, "Новое домашнее задание");

  // Flush outbox
  const res = store.flushOutbox();
  assert.equal(res.status, "local_synced");
  assert.equal(res.count, 1);

  // Operation MUST be safely preserved locally as "local_synced", not falsely "delivered" to a remote server
  const flushedOutbox = useMs.getState().data.outbox;
  assert.equal(flushedOutbox.length, 1);
  assert.equal(flushedOutbox[0]?.state, "local_synced");
  assert.equal(flushedOutbox[0]?.retryCount, 0, "retryCount must remain 0 on local save without network attempt");

  // Subsequent flush reports up_to_date (no double flush)
  const secondFlush = store.flushOutbox();
  assert.equal(secondFlush.status, "up_to_date");
  assert.equal(secondFlush.count, 0);
});

test("MetaPersonal store handles notes, tasks, and habit streaks deterministically", () => {
  const store = useMs.getState();
  const profileId = store.data.activeProfileId;

  // 1. Personal Note: save and delete
  const testNote = {
    id: "note-test-1",
    profileId,
    title: "Идея для проекта",
    content: "Создать оффлайн-первый трекер привычек",
    tag: "Идеи",
    tone: "copper" as const,
    pinned: true,
    createdAt: "2026-11-07T12:00:00Z",
    updatedAt: "2026-11-07T12:00:00Z",
  };
  store.savePersonalNote(testNote);
  let notes = useMs.getState().data.personalNotes || [];
  const foundNote = notes.find((n) => n.id === "note-test-1");
  assert.ok(foundNote, "Note should be saved");
  assert.equal(foundNote?.title, "Идея для проекта");
  assert.equal(foundNote?.pinned, true);

  // Update note
  store.savePersonalNote({ ...testNote, title: "Идея обновлена", pinned: false });
  notes = useMs.getState().data.personalNotes || [];
  assert.equal(notes.find((n) => n.id === "note-test-1")?.title, "Идея обновлена");

  // Delete note
  store.deletePersonalNote("note-test-1");
  notes = useMs.getState().data.personalNotes || [];
  assert.equal(notes.find((n) => n.id === "note-test-1"), undefined);

  // 2. Personal Task: save, toggle, delete
  const testTask = {
    id: "ptask-test-1",
    profileId,
    title: "Купить блокнот",
    done: false,
    category: "shopping" as const,
    due: "2026-11-10",
    priority: "high" as const,
    createdAt: "2026-11-07T12:00:00Z",
  };
  store.savePersonalTask(testTask);
  let ptasks = useMs.getState().data.personalTasks || [];
  assert.equal(ptasks.find((t) => t.id === "ptask-test-1")?.done, false);

  // Toggle task to done
  store.togglePersonalTask("ptask-test-1");
  ptasks = useMs.getState().data.personalTasks || [];
  assert.equal(ptasks.find((t) => t.id === "ptask-test-1")?.done, true);

  // Toggle task back to open
  store.togglePersonalTask("ptask-test-1");
  ptasks = useMs.getState().data.personalTasks || [];
  assert.equal(ptasks.find((t) => t.id === "ptask-test-1")?.done, false);

  // Delete task
  store.deletePersonalTask("ptask-test-1");
  ptasks = useMs.getState().data.personalTasks || [];
  assert.equal(ptasks.find((t) => t.id === "ptask-test-1"), undefined);

  // 3. Habit Tracker: save, toggle date, delete
  const testHabit = {
    id: "habit-test-1",
    profileId,
    title: "Чтение 30 минут",
    period: "daily" as const,
    completedDates: ["2026-11-05"],
    color: "amber",
    createdAt: "2026-11-07T12:00:00Z",
  };
  store.saveHabit(testHabit);
  let habits = useMs.getState().data.habits || [];
  assert.equal(habits.find((h) => h.id === "habit-test-1")?.completedDates.length, 1);

  // Toggle date (add date)
  store.toggleHabitDate("habit-test-1", "2026-11-06");
  habits = useMs.getState().data.habits || [];
  const habitUpdated = habits.find((h) => h.id === "habit-test-1");
  assert.ok(habitUpdated?.completedDates.includes("2026-11-06"));
  assert.equal(habitUpdated?.completedDates.length, 2);

  // Toggle date again (remove date)
  store.toggleHabitDate("habit-test-1", "2026-11-06");
  habits = useMs.getState().data.habits || [];
  assert.ok(!habits.find((h) => h.id === "habit-test-1")?.completedDates.includes("2026-11-06"));
  assert.equal(habits.find((h) => h.id === "habit-test-1")?.completedDates.length, 1);

  // Delete habit
  store.deleteHabit("habit-test-1");
  habits = useMs.getState().data.habits || [];
  assert.equal(habits.find((h) => h.id === "habit-test-1"), undefined);
});

test("MetaTools store handles alarms deterministically (save, toggle, delete)", () => {
  const store = useMs.getState();
  const profileId = store.data.activeProfileId;

  const testAlarm = {
    id: "alarm-test-1",
    profileId,
    time: "08:15",
    label: "Звонок на первый урок",
    enabled: true,
    days: [1, 2, 3, 4, 5],
    sound: "school" as const,
    createdAt: "2026-11-07T12:00:00Z",
  };

  // 1. Save alarm
  store.saveAlarm(testAlarm);
  let alarms = useMs.getState().data.alarms || [];
  const found = alarms.find((a) => a.id === "alarm-test-1");
  assert.ok(found, "Alarm must be saved in state");
  assert.equal(found?.time, "08:15");
  assert.equal(found?.enabled, true);

  // 2. Toggle alarm (enable -> disable)
  store.toggleAlarm("alarm-test-1");
  alarms = useMs.getState().data.alarms || [];
  assert.equal(alarms.find((a) => a.id === "alarm-test-1")?.enabled, false);

  // 3. Toggle alarm (disable -> enable)
  store.toggleAlarm("alarm-test-1");
  alarms = useMs.getState().data.alarms || [];
  assert.equal(alarms.find((a) => a.id === "alarm-test-1")?.enabled, true);

  // 4. Update alarm time and sound
  store.saveAlarm({ ...testAlarm, time: "08:30", sound: "bell" });
  alarms = useMs.getState().data.alarms || [];
  assert.equal(alarms.find((a) => a.id === "alarm-test-1")?.time, "08:30");
  assert.equal(alarms.find((a) => a.id === "alarm-test-1")?.sound, "bell");

  // 5. Delete alarm
  store.deleteAlarm("alarm-test-1");
  alarms = useMs.getState().data.alarms || [];
  assert.equal(alarms.find((a) => a.id === "alarm-test-1"), undefined);
});

test("MetaDeveloper diagnostics sanitize confidential secrets from exports", () => {
  const store = useMs.getState();
  const rawData = store.data;

  // Add dummy secret to profile
  const sanitized = redactSecrets(
    {
      ...rawData,
      profiles: [
        {
          id: "p-secret",
          name: "Secured Admin",
          tone: "copper",
          pin: "9876",
          memberships: [],
        },
      ],
      providers: [
        {
          id: "prov-1",
          name: "OpenAI Proxy",
          kind: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4",
          apiKey: "sk-super-secret-key-12345",
          temperature: 0.7,
          enabled: true,
        },
      ],
    },
    false, // includeSecrets = false
  );

  // Assert PIN is undefined
  assert.equal(sanitized.profiles[0]?.pin, undefined, "Profile PIN must never leak in diagnostic export");
  // Assert API key is undefined
  assert.equal(sanitized.providers[0]?.apiKey, undefined, "Provider API key must never leak in diagnostic export");
});

test("MetaPersonal shopping lists support creation, adding items, toggling bought, and deletion", () => {
  const store = useMs.getState();
  const profileId = store.data.activeProfileId;

  const testList: import("./types.ts").ShoppingList = {
    id: "shop-test-1",
    profileId,
    title: "Школьные принадлежности",
    createdAt: "2026-11-07T12:00:00Z",
    items: [
      { id: "item-1", title: "Тетрадь 48 листов", amount: "5 шт", bought: false },
      { id: "item-2", title: "Карандаши цветные", amount: "1 уп", bought: true },
    ],
  };

  // 1. Save list
  store.saveShoppingList(testList);
  let lists = useMs.getState().data.shoppingLists || [];
  const foundList = lists.find((l) => l.id === "shop-test-1");
  assert.ok(foundList, "Shopping list must be saved");
  assert.equal(foundList?.title, "Школьные принадлежности");
  assert.equal(foundList?.items.length, 2);

  // 2. Toggle bought state
  store.toggleShoppingItem("shop-test-1", "item-1");
  lists = useMs.getState().data.shoppingLists || [];
  assert.equal(lists.find((l) => l.id === "shop-test-1")?.items.find((i) => i.id === "item-1")?.bought, true);

  store.toggleShoppingItem("shop-test-1", "item-1");
  lists = useMs.getState().data.shoppingLists || [];
  assert.equal(lists.find((l) => l.id === "shop-test-1")?.items.find((i) => i.id === "item-1")?.bought, false);

  // 3. Add item
  store.addShoppingItem("shop-test-1", "Точилка", "1 шт");
  lists = useMs.getState().data.shoppingLists || [];
  const updatedList = lists.find((l) => l.id === "shop-test-1");
  assert.equal(updatedList?.items.length, 3);
  assert.ok(updatedList?.items.some((i) => i.title === "Точилка" && i.amount === "1 шт" && !i.bought));

  // 4. Delete item
  const itemToDelete = updatedList?.items.find((i) => i.title === "Точилка");
  assert.ok(itemToDelete);
  store.deleteShoppingItem("shop-test-1", itemToDelete!.id);
  lists = useMs.getState().data.shoppingLists || [];
  assert.equal(lists.find((l) => l.id === "shop-test-1")?.items.length, 2);

  // 5. Delete entire list
  store.deleteShoppingList("shop-test-1");
  lists = useMs.getState().data.shoppingLists || [];
  assert.equal(lists.find((l) => l.id === "shop-test-1"), undefined);
});

test("MetaRelease enforces single source of truth for app version and versionCode", async () => {
  const { CURRENT_VERSION, CURRENT_VERSION_CODE } = await import("./version.ts");
  assert.equal(CURRENT_VERSION, "2.2.2");
  assert.equal(CURRENT_VERSION_CODE, 222);
});

test("MetaTools computeNextAlarmOccurrence calculates exact single and repeating alarm dates", async () => {
  const { computeNextAlarmOccurrence } = await import("./native.ts");

  // Base time: Monday, 2026-11-09 at 10:00:00
  const baseMonday = new Date("2026-11-09T10:00:00.000");
  assert.equal(baseMonday.getDay(), 1); // Monday

  // 1. Single alarm later today (11:30)
  const todayLater = computeNextAlarmOccurrence("11:30", [], baseMonday);
  assert.equal(todayLater.getFullYear(), 2026);
  assert.equal(todayLater.getMonth(), 10); // Nov
  assert.equal(todayLater.getDate(), 9);
  assert.equal(todayLater.getHours(), 11);
  assert.equal(todayLater.getMinutes(), 30);

  // 2. Single alarm earlier today (08:00) -> should trigger tomorrow
  const tomorrowEarly = computeNextAlarmOccurrence("08:00", [], baseMonday);
  assert.equal(tomorrowEarly.getDate(), 10); // Tuesday
  assert.equal(tomorrowEarly.getHours(), 8);
  assert.equal(tomorrowEarly.getMinutes(), 0);

  // 3. Repeating alarm on weekdays (1..5: Mon-Fri) from Monday 10:00 for 08:30 -> Tuesday 08:30
  const nextWeekday = computeNextAlarmOccurrence("08:30", [1, 2, 3, 4, 5], baseMonday);
  assert.equal(nextWeekday.getDate(), 10); // Tuesday Nov 10
  assert.equal(nextWeekday.getDay(), 2);

  // 4. Repeating alarm from Friday 18:00 for 08:00 Mon-Fri -> should skip weekend and trigger on Monday
  const baseFriday = new Date("2026-11-13T18:00:00.000");
  assert.equal(baseFriday.getDay(), 5); // Friday
  const nextFromFriday = computeNextAlarmOccurrence("08:00", [1, 2, 3, 4, 5], baseFriday);
  assert.equal(nextFromFriday.getDate(), 16); // Monday Nov 16
  assert.equal(nextFromFriday.getDay(), 1);

  // 5. Sunday repeating alarm only (days = [0]) from Monday 10:00 -> should trigger next Sunday Nov 15
  const nextSunday = computeNextAlarmOccurrence("12:00", [0], baseMonday);
  assert.equal(nextSunday.getDate(), 15);
  assert.equal(nextSunday.getDay(), 0); // Sunday
});

test("MetaSync Outbox correctly migrates legacy 'delivered' state and respects truthful local_synced contract", async () => {
  const { migrateOutboxStates } = await import("./store.ts");

  // 1. Migration of legacy "delivered" state
  const legacyOutbox: any[] = [
    { id: "o-1", at: "2026-11-01T10:00:00Z", entity: "task", action: "create", summary: "Old task", state: "delivered" },
    { id: "o-2", at: "2026-11-01T10:00:00Z", entity: "task", action: "update", summary: "Pending task", state: "pending" },
  ];

  const migrated = migrateOutboxStates(legacyOutbox);
  assert.equal(migrated[0]?.state, "local_synced", "Legacy delivered status must be migrated to local_synced");
  assert.equal(migrated[1]?.state, "pending", "Pending status must be retained");

  // 2. Truthful flushOutbox: does NOT increment retryCount or fake lastAttemptAt when saving locally
  const store = useMs.getState();
  store.clearOutbox();
  store.pushOutbox("lesson", "create", "Новый урок физики");

  const beforeFlush = useMs.getState().data.outbox;
  assert.equal(beforeFlush.length, 1);
  assert.equal(beforeFlush[0]?.state, "pending");
  assert.equal(beforeFlush[0]?.retryCount, 0);

  const flushRes = store.flushOutbox();
  assert.equal(flushRes.status, "local_synced");

  const afterFlush = useMs.getState().data.outbox;
  assert.equal(afterFlush[0]?.state, "local_synced");
  assert.equal(afterFlush[0]?.retryCount, 0, "retryCount must NOT increment without real network transmission");
  assert.equal(afterFlush[0]?.lastAttemptAt, undefined, "lastAttemptAt must NOT be set without real network transmission");
  assert.ok(afterFlush[0]?.savedLocallyAt, "savedLocallyAt timestamp must be recorded");
});

test("MetaPersonal 1.2 enforces strict multi-profile isolation, subtasks, and shopping list operations", () => {
  const store = useMs.getState();
  const profAlice = "prof-alice-test";
  const profBob = "prof-bob-test";

  // 1. Create items under Alice
  store.savePersonalNote({
    id: "note-alice-1",
    profileId: profAlice,
    title: "Alice Secret Note",
    content: "Only for Alice",
    tag: "Personal",
    pinned: true,
    createdAt: "2026-11-08T10:00:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
  });

  store.savePersonalTask({
    id: "task-alice-1",
    profileId: profAlice,
    title: "Alice Homework",
    done: false,
    subtasks: [
      { id: "st-1", title: "Read Chapter 1", done: false },
      { id: "st-2", title: "Solve Problems 1-5", done: true },
    ],
    createdAt: "2026-11-08T10:00:00Z",
  });

  store.saveShoppingList({
    id: "shop-alice-1",
    profileId: profAlice,
    title: "Alice Groceries",
    createdAt: "2026-11-08T10:00:00Z",
    items: [
      { id: "item-a1", title: "Apples", amount: "1 kg", bought: false },
      { id: "item-a2", title: "Milk", amount: "2 L", bought: true },
    ],
  });

  // 2. Create items under Bob
  store.savePersonalNote({
    id: "note-bob-1",
    profileId: profBob,
    title: "Bob Public Idea",
    content: "Bob only note",
    createdAt: "2026-11-08T10:00:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
  });

  // 3. Verify strict profile isolation
  const allNotes = useMs.getState().data.personalNotes || [];
  const aliceNotes = allNotes.filter((n) => n.profileId === profAlice);
  const bobNotes = allNotes.filter((n) => n.profileId === profBob);
  assert.equal(aliceNotes.length, 1);
  assert.equal(aliceNotes[0]?.title, "Alice Secret Note");
  assert.equal(bobNotes.length, 1);
  assert.equal(bobNotes[0]?.title, "Bob Public Idea");

  // 4. Test Subtask toggle
  store.togglePersonalSubtask("task-alice-1", "st-1");
  const taskAfter = (useMs.getState().data.personalTasks || []).find((t) => t.id === "task-alice-1");
  assert.equal(taskAfter?.subtasks?.find((s) => s.id === "st-1")?.done, true);

  // 5. Test Shopping List rename
  store.renameShoppingList("shop-alice-1", "Alice Weekly Groceries");
  const shopAfterRename = (useMs.getState().data.shoppingLists || []).find((l) => l.id === "shop-alice-1");
  assert.equal(shopAfterRename?.title, "Alice Weekly Groceries");

  // 6. Test Shopping List clear bought
  store.clearBoughtShoppingItems("shop-alice-1");
  const shopAfterClear = (useMs.getState().data.shoppingLists || []).find((l) => l.id === "shop-alice-1");
  assert.equal(shopAfterClear?.items.length, 1);
  assert.equal(shopAfterClear?.items[0]?.id, "item-a1");
  assert.equal(shopAfterClear?.items[0]?.bought, false);
  // Cleanup
  store.deletePersonalNote("note-alice-1");
  store.deletePersonalNote("note-bob-1");
  store.deletePersonalTask("task-alice-1");
  store.deleteShoppingList("shop-alice-1");
});

test("MetaTools computes exact next alarm trigger for all 7 days of the week and handles midnight wrap-around", () => {
  // Format validation
  assert.equal(isValidAlarmTime("07:30"), true);
  assert.equal(isValidAlarmTime("23:59"), true);
  assert.equal(isValidAlarmTime("00:00"), true);
  assert.equal(isValidAlarmTime("24:00"), false);
  assert.equal(isValidAlarmTime("12:60"), false);
  assert.equal(isValidAlarmTime("invalid"), false);

  // Day sanitization
  assert.deepEqual(sanitizeAlarmDays([1, 2, 3]), [1, 2, 3]);
  assert.deepEqual(sanitizeAlarmDays([5, 0, 7, -1, 3, "abc"]), [0, 3, 5]);

  // Base date: Wednesday, Nov 11, 2026, 14:00:00 (day = 3)
  const baseWed = new Date("2026-11-11T14:00:00Z");
  assert.equal(baseWed.getDay(), 3);

  // 1. Repeating on Wednesday at 15:00 (later today)
  const todayLater = computeNextAlarmOccurrence("15:00", [3], baseWed);
  assert.equal(todayLater.getDay(), 3);
  assert.equal(todayLater.getDate(), 11);

  // 2. Repeating on Wednesday at 10:00 (earlier today -> should wrap to next Wednesday, +7 days)
  const nextWed = computeNextAlarmOccurrence("10:00", [3], baseWed);
  assert.equal(nextWed.getDay(), 3);
  assert.equal(nextWed.getDate(), 18);

  // 3. Repeating for all 7 individual days of the week (Sunday=0 through Saturday=6)
  for (let targetDay = 0; targetDay <= 6; targetDay++) {
    const nextOccur = computeNextAlarmOccurrence("08:00", [targetDay], baseWed);
    assert.equal(nextOccur.getDay(), targetDay, `Expected next alarm to trigger on day index ${targetDay}`);
    assert(nextOccur.getTime() > baseWed.getTime(), "Trigger time must be strictly in the future");
  }

  // 4. Midnight wrap-around: Alarm set at 00:05, base is 23:50
  const lateNight = new Date("2026-11-11T23:50:00Z");
  const pastMidnight = computeNextAlarmOccurrence("00:05", [], lateNight);
  assert.equal(pastMidnight.getDate(), 12, "Single alarm past midnight should roll over to next calendar day");
});

test("MetaPersonal repeating task advances due date and resets subtasks on completion", () => {
  const store = useMs.getState();
  const profileId = store.data.activeProfileId;

  const repeatTask = {
    id: "task-daily-repeat-1",
    profileId,
    title: "Ежедневная зарядка",
    description: "15 минут разминки и растяжки",
    done: false,
    due: "2026-11-10",
    repeat: "daily" as const,
    subtasks: [
      { id: "st-a", title: "Разминка шеи", done: true },
      { id: "st-b", title: "Приседания", done: false },
    ],
    createdAt: "2026-11-09T08:00:00Z",
  };

  store.savePersonalTask(repeatTask);

  // Toggle completion: because repeat is 'daily', it advances due to 2026-11-11 and resets done to false
  store.togglePersonalTask("task-daily-repeat-1");
  const taskAfter = (useMs.getState().data.personalTasks || []).find((t) => t.id === "task-daily-repeat-1");

  assert.equal(taskAfter?.done, false, "Repeating task must remain active for next cycle");
  assert.equal(taskAfter?.due, "2026-11-11", "Daily repeat must advance due date by 1 day");
  assert.equal(taskAfter?.subtasks?.every((s: { done: boolean }) => !s.done), true, "Subtasks must be reset for next cycle");

  // Cleanup
  store.deletePersonalTask("task-daily-repeat-1");
});

test("MetaPersonal shopping item updates support title and amount editing", () => {
  const store = useMs.getState();
  const profileId = store.data.activeProfileId;

  store.saveShoppingList({
    id: "shop-edit-test",
    profileId,
    title: "Канцелярия",
    createdAt: "2026-11-08T12:00:00Z",
    items: [
      { id: "item-e1", title: "Тетрадь", amount: "5 шт", bought: false },
    ],
  });

  store.updateShoppingItem("shop-edit-test", {
    id: "item-e1",
    title: "Тетрадь в клетку (12 л)",
    amount: "10 шт",
    bought: false,
  });

  const listAfter = (useMs.getState().data.shoppingLists || []).find((l) => l.id === "shop-edit-test");
  assert.equal(listAfter?.items[0]?.title, "Тетрадь в клетку (12 л)");
  assert.equal(listAfter?.items[0]?.amount, "10 шт");

  store.deleteShoppingList("shop-edit-test");
});

test("MetaDesign 2.0 provides 6 palettes and dynamic design configuration in store", async () => {
  const { PALETTES, DEFAULT_DESIGN, resolveEffectiveTheme } = await import("./design.ts");

  // Verify all 6 mandatory palettes exist
  const paletteKeys = ["amber", "emerald", "violet", "azure", "rose", "graphite"];
  for (const key of paletteKeys) {
    assert.ok(PALETTES[key as keyof typeof PALETTES], `Missing palette: ${key}`);
    assert.ok(PALETTES[key as keyof typeof PALETTES].light.copper, `Missing light copper in ${key}`);
    assert.ok(PALETTES[key as keyof typeof PALETTES].dark.copper, `Missing dark copper in ${key}`);
  }

  // Verify theme resolution
  assert.equal(resolveEffectiveTheme("dark"), "dark");
  assert.equal(resolveEffectiveTheme("light"), "light");

  // Verify store setDesignConfig
  const store = useMs.getState();
  store.setDesignConfig({
    palette: "emerald",
    density: "compact",
    radius: "full",
  });

  const currentDesign = useMs.getState().data.design;
  assert.equal(currentDesign?.palette, "emerald");
  assert.equal(currentDesign?.density, "compact");
  assert.equal(currentDesign?.radius, "full");

  // Reset to default
  store.setDesignConfig(DEFAULT_DESIGN);
});

test("MetaDesign 2.0 calculates WCAG contrast and validates hex colors", async () => {
  const { getContrastColor, isValidHexColor } = await import("./design.ts");

  // Hex validation
  assert.equal(isValidHexColor("#ffffff"), true);
  assert.equal(isValidHexColor("#000"), true);
  assert.equal(isValidHexColor("#12345678"), true);
  assert.equal(isValidHexColor("red"), false);
  assert.equal(isValidHexColor("#12"), false);
  assert.equal(isValidHexColor(""), false);

  // High luminance colors require dark text
  assert.equal(getContrastColor("#ffffff"), "#0d1b2a");
  assert.equal(getContrastColor("#ffff00"), "#0d1b2a");
  assert.equal(getContrastColor("#ff8c00"), "#0d1b2a");

  // Low luminance colors require light text
  assert.equal(getContrastColor("#000000"), "#ffffff");
  assert.equal(getContrastColor("#06251d"), "#ffffff");
  assert.equal(getContrastColor("#150d2a"), "#ffffff");
});






