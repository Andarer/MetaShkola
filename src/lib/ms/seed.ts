import { uid } from "@/lib/ms/id";
import { addDays, toISODate } from "@/lib/ms/time";
import {
  defaultBell,
  defaultNotif,
  type Assistant,
  type Data,
  type Lang,
  type Lesson,
  type SpaceKind,
} from "@/lib/ms/types";

const FAMILY = "sp-family";
const SCHOOL = "sp-school";
const ORG = "org-lyceum";
const DIV = "div-mid";
const C7 = "c-7a";
const C4 = "c-4b";
const OLENA = "p-olena";
const MARKO = "p-marko";
const SOFIA = "p-sofia";
const ANDRIY = "p-andriy";
const GUEST = "p-guest";

const SUB = {
  math: "sub-math",
  ukr: "sub-ukr",
  eng: "sub-eng",
  hist: "sub-hist",
  phys: "sub-phys",
  pe: "sub-pe",
  bio: "sub-bio",
} as const;

function iso(offset: number): string {
  return toISODate(addDays(new Date(), offset));
}

function lessonsFor(
  classId: string,
  pattern: Record<number, [string, string, string | null][]>,
): Lesson[] {
  const rows: Lesson[] = [];
  for (const [day, slots] of Object.entries(pattern)) {
    slots.forEach((slot, index) => {
      rows.push({
        id: uid(),
        spaceId: SCHOOL,
        classId,
        ownerProfileId: null,
        weekday: Number(day),
        index: index + 1,
        subjectId: slot[0],
        room: slot[1],
        teacherId: slot[2],
      });
    });
  }
  return rows;
}

const assistants = (): Assistant[] => [
  {
    id: "ai-tutor",
    builtin: true,
    name: "AI-Репетитор",
    instruction:
      "Ты учебный репетитор MetaШколы. Объясняй коротко, по шагам, с проверкой понимания. Не выдавай готовое решение целиком: сначала наводящий вопрос, затем подсказка, и только если ученик просит — разбор одного похожего примера.",
  },
  {
    id: "ai-math",
    builtin: true,
    name: "AI-Математик",
    instruction:
      "Ты помощник по математике. Веди ученика по решению, проси следующий шаг, указывай на ошибку, не подменяй самостоятельную работу.",
  },
  {
    id: "ai-lang",
    builtin: true,
    name: "AI-Языковой помощник",
    instruction:
      "Ты языковой помощник. Исправляй формулировки бережно, объясняй правило и давай короткую тренировку.",
  },
  {
    id: "ai-hw",
    builtin: true,
    name: "AI-Помощник по заданиям",
    instruction:
      "Помогай понять домашнее задание. Не пиши работу за ученика. Уточни, что уже сделано, и предложи следующий самостоятельный шаг.",
  },
  {
    id: "ai-plan",
    builtin: true,
    name: "AI-Планировщик",
    instruction:
      "Помоги разложить учёбу по времени. Учитывай сроки, приоритет и отдых. Предлагай реалистичный план на день.",
  },
  {
    id: "ai-teacher",
    builtin: true,
    name: "AI-Ассистент преподавателя",
    instruction:
      "Помогай преподавателю: формулировки заданий, критерии, идеи объяснения. Не выдумывай факты об учениках, которых нет в сообщении.",
  },
  {
    id: "ai-parent",
    builtin: true,
    name: "AI-Ассистент родителя",
    instruction:
      "Помогай родителю спокойно разобраться в учёбе ребёнка: что спросить, как поддержать, без давления и без выполнения задания вместо ребёнка.",
  },
];

