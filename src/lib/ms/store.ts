import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/ms/id";
import { canCreateSpace, canInSpace } from "@/lib/ms/rbac";
import { demoData, emptyData, shellData } from "@/lib/ms/seed";
import { defaultBell } from "@/lib/ms/types";
import type {
  AiProvider,
  Assistant,
  Audit,
  Bell,
  CalEvent,
  ClassRoom,
  CustomRole,
  Data,
  Grade,
  Homework,
  Integration,
  Lang,
  Lesson,
  OutboxItem,
  Profile,
  ScheduleException,
  Space,
  SpaceKind,
  StudyGroup,
  Subject,
  SyncRule,
  TaskStatus,
  Theme,
} from "@/lib/ms/types";

type EmptyInput = { name: string; spaceName: string; kind: SpaceKind; lang: Lang };

type MsState = {
  bootstrapped: boolean;
  data: Data;
  openDemo: () => void;
  openEmpty: (input: EmptyInput) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setActiveProfile: (id: string) => void;
  setActiveSpace: (id: string) => void;
  setPin: (profileId: string, pin: string | undefined) => void;
  saveProfile: (profile: Profile) => void;
  removeProfile: (id: string) => void;
  saveSpace: (space: Space) => void;
  createSpace: (input: { name: string; kind: SpaceKind }) => void;
  joinProfile: (profileId: string, roleKeys: string[], classId?: string) => void;
  updateBell: (spaceId: string, bell: Bell) => void;
  setMinorAi: (spaceId: string, restricted: boolean) => void;
  saveOrgName: (orgId: string, name: string) => void;
  addDivision: (orgId: string, name: string) => void;
  saveClass: (room: ClassRoom) => void;
  removeClass: (id: string) => void;
  saveGroup: (group: StudyGroup) => void;
  removeGroup: (id: string) => void;
  saveSubject: (subject: Subject) => void;
  removeSubject: (id: string) => void;
  addPeriod: (orgId: string, name: string, start: string, end: string) => void;
  saveLesson: (lesson: Lesson) => void;
  deleteLesson: (id: string) => void;
  copyDay: (from: Lesson, weekdays: number[]) => void;
  saveException: (item: ScheduleException) => void;
  removeException: (id: string) => void;
  saveTask: (task: Homework) => void;
  setTaskStatus: (id: string, status: TaskStatus, actorId: string) => void;
  addComment: (taskId: string, authorId: string, text: string) => void;
  removeTask: (id: string) => void;
  saveGrade: (grade: Grade) => void;
  removeGrade: (id: string) => void;
  saveEvent: (event: CalEvent) => void;
  removeEvent: (id: string) => void;
  saveProvider: (provider: AiProvider) => void;
  removeProvider: (id: string) => void;
  saveAssistant: (assistant: Assistant) => void;
  removeAssistant: (id: string) => void;
  startChat: (assistantId: string, providerId: string) => string;
  appendChat: (chatId: string, message: ChatMessageInput) => void;
  addUsage: (providerId: string, model: string, promptTokens: number, completionTokens: number) => void;
  saveIntegration: (item: Integration) => void;
  removeIntegration: (id: string) => void;
  saveRule: (rule: SyncRule) => void;
  removeRule: (id: string) => void;
  logSync: (text: string, ok: boolean, ruleId?: string) => void;
  pushInbox: (title: string, body: string, dedupeKey: string) => void;
  markInboxRead: () => void;
  setNotif: (key: keyof Data["notif"], value: boolean) => void;
  saveCustomRole: (role: CustomRole) => void;
  removeCustomRole: (id: string) => void;
    pushOutbox: (entity: OutboxItem["entity"], action: OutboxItem["action"], summary: string) => void;
  flushOutbox: () => { count: number; status: "up_to_date" | "offline_pending" | "local_synced" };
  clearOutbox: () => void;
  importData: (raw: unknown, mode: "replace" | "merge") => { ok: boolean; error?: string };
  resetAll: () => void;
  // MetaCommunity actions
  addPost: (post: Omit<import("@/lib/ms/types").CommunityPost, "id" | "createdAt" | "reactions" | "commentsCount" | "comments">) => void;
  deletePost: (id: string) => void;
  toggleReaction: (postId: string, profileId: string, type: import("@/lib/ms/types").PostReaction["type"]) => void;
  addPostComment: (postId: string, authorId: string, authorName: string, authorTone: import("@/lib/ms/types").AvatarTone, text: string) => void;
  deletePostComment: (postId: string, commentId: string) => void;
  saveCommunityGroup: (group: import("@/lib/ms/types").CommunityGroup) => void;
  joinCommunityGroup: (groupId: string, profileId: string) => void;
  leaveCommunityGroup: (groupId: string, profileId: string) => void;
  reportContent: (targetType: "post" | "comment" | "user", targetId: string, reporterId: string, reason: string) => void;
  // Update Center actions
  setUpdateChannel: (channel: "stable" | "beta" | "debug") => void;
  dismissUpdate: (version: string) => void;
};

