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
} from "lucide-react";
import { Btn, Card, controlClass, Field, Modal, toneBorder } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";
import { toISODate } from "@/lib/ms/time";
import type { Habit, PersonalNote, PersonalTask } from "@/lib/ms/types";
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

  const [tab, setTab] = useState<"notes" | "tasks" | "habits">("notes");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  // Note draft
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTag, setNoteTag] = useState("Идеи");

  // Task draft
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState<"personal" | "shopping" | "project" | "other">("personal");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">("normal");

  // Habit draft
  const [habitTitle, setHabitTitle] = useState("");
  const [habitPeriod, setHabitPeriod] = useState<"daily" | "weekly">("daily");

  const notes = (data.personalNotes || []).filter((n) => n.profileId === activeProfileId);
  const tasks = (data.personalTasks || []).filter((t) => t.profileId === activeProfileId);
  const habits = (data.habits || []).filter((h) => h.profileId === activeProfileId);

  const todayIso = toISODate(new Date());

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
      createdAt: new Date().toISOString(),
    });
    setTaskTitle("");
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
            MetaPersonal · Личные заметки, повседневные списки дел и трекер привычек
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
        {tab === "habits" && (
          <Btn onClick={() => setHabitModalOpen(true)} className="flex items-center gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>Добавить привычку</span>
          </Btn>
        )}
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
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
          <span>Списки ({tasks.filter((t) => !t.done).length})</span>
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
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-xs text-muted">
              <StickyNote className="h-8 w-8 mx-auto text-copper/60 mb-2" />
              <p className="font-semibold text-fg">Пока нет личных заметок</p>
              <p className="mt-1">Записывайте мысли, идеи, черновики или списки покупок.</p>
              <Btn onClick={() => handleOpenNoteModal()} className="mt-3 text-xs mx-auto">
                Создать первую заметку
              </Btn>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.map((note) => (
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
              <p className="mt-1">Создайте задачи для повседневных дел, покупок или личных проектов.</p>
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
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                        <span className="capitalize">{task.category || "личное"}</span>
                        {task.due && <span>· Срок: {task.due}</span>}
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