export function demoData(): Data {
  const week = [1, 2, 3, 4, 5];
  const seven: Record<number, [string, string, string | null][]> = {};
  const four: Record<number, [string, string, string | null][]> = {};
  for (const day of week) {
    const mathRoom = day % 2 === 0 ? "21" : "22";
    seven[day] = [
      [SUB.math, mathRoom, ANDRIY],
      [SUB.ukr, "21", null],
      [day === 3 ? SUB.bio : SUB.eng, day === 3 ? "14" : "12", null],
      [SUB.hist, "21", null],
      [day === 5 ? SUB.bio : SUB.phys, day === 5 ? "14" : "30", null],
      [SUB.pe, "Спортзал", null],
    ];
    four[day] = [
      [SUB.ukr, "8", null],
      [SUB.math, "8", ANDRIY],
      [SUB.eng, "12", null],
      [SUB.bio, "14", null],
      [SUB.pe, "Спортзал", null],
    ];
  }

  return {
    version: 1,
    lang: "ru",
    theme: "system",
    activeProfileId: OLENA,
    activeSpaceId: FAMILY,
    profiles: [
      {
        id: OLENA,
        name: "Олена Коваленко",
        tone: "copper",
        isProjectCreator: true,
        memberships: [
          { spaceId: FAMILY, roleKeys: ["creator", "familyAdmin", "parent"], childIds: [MARKO, SOFIA] },
          { spaceId: SCHOOL, roleKeys: ["creator", "parent"], childIds: [MARKO, SOFIA] },
        ],
      },
      {
        id: MARKO,
        name: "Марко Коваленко",
        tone: "sage",
        memberships: [
          { spaceId: FAMILY, roleKeys: ["student"] },
          { spaceId: SCHOOL, roleKeys: ["student"], classId: C7 },
        ],
      },
      {
        id: SOFIA,
        name: "София Коваленко",
        tone: "clay",
        memberships: [
          { spaceId: FAMILY, roleKeys: ["student"] },
          { spaceId: SCHOOL, roleKeys: ["student"], classId: C4 },
        ],
      },
      {
        id: ANDRIY,
        name: "Андрей Мельник",
        tone: "ink",
        memberships: [{ spaceId: SCHOOL, roleKeys: ["teacher", "homeroom"], classId: C7 }],
      },
      {
        id: GUEST,
        name: "Гость",
        tone: "ink",
        memberships: [{ spaceId: SCHOOL, roleKeys: ["guest"] }],
      },
    ],
    spaces: [
      { id: FAMILY, kind: "family", name: "Родина Коваленко", aiRestrictedForMinors: false, bell: defaultBell() },
      { id: SCHOOL, kind: "school", name: "Лицей «Горизонт»", aiRestrictedForMinors: false, bell: defaultBell() },
    ],
    orgs: [{ id: ORG, spaceId: SCHOOL, name: "Лицей «Горизонт»" }],
    divisions: [{ id: DIV, orgId: ORG, name: "Средняя школа" }],
    classes: [
      { id: C7, spaceId: SCHOOL, orgId: ORG, divisionId: DIV, name: "7-А", homeroomTeacherId: ANDRIY },
      { id: C4, spaceId: SCHOOL, orgId: ORG, divisionId: DIV, name: "4-Б" },
    ],
    groups: [
      { id: uid(), classId: C7, name: "Математика 7-А", subjectId: SUB.math, studentIds: [MARKO] },
      { id: uid(), classId: C4, name: "Математика 4-Б", subjectId: SUB.math, studentIds: [SOFIA] },
    ],
    subjects: [
      { id: SUB.math, spaceId: SCHOOL, name: "Математика", tone: "copper" },
      { id: SUB.ukr, spaceId: SCHOOL, name: "Украинский язык", tone: "sage" },
      { id: SUB.eng, spaceId: SCHOOL, name: "Английский язык", tone: "ink" },
      { id: SUB.hist, spaceId: SCHOOL, name: "История", tone: "clay" },
      { id: SUB.phys, spaceId: SCHOOL, name: "Физика", tone: "copper" },
      { id: SUB.bio, spaceId: SCHOOL, name: "Биология", tone: "sage" },
      { id: SUB.pe, spaceId: SCHOOL, name: "Физкультура", tone: "ink" },
    ],
    periods: [{ id: uid(), orgId: ORG, name: "I семестр", start: iso(-30), end: iso(60) }],
    lessons: [...lessonsFor(C7, seven), ...lessonsFor(C4, four)],
    exceptions: [
      {
        id: uid(),
        spaceId: SCHOOL,
        classId: C7,
        date: iso(1),
        lessonIndex: 6,
        kind: "cancel",
        note: "Спортзал занят",
      },
    ],
    tasks: [
      {
        id: uid(),
        spaceId: SCHOOL,
        assigneeId: MARKO,
        classId: C7,
        subjectId: SUB.math,
        title: "Уравнения, №142–146",
        detail: "Показать проверку подстановкой хотя бы в двух номерах.",
        due: iso(1),
        priority: "high",
        status: "assigned",
        teacherId: ANDRIY,
        comments: [],
        attachments: [],
        history: [{ at: new Date().toISOString(), text: "Задание создано" }],
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        assigneeId: MARKO,
        classId: C7,
        subjectId: SUB.eng,
        title: "Текст о любимом городе, 80–100 слов",
        detail: "Время Present Simple. Три абзаца: место, люди, чем заняться.",
        due: iso(3),
        priority: "normal",
        status: "progress",
        comments: [
          {
            id: uid(),
            authorId: MARKO,
            text: "Набросал первый абзац про набережную.",
            at: new Date().toISOString(),
          },
        ],
        attachments: [],
        history: [],
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        assigneeId: SOFIA,
        classId: C4,
        subjectId: SUB.ukr,
        title: "Прочитать рассказ и выписать 5 слов",
        detail: "Слова записать с ударением.",
        due: iso(0),
        priority: "normal",
        status: "done",
        comments: [],
        attachments: [],
        history: [],
      },
    ],
    grades: [
      {
        id: uid(),
        spaceId: SCHOOL,
        studentId: MARKO,
        subjectId: SUB.math,
        teacherId: ANDRIY,
        score: 10,
        kind: "mark",
        date: iso(-5),
        comment: "Уверенно решает линейные уравнения",
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        studentId: MARKO,
        subjectId: SUB.math,
        teacherId: ANDRIY,
        score: 8,
        kind: "test",
        date: iso(-12),
        comment: "Контрольная: ошибка в знаке",
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        studentId: SOFIA,
        subjectId: SUB.math,
        teacherId: ANDRIY,
        score: 11,
        kind: "mark",
        date: iso(-3),
        comment: "",
      },
    ],
    events: [
      {
        id: uid(),
        spaceId: SCHOOL,
        title: "Контрольная по математике, 7-А",
        date: iso(2),
        kind: "test",
        classId: C7,
        note: "Темы: уравнения и пропорции",
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        title: "Родительское собрание 7-А",
        date: iso(6),
        kind: "meeting",
        classId: C7,
        note: "Кабинет 21, 18:00",
      },
      {
        id: uid(),
        spaceId: FAMILY,
        title: "Семейный выходной",
        date: iso(0),
        kind: "personal",
        note: "Без кружков",
      },
      {
        id: uid(),
        spaceId: SCHOOL,
        title: "Осенние каникулы",
        date: iso(20),
        endDate: iso(27),
        kind: "vacation",
        note: "",
      },
    ],
    providers: [
      {
        id: "builtin-grok",
        name: "xAI Grok",
        kind: "builtin",
        baseUrl: "https://api.x.ai/v1",
        model: "grok-4.5",
        temperature: 0.4,
        enabled: true,
      },
    ],
    assistants: assistants(),
    chats: [],
    activeChatId: null,
    usage: [],
    integrations: [],
    rules: [],
    syncLog: [],
    inbox: [],
    notif: defaultNotif(),
    customRoles: [],
    audit: [
      {
        id: uid(),
        at: new Date().toISOString(),
        profileId: OLENA,
        text: "Открыт демонстрационный контур лицея и семьи",
      },
    ],
    outbox: [],
    // MetaCommunity demo data
    communityGroups: [
      {
        id: "comm-7a",
        name: "7-А Класс · Лицей №1",
        description: "Официальное сообщество 7-А класса. Новости, события, домашние проекты.",
        kind: "class",
        spaceId: SCHOOL,
        memberIds: [OLENA, MARKO, SOFIA, ANDRIY],
        adminIds: [OLENA],
        avatarTone: "copper",
        isPrivate: false,
      },
      {
        id: "comm-math",
        name: "Клуб Олимпиадной Математики",
        description: "Разбор задач олимпиад, алгоритмы, логика и математические головоломки.",
        kind: "club",
        spaceId: SCHOOL,
        memberIds: [MARKO, OLENA, SOFIA],
        adminIds: [OLENA],
        avatarTone: "sage",
        isPrivate: false,
      },
      {
        id: "comm-family",
        name: "Семейный совет Коваленко",
        description: "Учебные планы, расписание кружков и семейные проекты.",
        kind: "family",
        spaceId: FAMILY,
        memberIds: [OLENA, MARKO, SOFIA, ANDRIY],
        adminIds: [OLENA, ANDRIY],
        avatarTone: "clay",
        isPrivate: true,
      },
    ],
    communityPosts: [
      {
        id: "post-1",
        communityId: "comm-7a",
        spaceId: SCHOOL,
        authorId: OLENA,
        authorName: "Елена Коваленко",
        authorTone: "copper",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        kind: "announcement",
        title: "Подготовка к открытому уроку по физике",
        content: "Уважаемые ученики! В четверг на 3-м уроке состоится лабораторная работа по оптике. Просьба повторить параграфы 12–14 и принести линейки.",
        visibility: "class",
        tags: ["физика", "лабораторная", "7А"],
        reactions: [
          { profileId: MARKO, type: "like" },
          { profileId: SOFIA, type: "grad" },
        ],
        commentsCount: 2,
        comments: [
          {
            id: "comm-c-1",
            postId: "post-1",
            authorId: MARKO,
            authorName: "Марк Коваленко",
            authorTone: "sage",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            text: "Елена Николаевна, тетради для лабораторных работ брать старые?",
          },
          {
            id: "comm-c-2",
            postId: "post-1",
            authorId: OLENA,
            authorName: "Елена Коваленко",
            authorTone: "copper",
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            text: "Да, Марк, будем продолжать в тех же тетрадях.",
          },
        ],
        pinned: true,
      },
      {
        id: "post-2",
        communityId: "comm-math",
        spaceId: SCHOOL,
        authorId: MARKO,
        authorName: "Марк Коваленко",
        authorTone: "sage",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        kind: "question",
        title: "Интересная задача на инвариант",
        content: "На доске написаны числа 1, 2, ..., 20. За один ход можно стереть любые два числа a и b и записать вместо них a+b-1. Какое число останется в конце?",
        visibility: "school",
        tags: ["математика", "олимпиада", "задача"],
        reactions: [
          { profileId: OLENA, type: "light" },
          { profileId: SOFIA, type: "heart" },
        ],
        commentsCount: 1,
        comments: [
          {
            id: "comm-c-3",
            postId: "post-2",
            authorId: SOFIA,
            authorName: "София Коваленко",
            authorTone: "clay",
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            text: "Сумма уменьшается на 1 на каждом шаге! Всего ходов 19.",
          },
        ],
      },
    ],
    personalNotes: [
      {
        id: "note-1",
        profileId: OLENA,
        title: "План на учебную четверть",
        content: "1. Подготовить проект по физике.\n2. Дочитать книгу по зарубежной литературе.\n3. Записаться в секцию волейбола.",
        tag: "Планы",
        tone: "copper",
        pinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    personalTasks: [
      {
        id: "ptask-1",
        profileId: OLENA,
        title: "Купить тетради в клетку и чертежный набор",
        done: false,
        category: "shopping",
        due: toISODate(addDays(new Date(), 2)),
        priority: "normal",
        createdAt: new Date().toISOString(),
      },
      {
        id: "ptask-2",
        profileId: OLENA,
        title: "Повторить формулы кинематики",
        done: true,
        category: "personal",
        priority: "high",
        createdAt: new Date().toISOString(),
      },
    ],
    habits: [
      {
        id: "habit-1",
        profileId: OLENA,
        title: "Утренняя разминка 15 минут",
        period: "daily",
        completedDates: [toISODate(new Date())],
        createdAt: new Date().toISOString(),
      },
    ],
    communityReports: [],
    updateChannel: "stable",
  };
}

export function emptyData(input: {
  name: string;
  spaceName: string;
  kind: SpaceKind;
  lang: Lang;
}): Data {
  const profileId = uid();
  const spaceId = uid();
  const roles =
    input.kind === "school"
      ? ["creator", "orgAdmin"]
      : input.kind === "family"
        ? ["creator", "familyAdmin"]
        : ["creator"];
  const orgId = input.kind === "school" ? uid() : "";
  return {
    version: 1,
    lang: input.lang,
    theme: "system",
    activeProfileId: profileId,
    activeSpaceId: spaceId,
    profiles: [
      {
        id: profileId,
        name: input.name.trim() || "Пользователь",
        tone: "copper",
        isProjectCreator: true,
        memberships: [{ spaceId, roleKeys: roles }],
      },
    ],
    spaces: [
      {
        id: spaceId,
        kind: input.kind,
        name: input.spaceName.trim() || input.name,
        aiRestrictedForMinors: false,
        bell: defaultBell(),
      },
    ],
    orgs: input.kind === "school" ? [{ id: orgId, spaceId, name: input.spaceName.trim() || input.name }] : [],
    divisions: [],
    classes: [],
    groups: [],
    subjects: [],
    periods: [],
    lessons: [],
    exceptions: [],
    tasks: [],
    grades: [],
    events: [],
    providers: [
      {
        id: "builtin-grok",
        name: "xAI Grok",
        kind: "builtin",
        baseUrl: "https://api.x.ai/v1",
        model: "grok-4.5",
        temperature: 0.4,
        enabled: true,
      },
    ],
    assistants: assistants(),
    chats: [],
    activeChatId: null,
    usage: [],
    integrations: [],
    rules: [],
    syncLog: [],
    inbox: [],
    notif: defaultNotif(),
    customRoles: [],
    audit: [
      {
        id: uid(),
        at: new Date().toISOString(),
        profileId,
        text: "Создано локальное пространство",
      },
    ],
    outbox: [],
    personalNotes: [],
    personalTasks: [],
    habits: [],
    communityPosts: [],
    communityGroups: [],
    communityReports: [],
    updateChannel: "stable",
  };
}

export function shellData(): Data {
  return {
    version: 1,
    lang: "ru",
    theme: "system",
    activeProfileId: "",
    activeSpaceId: "",
    profiles: [],
    spaces: [],
    orgs: [],
    divisions: [],
    classes: [],
    groups: [],
    subjects: [],
    periods: [],
    lessons: [],
    exceptions: [],
    tasks: [],
    grades: [],
    events: [],
    providers: [],
    assistants: [],
    chats: [],
    activeChatId: null,
    usage: [],
    integrations: [],
    rules: [],
    syncLog: [],
    inbox: [],
    notif: defaultNotif(),
    customRoles: [],
    audit: [],
    outbox: [],
    personalNotes: [],
    personalTasks: [],
    habits: [],
    communityPosts: [],
    communityGroups: [],
    communityReports: [],
    updateChannel: "stable",
  };
}
