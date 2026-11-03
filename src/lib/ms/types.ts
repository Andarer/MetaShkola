export type Lang = "ru" | "uk" | "en";
export type Theme = "light" | "dark" | "system";
export type SpaceKind = "family" | "personal" | "school";

export const ROLE_KEYS = [
  "creator",
  "sysadmin",
  "orgAdmin",
  "familyAdmin",
  "parent",
  "teacher",
  "homeroom",
  "student",
  "guest",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "import",
  "export",
  "members",
  "roles",
  "schedule",
  "tasks",
  "grades",
  "integrations",
  "ai",
  "reports",
] as const;
export type Action = (typeof ACTIONS)[number];

export type AvatarTone = "copper" | "sage" | "clay" | "ink";

export type Membership = {
  spaceId: string;
  roleKeys: string[];
  classId?: string;
  childIds?: string[];
  grants?: Partial<Record<Action, boolean>>;
};

export type Profile = {
  id: string;
  name: string;
  tone: AvatarTone;
  pin?: string;
  isProjectCreator?: boolean;
  memberships: Membership[];
};

export type Bell = {
  firstStart: string;
  lessonMinutes: number;
  breakMinutes: number;
  bigBreakMinutes: number;
  bigBreakAfter: number[];
  lessonsPerDay: number;
};

export type Space = {
  id: string;
  kind: SpaceKind;
  name: string;
  aiRestrictedForMinors: boolean;
  bell: Bell;
};

export type Org = {
  id: string;
  spaceId: string;
  name: string;
};

export type Division = {
  id: string;
  orgId: string;
  name: string;
};

export type ClassRoom = {
  id: string;
  spaceId: string;
  orgId: string;
  divisionId?: string;
  name: string;
  homeroomTeacherId?: string;
};

export type StudyGroup = {
  id: string;
  classId: string;
  name: string;
  subjectId?: string;
  studentIds: string[];
};

export type Subject = {
  id: string;
  spaceId: string;
  name: string;
  tone: AvatarTone;
};

export type Period = {
  id: string;
  orgId: string;
  name: string;
  start: string;
  end: string;
};

export type Lesson = {
  id: string;
  spaceId: string;
  classId: string | null;
  ownerProfileId: string | null;
  weekday: number;
  index: number;
  subjectId: string;
  teacherId: string | null;
  room: string;
};

export type ScheduleException = {
  id: string;
  spaceId: string;
  classId: string | null;
  date: string;
  lessonIndex: number;
  kind: "cancel" | "replace";
  subjectId?: string;
  teacherId?: string | null;
  room?: string;
  note?: string;
};

export type TaskStatus = "assigned" | "progress" | "done" | "checked" | "returned";
export type Priority = "low" | "normal" | "high";

export type Attachment = { id: string; name: string; href: string };

export type TaskComment = {
  id: string;
  authorId: string;
  text: string;
  at: string;
};

export type Homework = {
  id: string;
  spaceId: string;
  assigneeId: string;
  classId?: string;
  subjectId?: string;
  title: string;
  detail: string;
  due: string;
  priority: Priority;
  status: TaskStatus;
  teacherId?: string;
  comments: TaskComment[];
  attachments: Attachment[];
  history: { at: string; text: string }[];
};

export type Grade = {
  id: string;
  spaceId: string;
  studentId: string;
  subjectId: string;
  teacherId?: string;
  score: number;
  kind: "mark" | "test" | "achievement";
  date: string;
  comment: string;
};

export type EventKind =
  | "study"
  | "weekend"
  | "vacation"
  | "holiday"
  | "test"
  | "exam"
  | "event"
  | "personal"
  | "meeting";

export type CalEvent = {
  id: string;
  spaceId: string;
  title: string;
  date: string;
  endDate?: string;
  kind: EventKind;
  classId?: string;
  profileId?: string;
  note: string;
};

export type AiProvider = {
  id: string;
  name: string;
  kind: "builtin" | "openai";
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature: number;
  enabled: boolean;
};

export type Assistant = {
  id: string;
  name: string;
  instruction: string;
  builtin: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  providerId?: string;
  at: string;
};

export type ChatThread = {
  id: string;
  assistantId: string;
  providerId: string;
  title: string;
  messages: ChatMessage[];
};

export type Usage = {
  id: string;
  at: string;
  providerId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
};

export type IntegrationService =
  | "google-calendar"
  | "google-drive"
  | "gmail"
  | "classroom"
  | "outlook"
  | "onedrive"
  | "ms-calendar"
  | "telegram"
  | "caldav"
  | "webdav"
  | "rest";

export type Integration = {
  id: string;
  service: IntegrationService;
  label: string;
  accountLabel: string;
  enabled: boolean;
};

export type SyncDirection = "import" | "export" | "both";
export type SyncData = "calendar" | "materials" | "notifications" | "tasks";

export type SyncRule = {
  id: string;
  integrationId: string;
  direction: SyncDirection;
  dataKind: SyncData;
  frequency: "manual" | "daily";
  profileId: string;
  enabled: boolean;
};

export type SyncLog = {
  id: string;
  at: string;
  ruleId?: string;
  ok: boolean;
  text: string;
};

export type InboxNote = {
  id: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
};

export type NotifPrefs = {
  lessonStart: boolean;
  lessonEnd: boolean;
  breakStart: boolean;
  breakEnd: boolean;
  remind15: boolean;
  remind5: boolean;
  tasks: boolean;
  personal: boolean;
};

export type CustomRole = {
  id: string;
  name: string;
  grants: Record<Action, boolean>;
};

export type Audit = {
  id: string;
  at: string;
  profileId: string;
  text: string;
};

export type Screen =
  | "home"
  | "schedule"
  | "tasks"
  | "calendar"
  | "more"
  | "bells"
  | "ai"
  | "people"
  | "orgs"
  | "integrations"
  | "settings";

export type OutboxItem = {
  id: string;
  at: string;
  entity: "task" | "lesson" | "grade" | "event" | "profile" | "general";
  action: "create" | "update" | "delete";
  summary: string;
};

export type Data = {
  version: 1;
  lang: Lang;
  theme: Theme;
  activeProfileId: string;
  activeSpaceId: string;
  profiles: Profile[];
  spaces: Space[];
  orgs: Org[];
  divisions: Division[];
  classes: ClassRoom[];
  groups: StudyGroup[];
  subjects: Subject[];
  periods: Period[];
  lessons: Lesson[];
  exceptions: ScheduleException[];
  tasks: Homework[];
  grades: Grade[];
  events: CalEvent[];
  providers: AiProvider[];
  assistants: Assistant[];
  chats: ChatThread[];
  activeChatId: string | null;
  usage: Usage[];
  integrations: Integration[];
  rules: SyncRule[];
  syncLog: SyncLog[];
  inbox: InboxNote[];
  notif: NotifPrefs;
  customRoles: CustomRole[];
  audit: Audit[];
  outbox: OutboxItem[];
};

export const defaultBell = (): Bell => ({
  firstStart: "08:00",
  lessonMinutes: 45,
  breakMinutes: 10,
  bigBreakMinutes: 20,
  bigBreakAfter: [3],
  lessonsPerDay: 6,
});

export const defaultNotif = (): NotifPrefs => ({
  lessonStart: true,
  lessonEnd: true,
  breakStart: true,
  breakEnd: true,
  remind15: true,
  remind5: true,
  tasks: true,
  personal: true,
});
