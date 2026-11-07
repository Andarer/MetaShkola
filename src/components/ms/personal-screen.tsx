import { useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  ListTodo,
  Plus,
  StickyNote,
  Tag,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ShoppingCart,
  Search,
  Check,
  X,
  PlusCircle,
} from "lucide-react";
import { Btn, Card, controlClass, Field, Modal, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";
import { toISODate } from "@/lib/ms/time";
import type { Habit, PersonalNote, PersonalTask, ShoppingList, ShoppingItem } from "@/lib/ms/types";
import { uid } from "@/lib/ms/id";

export function PersonalScreen() {
  const data = useMs((s) => s.data);
  const activeProfileId = data.activeProfileId;
  const lang = data.lang;

  const savePersonalNote = useMs((s) => s.savePersonalNote);
  const deletePersonalNote = useMs((s) => s.deletePersonalNote);
  const savePersonalTask = useMs((s) => s.savePersonalTask);
  const togglePersonalTask = useMs((s) => s.togglePersonalTask);
  const deletePersonalTask = useMs((s) => s.deletePersonalTask);
  const saveHabit = useMs((s) => s.saveHabit);
  const toggleHabitDate = useMs((s) => s.toggleHabitDate);
  const deleteHabit = useMs((s) => s.deleteHabit);

  const saveShoppingList = useMs((s) => s.saveShoppingList);
  const deleteShoppingList = useMs((s) => s.deleteShoppingList);
  const toggleShoppingItem = useMs((s) => s.toggleShoppingItem);
  const addShoppingItem = useMs((s) => s.addShoppingItem);
  const deleteShoppingItem = useMs((s) => s.deleteShoppingItem);

  const [tab, setTab] = useState<"notes" | "tasks" | "shopping" | "habits">("notes");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);

  // Search & Filter state
  const [noteSearch, setNoteSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Note draft
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Идеи");

  // Task draft
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState<"personal" | "shopping" | "project" | "other">("personal");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Habit draft
  const [habitTitle, setHabitTitle] = useState("");
  const [habitPeriod, setHabitPeriod] = useState<"daily" | "weekly">("daily");

  // Shopping List draft
  const [shoppingListTitle, setShoppingListTitle] = useState("");
  const [newItemTitle, setNewItemTitle] = useState<{ [listId: string]: string }>({});
  const [newItemAmount, setNewItemAmount] = useState<{ [listId: string]: string }>({});

  const notes = (data.personalNotes || []).filter((n) => n.profileId === activeProfileId);
  const tasks = (data.personalTasks || []).filter((t) => t.profileId === activeProfileId);
  const habits = (data.habits || []).filter((h) => h.profileId === activeProfileId);
  const shoppingLists = (data.shoppingLists || []).filter((l) => l.profileId === activeProfileId);

  const todayIso = toISODate(new Date());

  // Filtered notes
  const availableTags = Array.from(new Set(notes.map((n) => n.tag).filter(Boolean))) as string[];
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !noteSearch.trim() ||
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(noteSearch.toLowerCase());
    const matchesTag = !selectedTag || n.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  const handleOpenNoteModal = (note?: PersonalNote) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
      setNoteTag(note.tag || "Идеи");
    } else {
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteTag("Идеи");
    }
    setNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    savePersonalNote({
      id: editingNote ? editingNote.id : uid(),
      profileId: activeProfileId,
      title: noteTitle.trim() || "Без названия",
      content: noteContent.trim(),
      tag: noteTag.trim(),
      tone: "copper",
      pinned: editingNote ? editingNote.pinned : false,
      createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNoteModalOpen(false);
  };

  const handleSaveTask = () => {
    if (!taskTitle.trim()) return;
    savePersonalTask({
      id: uid(),
      profileId: activeProfileId,
      title: taskTitle.trim(),
      done: false,
      category: taskCategory,
      priority: taskPriority,
      due: taskDueDate.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setTaskTitle("");
    setTaskDueDate("");
    setTaskModalOpen(false);
  };

  const handleSaveHabit = () => {
    if (!habitTitle.trim()) return;
    saveHabit({
      id: uid(),
      profileId: activeProfileId,
      title: habitTitle.trim(),
      period: habitPeriod,
      completedDates: [],
      createdAt: new Date().toISOString(),
    });
    setHabitTitle("");
    setHabitModalOpen(false);
  };

  const handleCreateShoppingList = () => {
    if (!shoppingListTitle.trim()) return;
    saveShoppingList({
      id: uid(),
      profileId: activeProfileId,
      title: shoppingListTitle.trim(),
      createdAt: new Date().toISOString(),
      items: [],
    });
    setShoppingListTitle("");
    setShoppingModalOpen(false);
  };

  const handleAddItem = (listId: string) => {
    const title = newItemTitle[listId]?.trim();
    if (!title) return;
    const amount = newItemAmount[listId]?.trim();
    addShoppingItem(listId, title, amount);
    setNewItemTitle((prev) => ({ ...prev, [listId]: "" }));
    setNewItemAmount((prev) => ({ ...prev, [listId]: "" }));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <BookMarked className="h-7 w-7 text-copper" />
            <span>{t(lang, "personal")}</span>
          </h1>
          <p className="text-sm text-muted">
            MetaPersonal 1.1 · Личные заметки, задачи, списки покупок и трекер привычек
          </p>
        </div>

        {tab === "notes" && (
          <Btn onClick={() => handleOpenNoteModal()} className="flex items-center gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Новая заметка</span>
          </Btn>
        )}
        {tab === "tasks" && (
          <Btn onClick={() => setTaskModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Новая задача</span>
          </Btn>
        )}
        {tab === "shopping" && (
          <Btn onClick={() => setShoppingModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Новый список покупок</span>
          </Btn>
        )}
        {tab === "habits" && (
          <Btn onClick={() => setHabitModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Добавить привычку</span>
          </Btn>
        )}
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Btn
          variant={tab === "notes" ? "primary" : "ghost"}
          onClick={() => setTab("notes")}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <StickyNote className="h-4 w-4" />
          <span>Заметки ({notes.length})</span>
        </Btn>
        <Btn
          variant={tab === "tasks" ? "primary" : "ghost"}
          onClick={() => setTab("tasks")}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <ListTodo className="h-4 w-4" />
          <span>Задачи ({tasks.filter((t) => !t.done).length})</span>
        </Btn>
        <Btn
          variant={tab === "shopping" ? "primary" : "ghost"}
          onClick={() => setTab("shopping")}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Покупки ({shoppingLists.length})</span>
        </Btn>
        <Btn
          variant={tab === "habits" ? "primary" : "ghost"}
          onClick={() => setTab("habits")}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <Flame className="h-4 w-4" />
          <span>Привычки ({habits.length})</span>
        </Btn>
      </div>

      {/* Tab: Notes */}
      {tab === "notes" && (
        <div className="flex flex-col gap-3">
          {notes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Поиск по заметкам..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className={`${controlClass} pl-9 text-xs`}
                />
                {noteSearch && (
                  <button
                    onClick={() => setNoteSearch("")}
                    className="absolute right-3 top-2.5 text-muted hover:text-fg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {availableTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      !selectedTag ? "bg-copper text-copper-fg" : "bg-surface-2 text-muted hover:text-fg",
                    )}
                  >
                    Все
                  </button>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                        selectedTag === tag ? "bg-copper text-copper-fg" : "bg-surface-2 text-muted hover:text-fg",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-xs text-muted">
              <StickyNote className="h-8 w-8 mx-auto text-copper/60 mb-2" />
              <p className="font-semibold text-fg">
                {noteSearch || selectedTag ? "Заметки не найдены" : "Пока нет личных заметок"}
              </p>
              <p className="mt-1">
                {noteSearch || selectedTag
                  ? "Попробуйте изменить поисковый запрос или фильтр по тегу."
                  : "Записывайте мысли, идеи, черновики или списки покупок."}
              </p>
              {!noteSearch && !selectedTag && (
                <Btn onClick={() => handleOpenNoteModal()} className="mt-3 text-xs mx-auto">
                  Создать первую заметку
                </Btn>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="flex flex-col justify-between border-l-4 border-l-copper/70 hover:shadow-xs transition-all cursor-pointer"
                  onClick={() => handleOpenNoteModal(note)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-fg line-clamp-1">{note.title}</h3>
                      {note.tag && (
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-copper">
                          {note.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted whitespace-pre-wrap line-clamp-4">
                      {note.content}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line/40 pt-2 text-[10px] text-muted">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <button
                      type="button"
                      aria-label="Удалить заметку"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePersonalNote(note.id);
                      }}
                      className="p-1 hover:text-clay transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Personal Tasks */}
      {tab === "tasks" && (
        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-xs text-muted">
              <ListTodo className="h-8 w-8 mx-auto text-copper/60 mb-2" />
              <p className="font-semibold text-fg">Список дел пуст</p>
              <p className="mt-1">Создайте задачи для повседневных дел, учебы или личных проектов.</p>
              <Btn onClick={() => setTaskModalOpen(true)} className="mt-3 text-xs mx-auto">
                Добавить задачу
              </Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3 transition-opacity",
                    task.done && "opacity-60 bg-surface/50",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => togglePersonalTask(task.id)}
                      className="text-copper hover:scale-110 transition-transform shrink-0"
                    >
                      {task.done ? (
                        <CheckCircle2 className="h-5 w-5 text-sage" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          task.done && "line-through text-muted",
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-muted">
                        <span className="capitalize">{task.category || "личное"}</span>
                        {task.priority && task.priority !== "normal" && (
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded font-medium",
                              task.priority === "high"
                                ? "bg-clay/15 text-clay"
                                : "bg-surface-2 text-muted",
                            )}
                          >
                            {task.priority === "high" ? "Высокий" : "Низкий"}
                          </span>
                        )}
                        {task.due && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {task.due}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить задачу"
                    onClick={() => deletePersonalTask(task.id)}
                    className="p-1.5 text-muted hover:text-clay transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Shopping Lists */}
      {tab === "shopping" && (
        <div className="flex flex-col gap-4">
          {shoppingLists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-xs text-muted">
              <ShoppingCart className="h-8 w-8 mx-auto text-copper/60 mb-2" />
              <p className="font-semibold text-fg">Нет списков покупок</p>
              <p className="mt-1">
                Составляйте списки канцелярии, продуктов или учебных принадлежностей с отметкой купленного.
              </p>
              <Btn onClick={() => setShoppingModalOpen(true)} className="mt-3 text-xs mx-auto">
                Создать первый список
              </Btn>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shoppingLists.map((list) => {
                const boughtCount = list.items.filter((i) => i.bought).length;
                const totalCount = list.items.length;
                return (
                  <Card key={list.id} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line/40">
                        <div>
                          <h3 className="font-bold text-base text-fg">{list.title}</h3>
                          <p className="text-[11px] text-muted">
                            Куплено {boughtCount} из {totalCount}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Удалить список"
                          onClick={() => deleteShoppingList(list.id)}
                          className="p-1.5 text-muted hover:text-clay transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-1.5 mt-3">
                        {list.items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-surface-2/50 transition-colors",
                              item.bought && "opacity-60",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleShoppingItem(list.id, item.id)}
                              className="flex items-center gap-2 text-left min-w-0 flex-1"
                            >
                              {item.bought ? (
                                <CheckCircle2 className="h-4 w-4 text-sage shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-xs truncate",
                                  item.bought && "line-through text-muted",
                                )}
                              >
                                {item.title}
                              </span>
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.amount && (
                                <span className="text-[10px] font-mono text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                                  {item.amount}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteShoppingItem(list.id, item.id)}
                                className="text-muted hover:text-clay p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Item form */}
                    <div className="mt-4 pt-3 border-t border-line/40 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Пункт покупки..."
                        value={newItemTitle[list.id] || ""}
                        onChange={(e) =>
                          setNewItemTitle((prev) => ({ ...prev, [list.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddItem(list.id);
                        }}
                        className={`${controlClass} text-xs flex-1`}
                      />
                      <input
                        type="text"
                        placeholder="Кол-во"
                        value={newItemAmount[list.id] || ""}
                        onChange={(e) =>
                          setNewItemAmount((prev) => ({ ...prev, [list.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddItem(list.id);
                        }}
                        className={`${controlClass} text-xs w-20`}
                      />
                      <Btn
                        onClick={() => handleAddItem(list.id)}
                        className="p-2 shrink-0"
                        title="Добавить"
                      >
                        <Plus className="h-4 w-4" />
                      </Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Habits */}
      {tab === "habits" && (
        <div className="flex flex-col gap-3">
          {habits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-xs text-muted">
              <Flame className="h-8 w-8 mx-auto text-copper/60 mb-2" />
              <p className="font-semibold text-fg">Нет активных привычек</p>
              <p className="mt-1">
                Отслеживайте регулярные действия: чтение, зарядку, изучение языков или режим сна.
              </p>
              <Btn onClick={() => setHabitModalOpen(true)} className="mt-3 text-xs mx-auto">
                Создать трекер привычки
              </Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {habits.map((habit) => {
                const isCompletedToday = habit.completedDates.includes(todayIso);
                return (
                  <Card key={habit.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-base text-fg">{habit.title}</h3>
                        <p className="text-xs text-muted mt-0.5">
                          Период: {habit.period === "daily" ? "Ежедневно" : "Еженедельно"} · Выполнено дней:{" "}
                          <strong>{habit.completedDates.length}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleHabitDate(habit.id, todayIso)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                            isCompletedToday
                              ? "bg-sage text-sage-fg shadow-xs"
                              : "bg-surface-2 text-muted hover:text-fg hover:bg-surface-2/80",
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{isCompletedToday ? "Сделано сегодня!" : "Отметить"}</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить привычку"
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1.5 text-muted hover:text-clay transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer attribution */}
      <footer className="mt-4 pt-3 border-t border-line/30 flex items-center justify-between text-[11px] text-muted">
        <span>MetaPersonal 1.1 · Модуль персональной продуктивности</span>
        <span className="font-medium text-copper/80">Автор концепции — Andárer</span>
      </footer>

      {/* Modal: Note Editor */}
      <Modal
        open={noteModalOpen}
        title={editingNote ? "Редактировать заметку" : "Новая личная заметка"}
        onClose={() => setNoteModalOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <Field label="Заголовок заметки">
            <input
              className={controlClass}
              placeholder="Название или главная мысль..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </Field>
          <Field label="Тег или категория">
            <input
              className={controlClass}
              placeholder="Планы, Идеи, Книги, Покупки..."
              value={noteTag}
              onChange={(e) => setNoteTag(e.target.value)}
            />
          </Field>
          <Field label="Текст заметки">
            <textarea
              className={`${controlClass} h-36 font-sans text-xs`}
              placeholder="Подробный текст, список или ссылка..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
          </Field>
          <Btn onClick={handleSaveNote}>{editingNote ? "Сохранить изменения" : "Создать заметку"}</Btn>
        </div>
      </Modal>

      {/* Modal: Task Editor */}
      <Modal open={taskModalOpen} title="Новая личная задача" onClose={() => setTaskModalOpen(false)}>
        <div className="flex flex-col gap-3">
          <Field label="Что нужно сделать?">
            <input
              className={controlClass}
              placeholder="Название задачи или списка покупок..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </Field>
          <Field label="Срок выполнения (дата)">
            <input
              type="date"
              className={controlClass}
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </Field>
          <Field label="Категория">
            <select
              className={controlClass}
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value as any)}
            >
              <option value="personal">Личное</option>
              <option value="shopping">Покупки</option>
              <option value="project">Проект</option>
              <option value="other">Разное</option>
            </select>
          </Field>
          <Field label="Приоритет">
            <select
              className={controlClass}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as any)}
            >
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
              <option value="low">Низкий</option>
            </select>
          </Field>
          <Btn onClick={handleSaveTask}>Добавить в список дел</Btn>
        </div>
      </Modal>

      {/* Modal: Shopping List Editor */}
      <Modal open={shoppingModalOpen} title="Новый список покупок" onClose={() => setShoppingModalOpen(false)}>
        <div className="flex flex-col gap-3">
          <Field label="Название списка">
            <input
              className={controlClass}
              placeholder="Канцелярия к четверти, Продукты к празднику..."
              value={shoppingListTitle}
              onChange={(e) => setShoppingListTitle(e.target.value)}
            />
          </Field>
          <Btn onClick={handleCreateShoppingList}>Создать список</Btn>
        </div>
      </Modal>

      {/* Modal: Habit Editor */}
      <Modal open={habitModalOpen} title="Новая полезная привычка" onClose={() => setHabitModalOpen(false)}>
        <div className="flex flex-col gap-3">
          <Field label="Название привычки">
            <input
              className={controlClass}
              placeholder="Например: Чтение 20 страниц, Бег, Водный баланс..."
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
            />
          </Field>
          <Field label="Регулярность">
            <select
              className={controlClass}
              value={habitPeriod}
              onChange={(e) => setHabitPeriod(e.target.value as any)}
            >
              <option value="daily">Ежедневно</option>
              <option value="weekly">Еженедельно</option>
            </select>
          </Field>
          <Btn onClick={handleSaveHabit}>Начать отслеживание</Btn>
        </div>
      </Modal>
    </div>
  );
}