type ChatMessageInput = {
  role: "user" | "assistant";
  content: string;
  providerId?: string;
};

function withAudit(data: Data, text: string): Data {
  const entry: Audit = {
    id: uid(),
    at: new Date().toISOString(),
    profileId: data.activeProfileId,
    text,
  };
  return { ...data, audit: [entry, ...data.audit].slice(0, 200) };
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((row) => row.id === item.id);
  if (index === -1) return [item, ...list];
  const next = list.slice();
  next[index] = item;
  return next;
}

function isData(value: unknown): value is Data {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Data>;
  return row.version === 1 && Array.isArray(row.profiles) && Array.isArray(row.spaces);
}

const seenInbox = new Set<string>();

export const useMs = create<MsState>()(
  persist(
    (set, get) => ({
      bootstrapped: false,
      data: shellData(),
      openDemo: () => set({ bootstrapped: true, data: demoData() }),
      openEmpty: (input) => set({ bootstrapped: true, data: emptyData(input) }),
      setLang: (lang) => set((s) => ({ data: { ...s.data, lang } })),
      setTheme: (theme) => set((s) => ({ data: { ...s.data, theme } })),
      setActiveProfile: (id) =>
        set((s) => {
          const profile = s.data.profiles.find((item) => item.id === id);
          if (!profile) return s;
          const spaceOk = profile.memberships.some((item) => item.spaceId === s.data.activeSpaceId);
          const activeSpaceId = spaceOk ? s.data.activeSpaceId : (profile.memberships[0]?.spaceId ?? s.data.activeSpaceId);
          return { data: withAudit({ ...s.data, activeProfileId: id, activeSpaceId }, `Профиль: ${profile.name}`) };
        }),
      setActiveSpace: (id) =>
        set((s) => {
          const profile = s.data.profiles.find((item) => item.id === s.data.activeProfileId);
          if (profile && !profile.memberships.some((item) => item.spaceId === id)) return s;
          return { data: { ...s.data, activeSpaceId: id } };
        }),
      setPin: (profileId, pin) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              profiles: s.data.profiles.map((item) =>
                item.id === profileId ? { ...item, pin: pin || undefined } : item,
              ),
            },
            pin ? "PIN профиля обновлён" : "PIN профиля снят",
          ),
        })),
      saveProfile: (profile) =>
        set((s) => ({
          data: withAudit({ ...s.data, profiles: upsert(s.data.profiles, profile) }, `Профиль сохранён: ${profile.name}`),
        })),
      removeProfile: (id) =>
        set((s) => {
          const profile = s.data.profiles.find((item) => item.id === id);
          if (!profile || profile.isProjectCreator) return s;
          const profiles = s.data.profiles.filter((item) => item.id !== id);
          const activeProfileId = s.data.activeProfileId === id ? (profiles[0]?.id ?? "") : s.data.activeProfileId;
          return { data: withAudit({ ...s.data, profiles, activeProfileId }, `Профиль удалён: ${profile.name}`) };
        }),
      saveSpace: (space) =>
        set((s) => ({ data: withAudit({ ...s.data, spaces: upsert(s.data.spaces, space) }, `Пространство: ${space.name}`) })),
      createSpace: (input) =>
        set((s) => {
          const profile = s.data.profiles.find((item) => item.id === s.data.activeProfileId);
          if (!profile || !canCreateSpace(profile, input.kind)) return s;
          const spaceId = uid();
          const name = input.name.trim() || "Пространство";
          const roleKeys = new Set<string>();
          if (profile.isProjectCreator) roleKeys.add("creator");
          if (input.kind === "school") roleKeys.add("orgAdmin");
          else if (input.kind === "family") {
            roleKeys.add("familyAdmin");
            roleKeys.add("parent");
          } else roleKeys.add("teacher");
          const space: Space = {
            id: spaceId,
            kind: input.kind,
            name,
            aiRestrictedForMinors: false,
            bell: defaultBell(),
          };
          return {
            data: withAudit(
              {
                ...s.data,
                activeSpaceId: spaceId,
                spaces: [space, ...s.data.spaces],
                orgs:
                  input.kind === "school"
                    ? [{ id: uid(), spaceId, name }, ...s.data.orgs]
                    : s.data.orgs,
                profiles: s.data.profiles.map((item) =>
                  item.id === profile.id
                    ? { ...item, memberships: [...item.memberships, { spaceId, roleKeys: [...roleKeys] }] }
                    : item,
                ),
              },
              `Пространство создано: ${name}`,
            ),
          };
        }),
      joinProfile: (profileId, roleKeys, classId) =>
        set((s) => {
          const actor = s.data.profiles.find((item) => item.id === s.data.activeProfileId);
          const target = s.data.profiles.find((item) => item.id === profileId);
          if (!actor || !target || !canInSpace(actor, s.data.activeSpaceId, "members", s.data.customRoles)) return s;
          if (target.memberships.some((item) => item.spaceId === s.data.activeSpaceId)) return s;
          const keys = roleKeys.filter(Boolean);
          if (keys.length === 0) return s;
          return {
            data: withAudit(
              {
                ...s.data,
                profiles: s.data.profiles.map((item) =>
                  item.id === profileId
                    ? {
                        ...item,
                        memberships: [
                          ...item.memberships,
                          { spaceId: s.data.activeSpaceId, roleKeys: keys, classId: classId || undefined },
                        ],
                      }
                    : item,
                ),
              },
              `В пространство добавлен: ${target.name}`,
            ),
          };
        }),
      updateBell: (spaceId, bell) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              spaces: s.data.spaces.map((space) => (space.id === spaceId ? { ...space, bell } : space)),
            },
            "Расписание звонков обновлено",
          ),
        })),
      setMinorAi: (spaceId, restricted) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              spaces: s.data.spaces.map((space) =>
                space.id === spaceId ? { ...space, aiRestrictedForMinors: restricted } : space,
              ),
            },
            restricted ? "ИИ для учеников ограничен" : "Ограничение ИИ для учеников снято",
          ),
        })),
      saveOrgName: (orgId, name) =>
        set((s) => ({
          data: {
            ...s.data,
            orgs: s.data.orgs.map((org) => (org.id === orgId ? { ...org, name } : org)),
          },
        })),
      addDivision: (orgId, name) =>
        set((s) => ({
          data: withAudit(
            { ...s.data, divisions: [...s.data.divisions, { id: uid(), orgId, name }] },
            `Подразделение: ${name}`,
          ),
        })),
      saveClass: (room) =>
        set((s) => ({ data: withAudit({ ...s.data, classes: upsert(s.data.classes, room) }, `Класс: ${room.name}`) })),
      removeClass: (id) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              classes: s.data.classes.filter((item) => item.id !== id),
              groups: s.data.groups.filter((item) => item.classId !== id),
              lessons: s.data.lessons.filter((item) => item.classId !== id),
            },
            "Класс удалён",
          ),
        })),
      saveGroup: (group) =>
        set((s) => ({ data: { ...s.data, groups: upsert(s.data.groups, group) } })),
      removeGroup: (id) =>
        set((s) => ({ data: { ...s.data, groups: s.data.groups.filter((item) => item.id !== id) } })),
      saveSubject: (subject) =>
        set((s) => ({ data: { ...s.data, subjects: upsert(s.data.subjects, subject) } })),
      removeSubject: (id) =>
        set((s) => ({ data: { ...s.data, subjects: s.data.subjects.filter((item) => item.id !== id) } })),
      addPeriod: (orgId, name, start, end) =>
        set((s) => ({
          data: { ...s.data, periods: [...s.data.periods, { id: uid(), orgId, name, start, end }] },
        })),
      saveLesson: (lesson) =>
        set((s) => {
          const withoutClash = s.data.lessons.filter((item) => {
            if (item.id === lesson.id) return false;
            if (item.spaceId !== lesson.spaceId || item.weekday !== lesson.weekday || item.index !== lesson.index) {
              return true;
            }
            if (lesson.classId) return item.classId !== lesson.classId;
            return item.ownerProfileId !== lesson.ownerProfileId;
          });
          return { data: withAudit({ ...s.data, lessons: [...withoutClash, lesson] }, "Урок в расписании сохранён") };
        }),
      deleteLesson: (id) =>
        set((s) => ({ data: { ...s.data, lessons: s.data.lessons.filter((item) => item.id !== id) } })),
      copyDay: (from, weekdays) =>
        set((s) => {
          const targets = weekdays.filter((day) => day !== from.weekday);
          const source = s.data.lessons.filter((item) => {
            if (item.weekday !== from.weekday || item.spaceId !== from.spaceId) return false;
            if (from.classId) return item.classId === from.classId;
            return item.ownerProfileId === from.ownerProfileId && !item.classId;
          });
          if (targets.length === 0 || source.length === 0) return s;
          let lessons = s.data.lessons.filter((item) => {
            if (!targets.includes(item.weekday) || item.spaceId !== from.spaceId) return true;
            if (from.classId) return item.classId !== from.classId;
            return !(item.ownerProfileId === from.ownerProfileId && !item.classId);
          });
          for (const day of targets) {
            for (const lesson of source) {
              lessons = [...lessons, { ...lesson, id: uid(), weekday: day }];
            }
          }
          return { data: withAudit({ ...s.data, lessons }, "День расписания скопирован") };
        }),
      saveException: (item) =>
        set((s) => ({ data: withAudit({ ...s.data, exceptions: upsert(s.data.exceptions, item) }, "Исключение в расписании") })),
      removeException: (id) =>
        set((s) => ({ data: { ...s.data, exceptions: s.data.exceptions.filter((item) => item.id !== id) } })),
      saveTask: (task) =>
        set((s) => ({ data: withAudit({ ...s.data, tasks: upsert(s.data.tasks, task) }, `Задание: ${task.title}`) })),
      setTaskStatus: (id, status, actorId) =>
        set((s) => ({
          data: {
            ...s.data,
            tasks: s.data.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    status,
                    history: [{ at: new Date().toISOString(), text: `${actorId}:${status}` }, ...task.history].slice(0, 30),
                  }
                : task,
            ),
          },
        })),
      addComment: (taskId, authorId, text) =>
        set((s) => ({
          data: {
            ...s.data,
            tasks: s.data.tasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    comments: [...task.comments, { id: uid(), authorId, text, at: new Date().toISOString() }],
                  }
                : task,
            ),
          },
        })),
      removeTask: (id) =>
        set((s) => ({ data: { ...s.data, tasks: s.data.tasks.filter((item) => item.id !== id) } })),
      saveGrade: (grade) =>
        set((s) => ({ data: withAudit({ ...s.data, grades: upsert(s.data.grades, grade) }, "Оценка сохранена") })),
      removeGrade: (id) =>
        set((s) => ({ data: { ...s.data, grades: s.data.grades.filter((item) => item.id !== id) } })),
      saveEvent: (event) =>
        set((s) => ({ data: withAudit({ ...s.data, events: upsert(s.data.events, event) }, `Событие: ${event.title}`) })),
      removeEvent: (id) =>
        set((s) => ({ data: { ...s.data, events: s.data.events.filter((item) => item.id !== id) } })),
      saveProvider: (provider) =>
        set((s) => ({ data: { ...s.data, providers: upsert(s.data.providers, provider) } })),
      removeProvider: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            providers: s.data.providers.filter((item) => item.id !== id || item.kind === "builtin"),
          },
        })),
      saveAssistant: (assistant) =>
        set((s) => ({ data: { ...s.data, assistants: upsert(s.data.assistants, assistant) } })),
      removeAssistant: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            assistants: s.data.assistants.filter((item) => item.id !== id || item.builtin),
          },
        })),
      startChat: (assistantId, providerId) => {
        const id = uid();
        const assistant = get().data.assistants.find((item) => item.id === assistantId);
        const chat = {
          id,
          assistantId,
          providerId,
          title: assistant?.name ?? "MetaAI",
          messages: [],
        };
        set((s) => ({ data: { ...s.data, chats: [chat, ...s.data.chats].slice(0, 40), activeChatId: id } }));
        return id;
      },
      appendChat: (chatId, message) =>
        set((s) => ({
          data: {
            ...s.data,
            chats: s.data.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: [
                      ...chat.messages,
                      { id: uid(), at: new Date().toISOString(), ...message },
                    ].slice(-40),
                  }
                : chat,
            ),
          },
        })),
      addUsage: (providerId, model, promptTokens, completionTokens) =>
        set((s) => ({
          data: {
            ...s.data,
            usage: [
              { id: uid(), at: new Date().toISOString(), providerId, model, promptTokens, completionTokens },
              ...s.data.usage,
            ].slice(0, 100),
          },
        })),
      saveIntegration: (item) =>
        set((s) => ({ data: { ...s.data, integrations: upsert(s.data.integrations, item) } })),
      removeIntegration: (id) =>
        set((s) => ({
          data: {
            ...s.data,
            integrations: s.data.integrations.filter((item) => item.id !== id),
            rules: s.data.rules.filter((rule) => rule.integrationId !== id),
          },
        })),
      saveRule: (rule) => set((s) => ({ data: { ...s.data, rules: upsert(s.data.rules, rule) } })),
      removeRule: (id) => set((s) => ({ data: { ...s.data, rules: s.data.rules.filter((item) => item.id !== id) } })),
      logSync: (text, ok, ruleId) =>
        set((s) => ({
          data: {
            ...s.data,
            syncLog: [{ id: uid(), at: new Date().toISOString(), text, ok, ruleId }, ...s.data.syncLog].slice(0, 80),
          },
        })),
      pushInbox: (title, body, dedupeKey) => {
        if (seenInbox.has(dedupeKey)) return;
        const exists = get().data.inbox.some((item) => item.id === dedupeKey);
        if (exists) {
          seenInbox.add(dedupeKey);
          return;
        }
        seenInbox.add(dedupeKey);
        set((s) => ({
          data: {
            ...s.data,
            inbox: [{ id: dedupeKey, at: new Date().toISOString(), title, body, read: false }, ...s.data.inbox].slice(0, 60),
          },
        }));
      },
      markInboxRead: () =>
        set((s) => ({ data: { ...s.data, inbox: s.data.inbox.map((item) => ({ ...item, read: true })) } })),
      setNotif: (key, value) => set((s) => ({ data: { ...s.data, notif: { ...s.data.notif, [key]: value } } })),
      saveCustomRole: (role) =>
        set((s) => ({ data: { ...s.data, customRoles: upsert(s.data.customRoles, role) } })),
      removeCustomRole: (id) =>
        set((s) => ({ data: { ...s.data, customRoles: s.data.customRoles.filter((item) => item.id !== id) } })),
      pushOutbox: (entity, action, summary) =>
        set((s) => ({
          data: {
            ...s.data,
            outbox: [
              ...(s.data.outbox || []),
              { id: uid(), at: new Date().toISOString(), entity, action, summary },
            ],
          },
        })),
      flushOutbox: () => {
        const outbox = get().data.outbox || [];
        if (outbox.length === 0) return { count: 0, status: "up_to_date" };
        const isOnline = typeof navigator !== "undefined" ? navigator.onLine : false;

        if (!isOnline) {
          return { count: 0, status: "offline_pending" };
        }

        const count = outbox.length;
        set((s) => ({
          data: {
            ...s.data,
            outbox: [],
            syncLog: [
              {
                id: uid(),
                at: new Date().toISOString(),
                ok: true,
                text: `Сохранено в локальное автономное хранилище (${count} операций)`,
              },
              ...s.data.syncLog,
            ].slice(0, 80),
          },
        }));
        return { count, status: "local_synced" };
      },
      clearOutbox: () =>
        set((s) => ({
          data: {
            ...s.data,
            outbox: [],
          },
        })),
      importData: (raw, mode) => {
        if (!isData(raw)) return { ok: false, error: "format" };
        if (mode === "replace") {
          set({ bootstrapped: true, data: raw });
          return { ok: true };
        }
        set((s) => ({
          bootstrapped: true,
          data: {
            ...s.data,
            profiles: mergeById(s.data.profiles, raw.profiles),
            spaces: mergeById(s.data.spaces, raw.spaces),
            orgs: mergeById(s.data.orgs, raw.orgs),
            divisions: mergeById(s.data.divisions, raw.divisions),
            classes: mergeById(s.data.classes, raw.classes),
            groups: mergeById(s.data.groups, raw.groups),
            subjects: mergeById(s.data.subjects, raw.subjects),
            periods: mergeById(s.data.periods, raw.periods),
            lessons: mergeById(s.data.lessons, raw.lessons),
            exceptions: mergeById(s.data.exceptions, raw.exceptions),
            tasks: mergeById(s.data.tasks, raw.tasks),
            grades: mergeById(s.data.grades, raw.grades),
            events: mergeById(s.data.events, raw.events),
          },
        }));
        return { ok: true };
      },
      resetAll: () => set({ bootstrapped: false, data: shellData() }),
      addPost: (postInput) =>
        set((s) => {
          const newPost: import("@/lib/ms/types").CommunityPost = {
            ...postInput,
            id: uid(),
            createdAt: new Date().toISOString(),
            reactions: [],
            commentsCount: 0,
            comments: [],
          };
          const next = {
            ...s.data,
            communityPosts: [newPost, ...(s.data.communityPosts || [])],
          };
          return { data: withAudit(next, `Опубликован пост: ${postInput.title || postInput.content.slice(0, 30)}`) };
        }),
      deletePost: (id) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              communityPosts: (s.data.communityPosts || []).filter((p) => p.id !== id),
            },
            "Удалена публикация в сообществе",
          ),
        })),
      toggleReaction: (postId, profileId, type) =>
        set((s) => {
          const posts = (s.data.communityPosts || []).map((p) => {
            if (p.id !== postId) return p;
            const existingIdx = p.reactions.findIndex((r) => r.profileId === profileId);
            let nextReactions = [...p.reactions];
            if (existingIdx !== -1) {
              if (nextReactions[existingIdx]?.type === type) {
                nextReactions.splice(existingIdx, 1);
              } else {
                nextReactions[existingIdx] = { profileId, type };
              }
            } else {
              nextReactions.push({ profileId, type });
            }
            return { ...p, reactions: nextReactions };
          });
          return { data: { ...s.data, communityPosts: posts } };
        }),
      addPostComment: (postId, authorId, authorName, authorTone, text) =>
        set((s) => {
          const comment: import("@/lib/ms/types").PostComment = {
            id: uid(),
            postId,
            authorId,
            authorName,
            authorTone,
            createdAt: new Date().toISOString(),
            text,
          };
          const posts = (s.data.communityPosts || []).map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              commentsCount: (p.commentsCount || 0) + 1,
              comments: [...(p.comments || []), comment],
            };
          });
          return { data: { ...s.data, communityPosts: posts } };
        }),
      deletePostComment: (postId, commentId) =>
        set((s) => {
          const posts = (s.data.communityPosts || []).map((p) => {
            if (p.id !== postId) return p;
            const filtered = (p.comments || []).filter((c) => c.id !== commentId);
            return {
              ...p,
              commentsCount: filtered.length,
              comments: filtered,
            };
          });
          return { data: { ...s.data, communityPosts: posts } };
        }),
      saveCommunityGroup: (group) =>
        set((s) => ({
          data: withAudit(
            {
              ...s.data,
              communityGroups: upsert(s.data.communityGroups || [], group),
            },
            `Сохранено сообщество: ${group.name}`,
          ),
        })),
      joinCommunityGroup: (groupId, profileId) =>
        set((s) => {
          const groups = (s.data.communityGroups || []).map((g) => {
            if (g.id !== groupId) return g;
            if (g.memberIds.includes(profileId)) return g;
            return { ...g, memberIds: [...g.memberIds, profileId] };
          });
          return { data: { ...s.data, communityGroups: groups } };
        }),
      leaveCommunityGroup: (groupId, profileId) =>
        set((s) => {
          const groups = (s.data.communityGroups || []).map((g) => {
            if (g.id !== groupId) return g;
            return { ...g, memberIds: g.memberIds.filter((id) => id !== profileId) };
          });
          return { data: { ...s.data, communityGroups: groups } };
        }),
      reportContent: (targetType, targetId, reporterId, reason) =>
        set((s) => {
          const report: import("@/lib/ms/types").CommunityReport = {
            id: uid(),
            targetType,
            targetId,
            reporterId,
            reason,
            createdAt: new Date().toISOString(),
            status: "new",
          };
          return {
            data: withAudit(
              {
                ...s.data,
                communityReports: [report, ...(s.data.communityReports || [])],
              },
              `Отправлена жалоба на контент (${targetType})`,
            ),
          };
        }),
      setUpdateChannel: (channel) =>
        set((s) => ({
          data: withAudit(
            { ...s.data, updateChannel: channel },
            `Изменен канал обновлений на: ${channel}`,
          ),
        })),
      dismissUpdate: (version) =>
        set((s) => ({
          data: { ...s.data, dismissedUpdateVersion: version },
        })),
    }),
    {
      name: "metashkola-db-v1",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({ bootstrapped: state.bootstrapped, data: state.data }),
    },
  ),
);

function mergeById<T extends { id: string }>(current: T[], incoming: T[] | undefined): T[] {
  if (!incoming) return current;
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

export function redactSecrets(data: Data, includeSecrets: boolean): Data {
  if (includeSecrets) return data;
  return {
    ...data,
    profiles: (data.profiles || []).map((profile) => ({ ...profile, pin: undefined })),
    providers: (data.providers || []).map((provider) => ({ ...provider, apiKey: undefined })),
  };
}
