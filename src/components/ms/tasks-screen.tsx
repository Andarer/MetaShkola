import { useState } from "react";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t(lang, "tasks")}</h1>
        {canTasks ? <Btn onClick={() => setComposer(true)}>{t(lang, "add")}</Btn> : null}
      </div>
      <div className="flex gap-2">
        <Btn variant={openOnly ? "primary" : "ghost"} onClick={() => setOpenOnly(true)}>{t(lang, "allOpen")}</Btn>
        <Btn variant={!openOnly ? "primary" : "ghost"} onClick={() => setOpenOnly(false)}>{t(lang, "allTasks")}</Btn>
      </div>
      {tasks.length === 0 ? <p className="text-sm text-muted">{t(lang, "noTasks")}</p> : null}
      {tasks.map((task) => (
        <button key={task.id} type="button" className="rounded-2xl border border-line bg-surface p-4 text-left" onClick={() => { setSelected(task.id); setNote(""); }}>
          <p className="text-sm text-muted">{data.spaces.find((space) => space.id === task.spaceId)?.name} · {subjectOf(data, task.subjectId)?.name} · {task.due}</p>
          <h2 className="text-xl">{task.title}</h2>
          <p className="text-sm">{personName(data, task.assigneeId)} · {t(lang, statusKey(task.status))} · {t(lang, priorityKey(task.priority))}</p>
        </button>
      ))}
      <h2 className="text-2xl">{t(lang, "grades")}</h2>
      {canGrades ? <Btn variant="ghost" onClick={() => setGradeOpen(true)}>{t(lang, "newGrade")}</Btn> : null}
      {grades.length === 0 ? <p className="text-sm text-muted">{t(lang, "none")}</p> : null}
      {grades.map((grade) => (
        <Card key={grade.id}>
          <p className="font-semibold">{personName(data, grade.studentId)} · {subjectOf(data, grade.subjectId)?.name}</p>
          <p className="font-display text-3xl tabular-nums">{grade.score}</p>
          <p className="text-sm text-muted">{grade.date}{grade.comment ? ` · ${grade.comment}` : ""}</p>
          {canGrades ? <Btn variant="danger" className="mt-2" onClick={() => removeGrade(grade.id)}>{t(lang, "delete")}</Btn> : null}
        </Card>
      ))}

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
      {profile && membershipOf(profile, spaceId)?.roleKeys.includes("guest") ? null : null}
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
    <>
      <p className="text-sm text-muted">{t(lang, "due")}: {task.due} · {t(lang, priorityKey(task.priority))}</p>
      <p>{task.detail}</p>
      {task.attachments.map((file) => (
        <a key={file.id} className="text-sm font-semibold text-copper" href={file.href} target="_blank" rel="noreferrer">{file.name}</a>
      ))}
      <p className="text-sm font-semibold">{t(lang, statusKey(task.status))}</p>
      <div className="flex flex-wrap gap-2">
        {isAssignee && (task.status === "assigned" || task.status === "returned") ? (
          <Btn onClick={() => onStatus("progress")}>{t(lang, "takeProgress")}</Btn>
        ) : null}
        {isAssignee && (task.status === "progress" || task.status === "assigned") ? (
          <Btn onClick={() => onStatus("done")}>{t(lang, "markDone")}</Btn>
        ) : null}
        {canTasks ? <Btn onClick={() => onStatus("checked")}>{t(lang, "markChecked")}</Btn> : null}
        {canTasks ? <Btn variant="ghost" onClick={() => onStatus("returned")}>{t(lang, "markReturned")}</Btn> : null}
      </div>
      <h3 className="text-lg">{t(lang, "comments")}</h3>
      {task.comments.map((comment) => (
        <p key={comment.id} className="text-sm"><span className="font-semibold">{personName(data, comment.authorId)}. </span>{comment.text}</p>
      ))}
      <Field label={t(lang, "comment")}>
        <textarea className={areaClass} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      <Btn variant="ghost" onClick={onComment}>{t(lang, "save")}</Btn>
      {task.history.length > 0 ? (
        <div>
          <h3 className="text-lg">{t(lang, "history")}</h3>
          {task.history.map((item) => (
            <p key={item.at + item.text} className="text-sm text-muted">{item.text}</p>
          ))}
        </div>
      ) : null}
      {canTasks ? <Btn variant="danger" onClick={onDelete}>{t(lang, "delete")}</Btn> : null}
    </>
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
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [due, setDue] = useState(toISODate(new Date()));
  const [priority, setPriority] = useState<Priority>("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [href, setHref] = useState("");
  const [fileNote, setFileNote] = useState("");
  const students = data.profiles.filter((item) => item.memberships.some((membership) => membership.spaceId === spaceId && membership.roleKeys.includes("student")));
  const subjects = data.subjects.filter((item) => item.spaceId === spaceId);
  if (!open) return null;
  return (
    <Modal open={open} title={t(lang, "newTask")} onClose={onClose}>
      <Field label={t(lang, "title")}><input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label={t(lang, "detail")}><textarea className={areaClass} value={detail} onChange={(event) => setDetail(event.target.value)} /></Field>
      <Field label={t(lang, "assignee")}>
        <select className={controlClass} value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
          <option value="">—</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "subject")}>
        <select className={controlClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          <option value="">—</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
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
      <Field label={t(lang, "attachment")}><input className={controlClass} placeholder={t(lang, "linkPh")} value={href} onChange={(event) => setHref(event.target.value)} /></Field>
      <Field label={t(lang, "attachment")}>
        <input
          className={controlClass}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 180000) {
              setFileNote(t(lang, "fileLimit"));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") setHref(reader.result);
            };
            reader.readAsDataURL(file);
          }}
        />
      </Field>
      {fileNote ? <p className="text-sm text-clay">{fileNote}</p> : null}
      <Btn
        disabled={!title.trim() || !assigneeId}
        onClick={() => {
          const classId = data.profiles.find((item) => item.id === assigneeId)?.memberships.find((item) => item.classId)?.classId;
          onSave({
            id: uid(),
            spaceId,
            assigneeId,
            classId,
            subjectId: subjectId || undefined,
            title: title.trim(),
            detail: detail.trim(),
            due,
            priority,
            status: "assigned",
            teacherId: profile?.id,
            comments: [],
            attachments: href ? [{ id: uid(), name: href.startsWith("data:") ? "file" : href, href }] : [],
            history: [{ at: new Date().toISOString(), text: "created" }],
          });
          onClose();
        }}
      >
        {t(lang, "save")}
      </Btn>
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
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [score, setScore] = useState(10);
  const [comment, setComment] = useState("");
  const students = data.profiles.filter((item) => item.memberships.some((membership) => membership.spaceId === spaceId && membership.roleKeys.includes("student")));
  const subjects = data.subjects.filter((item) => item.spaceId === spaceId);
  if (!open) return null;
  return (
    <Modal open={open} title={t(lang, "newGrade")} onClose={onClose}>
      <Field label={t(lang, "assignee")}>
        <select className={controlClass} value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">—</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "subject")}>
        <select className={controlClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "score")}>
        <input className={controlClass} type="number" min={1} max={12} value={score} onChange={(event) => setScore(Math.min(12, Math.max(1, Number(event.target.value) || 1)))} />
      </Field>
      <Field label={t(lang, "comment")}>
        <input className={controlClass} value={comment} onChange={(event) => setComment(event.target.value)} />
      </Field>
      <Btn
        disabled={!studentId || !subjectId}
        onClick={() =>
          onSave({
            id: uid(),
            spaceId,
            studentId,
            subjectId,
            teacherId: profile?.id,
            score,
            kind: "mark",
            date: toISODate(new Date()),
            comment,
          })
        }
      >
        {t(lang, "save")}
      </Btn>
    </Modal>
  );
}
