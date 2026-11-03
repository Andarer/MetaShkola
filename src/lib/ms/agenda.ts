import type { Data, Profile } from "@/lib/ms/types";

export type WatchGroup = {
  id: string;
  label: string;
  spaceId: string;
  classId: string | null;
  ownerProfileId: string | null;
  teacherId: string | null;
};

export function watchGroups(data: Data, profile: Profile | undefined): WatchGroup[] {
  if (!profile) return [];
  const groups: WatchGroup[] = [];
  const push = (group: WatchGroup) => {
    if (!groups.some((item) => item.id === group.id)) groups.push(group);
  };

  for (const membership of profile.memberships) {
    const roles = new Set(membership.roleKeys);
    if (membership.classId && (roles.has("student") || roles.has("homeroom"))) {
      const room = data.classes.find((item) => item.id === membership.classId);
      push({
        id: `class:${membership.classId}`,
        label: room?.name ?? membership.classId,
        spaceId: membership.spaceId,
        classId: membership.classId,
        ownerProfileId: null,
        teacherId: null,
      });
    }
    if (roles.has("teacher") || roles.has("homeroom")) {
      push({
        id: `teach:${profile.id}:${membership.spaceId}`,
        label: profile.name,
        spaceId: membership.spaceId,
        classId: null,
        ownerProfileId: null,
        teacherId: profile.id,
      });
    }
    if (roles.has("parent")) {
      for (const childId of membership.childIds ?? []) {
        const child = data.profiles.find((item) => item.id === childId);
        const classMembership = child?.memberships.find((item) => item.classId);
        if (!classMembership?.classId) continue;
        const room = data.classes.find((item) => item.id === classMembership.classId);
        push({
          id: `child:${childId}`,
          label: child?.name ?? childId,
          spaceId: classMembership.spaceId,
          classId: classMembership.classId,
          ownerProfileId: null,
          teacherId: null,
        });
      }
    }
  }

  if (groups.length === 0) {
    for (const room of data.classes.filter((item) => item.spaceId === data.activeSpaceId)) {
      push({
        id: `class:${room.id}`,
        label: room.name,
        spaceId: room.spaceId,
        classId: room.id,
        ownerProfileId: null,
        teacherId: null,
      });
    }
  }

  const personal = data.lessons.some((lesson) => lesson.ownerProfileId === profile.id && !lesson.classId);
  if (personal) {
    push({
      id: `me:${profile.id}`,
      label: profile.name,
      spaceId: data.activeSpaceId,
      classId: null,
      ownerProfileId: profile.id,
      teacherId: null,
    });
  }
  return groups;
}
