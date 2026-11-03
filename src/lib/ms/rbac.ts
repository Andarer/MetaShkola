import type {
  Action,
  CalEvent,
  CustomRole,
  Data,
  Grade,
  Homework,
  Membership,
  Profile,
} from "./types.ts";
import { ACTIONS, ROLE_KEYS, type RoleKey } from "./types.ts";

const ALL = Object.fromEntries(ACTIONS.map((action) => [action, true])) as Record<Action, boolean>;
const NONE = Object.fromEntries(ACTIONS.map((action) => [action, false])) as Record<Action, boolean>;

function flags(partial: Partial<Record<Action, boolean>>): Record<Action, boolean> {
  return { ...NONE, ...partial };
}

export const ROLE_GRANTS: Record<RoleKey, Record<Action, boolean>> = {
  creator: ALL,
  sysadmin: ALL,
  orgAdmin: ALL,
  familyAdmin: ALL,
  parent: flags({ view: true, create: true, export: true, ai: true, reports: true }),
  teacher: flags({
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    schedule: true,
    tasks: true,
    grades: true,
    ai: true,
    reports: true,
  }),
  homeroom: flags({
    view: true,
    create: true,
    edit: true,
    delete: true,
    export: true,
    members: true,
    schedule: true,
    tasks: true,
    grades: true,
    ai: true,
    reports: true,
  }),
  student: flags({ view: true, ai: true }),
  guest: flags({ view: true }),
};

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export function grantsFor(
  roleKeys: string[],
  customRoles: CustomRole[],
  overrides?: Partial<Record<Action, boolean>>,
): Record<Action, boolean> {
  const acc = { ...NONE };
  for (const key of roleKeys) {
    const source = isRoleKey(key) ? ROLE_GRANTS[key] : customRoles.find((role) => role.id === key)?.grants;
    if (!source) continue;
    for (const action of ACTIONS) {
      if (source[action]) acc[action] = true;
    }
  }
  if (overrides) {
    for (const action of ACTIONS) {
      if (overrides[action] !== undefined) acc[action] = Boolean(overrides[action]);
    }
  }
  return acc;
}

export function membershipOf(profile: Profile | undefined, spaceId: string): Membership | undefined {
  return profile?.memberships.find((item) => item.spaceId === spaceId);
}

export function canInSpace(
  profile: Profile | undefined,
  spaceId: string,
  action: Action,
  customRoles: CustomRole[],
): boolean {
  const membership = membershipOf(profile, spaceId);
  if (!membership) return false;
  return grantsFor(membership.roleKeys, customRoles, membership.grants)[action];
}

export function isAdmin(membership: Membership | undefined): boolean {
  if (!membership) return false;
  return membership.roleKeys.some((key) =>
    key === "creator" || key === "sysadmin" || key === "orgAdmin" || key === "familyAdmin",
  );
}

export function canExportAll(profile: Profile | undefined, spaceId: string): boolean {
  return isAdmin(membershipOf(profile, spaceId));
}

export function canSeeTask(data: Data, profile: Profile | undefined, task: Homework): boolean {
  const membership = membershipOf(profile, task.spaceId);
  if (!profile || !membership) return false;
  if (!grantsFor(membership.roleKeys, data.customRoles, membership.grants).view) return false;
  if (isAdmin(membership) || membership.roleKeys.includes("teacher") || membership.roleKeys.includes("homeroom")) {
    return true;
  }
  if (task.assigneeId === profile.id) return true;
  return Boolean(membership.childIds?.includes(task.assigneeId));
}

export function canSeeGrade(data: Data, profile: Profile | undefined, grade: Grade): boolean {
  const membership = membershipOf(profile, grade.spaceId);
  if (!profile || !membership) return false;
  if (membership.roleKeys.includes("guest")) return false;
  if (!grantsFor(membership.roleKeys, data.customRoles, membership.grants).view) return false;
  if (isAdmin(membership) || membership.roleKeys.includes("teacher") || membership.roleKeys.includes("homeroom")) {
    return true;
  }
  if (grade.studentId === profile.id) return true;
  return Boolean(membership.childIds?.includes(grade.studentId));
}

export function canSeeEvent(data: Data, profile: Profile | undefined, event: CalEvent): boolean {
  const membership = membershipOf(profile, event.spaceId);
  if (!profile || !membership) return false;
  if (!grantsFor(membership.roleKeys, data.customRoles, membership.grants).view) return false;
  if (isAdmin(membership)) return true;
  if (event.profileId) {
    if (event.profileId === profile.id) return true;
    return Boolean(membership.childIds?.includes(event.profileId));
  }
  if (event.classId) {
    if (membership.classId === event.classId) return true;
    if (membership.roleKeys.includes("teacher") || membership.roleKeys.includes("homeroom")) return true;
    return (membership.childIds ?? []).some((childId) =>
      data.profiles.some(
        (child) => child.id === childId && child.memberships.some((item) => item.classId === event.classId),
      ),
    );
  }
  return !membership.roleKeys.includes("guest") || event.kind !== "personal";
}

export function aiAllowed(data: Data, profile: Profile | undefined, spaceId: string): boolean {
  if (!profile) return false;
  if (!canInSpace(profile, spaceId, "ai", data.customRoles)) return false;
  const space = data.spaces.find((item) => item.id === spaceId);
  const membership = membershipOf(profile, spaceId);
  if (space?.aiRestrictedForMinors && membership?.roleKeys.includes("student")) return false;
  return true;
}

export function canCreateSpace(profile: Profile | undefined, kind: "family" | "personal" | "school"): boolean {
  if (!profile) return false;
  const admin =
    Boolean(profile.isProjectCreator) ||
    profile.memberships.some((membership) =>
      membership.roleKeys.some(
        (key) => key === "creator" || key === "sysadmin" || key === "orgAdmin" || key === "familyAdmin",
      ),
    );
  if (kind !== "personal") return admin;
  return admin || profile.memberships.some((membership) => membership.roleKeys.some((key) => key !== "guest"));
}

export function blankGrants(): Record<Action, boolean> {
  return { ...NONE };
}
