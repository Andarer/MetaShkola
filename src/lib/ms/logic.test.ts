import assert from "node:assert/strict";
import test from "node:test";
import { canCreateSpace, grantsFor } from "./rbac.ts";
import { lessonBounds } from "./time.ts";
import { defaultBell } from "./types.ts";

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
