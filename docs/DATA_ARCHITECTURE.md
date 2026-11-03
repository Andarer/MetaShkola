# Архитектура данных MetaШкола 2.0 (DATA_ARCHITECTURE.md)

**Автор и инициатор:** Andárer

---

## 1. Базовые принципы сущностей

Каждая сущность в MetaШкола 2.0 удовлетворяет следующим требованиям:
1. `id`: глобально уникальный идентификатор (UID).
2. `spaceId`: привязка к изолированному пространству (семейному, школьному или личному).
3. Принадлежность к пространству и владельцу.
4. Возможность экспорта и импорта без потери связности.

---

## 2. Ключевые модели данных

### Пространство (`Space`)
```typescript
export type SpaceKind = "family" | "personal" | "school";

export type Bell = {
  firstStart: string;         // "08:00"
  lessonMinutes: number;      // 45
  breakMinutes: number;       // 10
  bigBreakMinutes: number;    // 20
  bigBreakAfter: number[];    // [3] (после 3 урока)
  lessonsPerDay: number;      // 6
};

export type Space = {
  id: string;
  kind: SpaceKind;
  name: string;
  aiRestrictedForMinors: boolean;
  bell: Bell;
};
```

### Профиль и членство (`Profile`, `Membership`)
```typescript
export type RoleKey = 
  | "creator"
  | "sysadmin"
  | "orgAdmin"
  | "familyAdmin"
  | "parent"
  | "teacher"
  | "homeroom"
  | "student"
  | "guest";

export type Membership = {
  spaceId: string;
  roleKeys: RoleKey[];
  classId?: string;
  childIds?: string[];
  grants?: Partial<Record<Action, boolean>>;
};

export type Profile = {
  id: string;
  name: string;
  tone: "copper" | "sage" | "clay" | "ink";
  pin?: string;
  isProjectCreator?: boolean;
  memberships: Membership[];
};
```

### Уроки и расписание (`Lesson`, `ScheduleException`)
```typescript
export type Lesson = {
  id: string;
  spaceId: string;
  classId: string | null;
  ownerProfileId: string | null;
  weekday: number;            // 1 (Пн) .. 7 (Вс)
  index: number;              // 1 .. 6
  subjectId: string;
  teacherId: string | null;
  room: string;
};

export type ScheduleException = {
  id: string;
  spaceId: string;
  classId: string | null;
  date: string;               // ISO YYYY-MM-DD
  lessonIndex: number;
  kind: "cancel" | "replace";
  subjectId?: string;
  teacherId?: string | null;
  room?: string;
  note?: string;
};
```

### Задания и оценки (`Homework`, `Grade`)
```typescript
export type TaskStatus = "assigned" | "progress" | "done" | "checked" | "returned";
export type Priority = "low" | "normal" | "high";

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
  score: number;              // 1..5 или 1..12
  kind: "mark" | "test" | "achievement";
  date: string;
  comment: string;
};
```

---

## 3. Очередь изменений и разрешение конфликтов

1. **Local-First мутации:** Все изменения мгновенно фиксируются в локальном `Data` Zustand-хранилище и сохраняются в `localStorage`.
2. **Экспорт/Импорт:** Функция `exportData()` формирует целостный JSON-снимок с контролем версии схемы `version: 1`. При импорте проверяется корректность структуры и предотвращается повреждение существующих профилей.
