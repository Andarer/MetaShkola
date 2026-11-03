import { useState } from "react";
import { TrendingUp, Award, BarChart3, CheckCircle, Clock } from "lucide-react";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeGrade, canSeeTask, membershipOf } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { toISODate } from "@/lib/ms/time";
import type { Grade, Homework, Priority, TaskStatus } from "@/lib/ms/types";
import { Btn, Card, areaClass, controlClass, Field, Modal, personName, subjectOf } from "@/components/ms/ui";

function statusKey(status: TaskStatus): CopyKey {
  if (status === "progress") return "st_progress";
  if (status === "done") return "st_done";
  if (status === "checked") return "st_checked";
  if (status === "returned") return "st_returned";
  return "st_assigned";
}

function priorityKey(priority: Priority): CopyKey {
  if (priority === "high") return "pr_high";
  if (priority === "low") return "pr_low";
  return "pr_normal";
}

export function TasksScreen() {
  const data = useMs((s) => s.data);
  const setTaskStatus = useMs((s) => s.setTaskStatus);
  const addComment = useMs((s) => s.addComment);
  const saveTask = useMs((s) => s.saveTask);
  const removeTask = useMs((s) => s.removeTask);
  const saveGrade = useMs((s) => s.saveGrade);
  const removeGrade = useMs((s) => s.removeGrade);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const spaceId = data.activeSpaceId;

  const [viewTab, setViewTab] = useState<"tasks" | "grades" | "analytics">("tasks");
  const [openOnly, setOpenOnly] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [note, setNote] = useState("");

  const canTasks = Boolean(profile && canInSpace(profile, spaceId, "tasks", data.customRoles));
  const canGrades = Boolean(profile && canInSpace(profile, spaceId, "grades", data.customRoles));

  const tasks = data.tasks
    .filter((task) => canSeeTask(data, profile, task))
    .filter((task) => (openOnly ? task.status !== "checked" : true))
    .sort((a, b) => a.due.localeCompare(b.due));

  const grades = data.grades.filter((grade) => canSeeGrade(data, profile, grade));
  const current = tasks.find((task) => task.id === selected) ?? null;

  // Analytics Computations
  const numericScores = grades.map((g) => Number(g.score)).filter((n) => !isNaN(n) && n > 0);
  const avgScore = numericScores.length > 0 ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1) : "—";
  const maxScore = numericScores.length > 0 ? Math.max(...numericScores) : "—";
  const minScore = numericScores.length > 0 ? Math.min(...numericScores) : "—";

  // Per-subject analytics
  const spaceSubjects = data.subjects.filter((s) => s.spaceId === spaceId);
  const subjectStats = spaceSubjects
    .map((sub) => {
      const subGrades = grades.filter((g) => g.subjectId === sub.id);
      const scores = subGrades.map((g) => Number(g.score)).filter((n) => !isNaN(n) && n > 0);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        subject: sub,
        count: subGrades.length,
        avg: avg !== null ? avg.toFixed(1) : "—",
        avgNum: avg ?? 0,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.avgNum - a.avgNum);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t(lang, "tasks")}</h1>
        <div className="flex gap-2">
          {viewTab === "tasks" && canTasks ? <Btn onClick={() => setComposer(true)}>{t(lang, "add")}</Btn> : null}
          {viewTab === "grades" && canGrades ? <Btn onClick={() => setGradeOpen(true)}>{t(lang, "newGrade")}</Btn> : null}
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <Btn variant={viewTab === "tasks" ? "primary" : "ghost"} onClick={() => setViewTab("tasks")} className="text-xs">
          Задания ({tasks.length})
        </Btn>
        <Btn variant={viewTab === "grades" ? "primary" : "ghost"} onClick={() => setViewTab("grades")} className="text-xs">
          Оценки ({grades.length})
        </Btn>
        <Btn variant={viewTab === "analytics" ? "primary" : "ghost"} onClick={() => setViewTab("analytics")} className="text-xs flex items-center justify-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Аналитика</span>
        </Btn>
      </div>

      {viewTab === "tasks" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Btn variant={openOnly ? "primary" : "ghost"} onClick={() => setOpenOnly(true)} className="text-xs">
              {t(lang, "allOpen")}
            </Btn>
            <Btn variant={!openOnly ? "primary" : "ghost"} onClick={() => setOpenOnly(false)} className="text-xs">
              {t(lang, "allTasks")}
            </Btn>
          </div>
          {tasks.length === 0 ? <p className="text-sm text-muted">{t(lang, "noTasks")}</p> : null}
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:border-copper/40"
              onClick={() => {
                setSelected(task.id);
                setNote("");
              }}
            >
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{subjectOf(data, task.subjectId)?.name}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" /> {task.due}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-fg">{task.title}</h2>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>Исполнитель: {personName(data, task.assigneeId)}</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-copper">
                  {t(lang, statusKey(task.status))}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewTab === "grades" && (
        <div className="flex flex-col gap-3">
          {grades.length === 0 ? <p className="text-sm text-muted">{t(lang, "none")}</p> : null}
          {grades.map((grade) => (
            <Card key={grade.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {personName(data, grade.studentId)} · {subjectOf(data, grade.subjectId)?.name}
                  </p>
                  <p className="text-xs text-muted">{grade.date}{grade.comment ? ` · ${grade.comment}` : ""}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-copper/10 font-display text-2xl font-bold text-copper tabular-nums">
                  {grade.score}
                </div>
              </div>
              {canGrades ? (
                <div className="mt-2 border-t border-line/40 pt-2 flex justify-end">
                  <Btn variant="danger" className="text-xs h-7 py-0" onClick={() => removeGrade(grade.id)}>
                    {t(lang, "delete")}
                  </Btn>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {viewTab === "analytics" && (
        <div className="flex flex-col gap-4">
          {/* Key KPI summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3">
              <p className="text-xs text-muted">Средний балл (GPA)</p>
              <p className="mt-1 font-display text-3xl font-bold text-copper tabular-nums">{avgScore}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Всего оценок</p>
              <p className="mt-1 font-display text-3xl font-bold text-fg tabular-nums">{numericScores.length}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Высший балл</p>
              <p className="mt-1 font-display text-3xl font-bold text-sage tabular-nums">{maxScore}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Низший балл</p>
              <p className="mt-1 font-display text-3xl font-bold text-muted tabular-nums">{minScore}</p>
            </Card>
          </div>

          {/* Subject Average Comparison */}
          <Card>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-copper" />
              <span>Успеваемость по предметам</span>
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {subjectStats.length === 0 ? (
                <p className="text-xs text-muted">Недостаточно оценок для построения предметной аналитики.</p>
              ) : null}
              {subjectStats.map((item) => {
                const percent = Math.min(100, Math.round((item.avgNum / 12) * 100));
                return (
                  <div key={item.subject.id} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span>{item.subject.name}</span>
                      <span className="font-semibold tabular-nums text-copper">
                        {item.avg} ({item.count} {item.count === 1 ? "оценка" : "оценок"})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-copper transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Task Modal */}
      <Modal open={Boolean(current)} title={current?.title ?? ""} onClose={() => setSelected(null)}>
        {current ? (
          <TaskBody
            task={current}
            note={note}
            setNote={setNote}
            canTasks={canTasks}
            isAssignee={current.assigneeId === profile?.id}
            onStatus={(status) => profile && setTaskStatus(current.id, status, profile.id)}
            onComment={() => {
              if (!profile || !note.trim()) return;
              addComment(current.id, profile.id, note.trim());
              setNote("");
            }}
            onDelete={() => {
              removeTask(current.id);
              setSelected(null);
            }}
          />
        ) : null}
      </Modal>

      <TaskComposer open={composer} spaceId={spaceId} onClose={() => setComposer(false)} onSave={saveTask} />
      <GradeComposer open={gradeOpen} spaceId={spaceId} onClose={() => setGradeOpen(false)} onSave={(grade) => { saveGrade(grade); setGradeOpen(false); }} />
    </div>
  );
}

function TaskBody({
  task,
  note,
  setNote,
  canTasks,
  isAssignee,
  onStatus,
  onComment,
  onDelete,
}: {
  task: Homework;
  note: string;
  setNote: (value: string) => void;
  canTasks: boolean;
  isAssignee: boolean;
  onStatus: (status: TaskStatus) => void;
  onComment: () => void;
  onDelete: () => void;
}) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{task.due} · {subjectOf(data, task.subjectId)?.name}</p>
      <p className="whitespace-pre-wrap text-sm">{task.detail || "Нет дополнительного описания"}</p>
      <div className="flex flex-wrap gap-2">
        {(["assigned", "progress", "done", "checked", "returned"] as TaskStatus[]).map((status) => (
          <Btn
            key={status}
            variant={task.status === status ? "primary" : "ghost"}
            disabled={!isAssignee && !canTasks}
            onClick={() => onStatus(status)}
          >
            {t(lang, statusKey(status))}
          </Btn>
        ))}
      </div>
      <h3 className="text-lg">{t(lang, "comments")}</h3>
      {task.comments.length === 0 ? <p className="text-sm text-muted">Нет комментариев</p> : null}
      {task.comments.map((comment) => (
        <article key={comment.id} className="border-b border-line py-2">
          <p className="text-sm font-semibold">{personName(data, comment.authorId)}</p>
          <p className="text-sm">{comment.text}</p>
        </article>
      ))}
      <Field label="Новый комментарий">
        <textarea className={areaClass} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Btn onClick={onComment}>{t(lang, "add")}</Btn>
        {canTasks ? <Btn variant="danger" onClick={onDelete}>{t(lang, "delete")}</Btn> : null}
      </div>
    </div>
  );
}

function TaskComposer({
  open,
  spaceId,
  onClose,
  onSave,
}: {
  open: boolean;
  spaceId: string;
  onClose: () => void;
  onSave: (task: Homework) => void;
}) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const subjects = data.subjects.filter((item) => item.spaceId === spaceId);
  const members = data.profiles.filter((profile) => profile.memberships.some((item) => item.spaceId === spaceId));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(members[0]?.id ?? "");
  const [due, setDue] = useState(toISODate(new Date()));
  const [priority, setPriority] = useState<Priority>("normal");

  if (!open) return null;

  return (
    <Modal open={open} title={t(lang, "newTask")} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          onSave({
            id: uid(),
            spaceId,
            subjectId: subjectId || subjects[0]?.id || "",
            assigneeId: assigneeId || members[0]?.id || "",
            title: title.trim(),
            detail: description.trim(),
            due,
            priority,
            status: "assigned",
            comments: [],
            attachments: [],
            history: [{ at: new Date().toISOString(), text: "Задание создано" }],
          });
          onClose();
        }}
      >
        <Field label={t(lang, "title")}><input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
        <Field label={t(lang, "subject")}>
          <select className={controlClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label={t(lang, "assignee")}>
          <select className={controlClass} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label={t(lang, "due")}><input className={controlClass} type="date" value={due} onChange={(event) => setDue(event.target.value)} /></Field>
        <Field label={t(lang, "priority")}>
          <select className={controlClass} value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            <option value="low">{t(lang, "pr_low")}</option>
            <option value="normal">{t(lang, "pr_normal")}</option>
            <option value="high">{t(lang, "pr_high")}</option>
          </select>
        </Field>
        <Field label="Описание задания"><textarea className={areaClass} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <Btn type="submit">{t(lang, "save")}</Btn>
      </form>
    </Modal>
  );
}

function GradeComposer({
  open,
  spaceId,
  onClose,
  onSave,
}: {
  open: boolean;
  spaceId: string;
  onClose: () => void;
  onSave: (grade: Grade) => void;
}) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const subjects = data.subjects.filter((item) => item.spaceId === spaceId);
  const students = data.profiles.filter((profile) =>
    profile.memberships.some((item) => item.spaceId === spaceId && (item.roleKeys.includes("student") || item.roleKeys.includes("child"))),
  );
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [score, setScore] = useState("12");
  const [comment, setComment] = useState("");

  if (!open) return null;

  return (
    <Modal open={open} title={t(lang, "newGrade")} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: uid(),
            spaceId,
            studentId: studentId || students[0]?.id || "",
            subjectId: subjectId || subjects[0]?.id || "",
            date: toISODate(new Date()),
            score: Number(score.trim()) || 12,
            kind: "mark",
            comment: comment.trim(),
          });
        }}
      >
        <Field label="Ученик">
          <select className={controlClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label={t(lang, "subject")}>
          <select className={controlClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label={t(lang, "score")}><input className={controlClass} type="number" min={1} max={100} value={score} onChange={(event) => setScore(event.target.value)} required /></Field>
        <Field label={t(lang, "comment")}><input className={controlClass} value={comment} onChange={(event) => setComment(event.target.value)} /></Field>
        <Btn type="submit">{t(lang, "save")}</Btn>
      </form>
    </Modal>
  );
}
