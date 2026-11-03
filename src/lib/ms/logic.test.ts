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
