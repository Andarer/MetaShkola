export type Lang = "ru" | "uk" | "en";
export type Theme = "light" | "dark" | "system" | "custom";
export type ColorPalette = "amber" | "emerald" | "violet" | "azure" | "rose" | "graphite";
export type UiDensity = "compact" | "normal" | "spacious";
export type CardRadius = "sm" | "md" | "lg" | "full";

export type MetaDesignConfig = {
  theme: Theme;
  palette: ColorPalette;
  primaryColor?: string; // Hex e.g. #ff8c00
  accentColor?: string;  // Hex e.g. #1976d2
  density: UiDensity;
  radius: CardRadius;
  fontSize: "sm" | "md" | "lg";
  reducedMotion: boolean;
  autoThemeByTime: boolean;
};

export const defaultDesignConfig = (): MetaDesignConfig => ({
  theme: "system",
  palette: "amber",
  density: "normal",
  radius: "lg",
  fontSize: "md",
  reducedMotion: false,
  autoThemeByTime: false,
});

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
  | "personal"
  | "tools"
  | "more"
  | "bells"
  | "ai"
  | "community"
  | "updates"
  | "people"
  | "orgs"
  | "integrations"
  | "developer"
  | "settings";

// --- MetaPersonal Types ---
export type PersonalNote = {
  id: string;
  profileId: string;
  title: string;
  content: string;
  tag?: string;
  tone?: AvatarTone;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalTask = {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  done: boolean;
  category?: "personal" | "shopping" | "project" | "other";
  due?: string;
  priority?: "low" | "normal" | "high";
  repeat?: "none" | "daily" | "weekly" | "monthly";
  subtasks?: { id: string; title: string; done: boolean }[];
  createdAt: string;
};

export type Habit = {
  id: string;
  profileId: string;
  title: string;
  period: "daily" | "weekly";
  completedDates: string[]; // ISO dates: YYYY-MM-DD
  color?: string;
  createdAt: string;
};

export type ShoppingItem = {
  id: string;
  title: string;
  amount?: string;
  bought: boolean;
};

export type ShoppingList = {
  id: string;
  profileId: string;
  title: string;
  items: ShoppingItem[];
  createdAt: string;
};

export type AlarmStatus = "saved_local" | "scheduled_android" | "pending_permission" | "error" | "disabled";

export type Alarm = {
  id: string;
  profileId: string;
  time: string; // "HH:MM" 24h
  label: string;
  enabled: boolean;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (empty = once)
  sound: "bell" | "digital" | "gentle" | "school";
  status?: AlarmStatus;
  scheduleError?: string;
  createdAt: string;
};

export type TimerPreset = {
  id: string;
  label: string;
  durationSeconds: number;
};

export type SavedStopwatchLap = {
  id: string;
  lapNumber: number;
  splitMs: number;
  totalMs: number;
};


export type OutboxState = "pending" | "sending" | "local_synced" | "synced" | "failed" | "conflict" | "local_only";

export type OutboxItem = {
  id: string;
  at: string;
  entity: "task" | "lesson" | "grade" | "event" | "profile" | "general";
  action: "create" | "update" | "delete";
  summary: string;
  state?: OutboxState;
  retryCount?: number;
  lastAttemptAt?: string;
  savedLocallyAt?: string;
  error?: string;
};

// --- MetaCommunity Types ---
export type PostKind = "post" | "note" | "question" | "announcement" | "achievement" | "poll";
export type PostVisibility = "only_me" | "family" | "class" | "school" | "community" | "public";

export type PostReaction = {
  profileId: string;
  type: "like" | "heart" | "light" | "grad"; // 👍, ❤️, 💡, 🎓
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorTone: AvatarTone;
  createdAt: string;
  text: string;
};

export type CommunityGroup = {
  id: string;
  name: string;
  description: string;
  kind: "school" | "class" | "subject" | "project" | "family" | "club";
  spaceId: string;
  memberIds: string[];
  adminIds: string[];
  avatarTone: AvatarTone;
  isPrivate: boolean;
};

export type CommunityPost = {
  id: string;
  communityId?: string;
  spaceId: string;
  authorId: string;
  authorName: string;
  authorTone: AvatarTone;
  createdAt: string;
  kind: PostKind;
  title?: string;
  content: string;
  visibility: PostVisibility;
  tags: string[];
  reactions: PostReaction[];
  commentsCount: number;
  comments: PostComment[];
  pinned?: boolean;
};

export type CommunityReport = {
  id: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  status: "new" | "reviewing" | "resolved" | "dismissed";
};

// --- MetaShare (.mspack) Universal Data Exchange Types ---
export type MetaShareKind = "schedule" | "space" | "backup";

export type MetaShareSchedulePayload = {
  space: Space;
  subjects: Subject[];
  lessons: Lesson[];
  exceptions: ScheduleException[];
  orgs?: Org[];
  classes?: ClassRoom[];
};

export type MetaShareSpacePayload = {
  space: Space;
  subjects: Subject[];
  lessons: Lesson[];
  exceptions: ScheduleException[];
  classes?: ClassRoom[];
  orgs?: Org[];
  divisions?: Division[];
  groups?: StudyGroup[];
  periods?: Period[];
  tasks?: Homework[];
  events?: CalEvent[];
};

export type MetaSharePackage = {
  format: "mspack";
  version: 1;
  packageId?: string;
  kind: MetaShareKind;
  createdAt: string;
  checksum?: string;
  integrity?: {
    algorithm: "SHA-256";
    sha256: string;
  };
  meta: {
    title: string;
    description?: string;
    sourceApp: string;
    sourceVersion: string;
    authorName?: string;
  };
  payload: MetaShareSchedulePayload | MetaShareSpacePayload | Partial<Data>;
};

// --- Update Center Types ---
export type UpdateInfo = {
  app: string;
  channel: "stable" | "beta" | "debug";
  latestVersion: string;
  versionCode: number;
  releaseDate: string;
  minimumSupportedVersion: string;
  mandatory: boolean;
  apkUrl: string;
  apkSize: string;
  sha256: string;
  minAndroid?: string;
  targetAndroid?: string;
  commit?: string;
  releaseNotesUrl: string;
  message: string;
  changelog: string[];
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
  // MetaPersonal
  personalNotes?: PersonalNote[];
  personalTasks?: PersonalTask[];
  habits?: Habit[];
  shoppingLists?: ShoppingList[];
  // MetaTools
  alarms?: Alarm[];
  // MetaCommunity
  communityPosts: CommunityPost[];
  communityGroups: CommunityGroup[];
  communityReports: CommunityReport[];
  // Update Center
  lastUpdateCheckAt?: string;
  updateChannel: "stable" | "beta" | "debug";
  dismissedUpdateVersion?: string;
  // MetaDesign Customization
  design?: MetaDesignConfig;
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
