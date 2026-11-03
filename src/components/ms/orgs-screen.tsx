import { useState } from "react";
import { uid } from "@/lib/ms/id";
import { t } from "@/lib/ms/i18n";
import { canCreateSpace, canInSpace } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import type { AvatarTone, SpaceKind } from "@/lib/ms/types";
import { Btn, Card, controlClass, Field } from "@/components/ms/ui";

export function OrgsScreen() {
  const data = useMs((s) => s.data);
  const saveOrgName = useMs((s) => s.saveOrgName);
  const addDivision = useMs((s) => s.addDivision);
  const saveClass = useMs((s) => s.saveClass);
  const removeClass = useMs((s) => s.removeClass);
  const saveGroup = useMs((s) => s.saveGroup);
  const removeGroup = useMs((s) => s.removeGroup);
  const saveSubject = useMs((s) => s.saveSubject);
  const removeSubject = useMs((s) => s.removeSubject);
  const addPeriod = useMs((s) => s.addPeriod);
  const setMinorAi = useMs((s) => s.setMinorAi);
  const saveSpace = useMs((s) => s.saveSpace);
  const createSpace = useMs((s) => s.createSpace);
  const lang = data.lang;
  const space = data.spaces.find((item) => item.id === data.activeSpaceId);
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const canEdit = Boolean(profile && space && (canInSpace(profile, space.id, "members", data.customRoles) || canInSpace(profile, space.id, "roles", data.customRoles)));
  const [division, setDivision] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [groupName, setGroupName] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [homeroom, setHomeroom] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<SpaceKind>("family");
  if (!space) return null;
  const org = data.orgs.find((item) => item.spaceId === space.id);
  const classes = data.classes.filter((item) => item.spaceId === space.id);
  const subjects = data.subjects.filter((item) => item.spaceId === space.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{space.name}</h1>
      <p className="text-sm text-muted">
        {space.kind === "school" ? t(lang, "orgLead") : space.kind === "family" ? t(lang, "familyLead") : t(lang, "personalLead")}
      </p>
      {canEdit ? (
        <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <input
            className="mt-1 h-5 w-5"
            type="checkbox"
            checked={space.aiRestrictedForMinors}
            onChange={(event) => setMinorAi(space.id, event.target.checked)}
          />
          <span>
            <span className="block font-semibold">{t(lang, "minorAi")}</span>
            <span className="text-sm text-muted">{t(lang, "minorAiHint")}</span>
          </span>
        </label>
      ) : null}
      {space.kind !== "school" ? (
        canEdit ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const input = form.elements.namedItem("space") as HTMLInputElement;
              saveSpace({ ...space, name: input.value });
            }}
          >
            <Field label={t(lang, "spaceName")}>
              <input name="space" className={controlClass} defaultValue={space.name} />
            </Field>
            <Btn type="submit">{t(lang, "save")}</Btn>
          </form>
        ) : null
      ) : (
        <>
          {org ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canEdit) return;
                const input = event.currentTarget.elements.namedItem("org") as HTMLInputElement;
                saveOrgName(org.id, input.value);
              }}
            >
              <Field label={t(lang, "orgs")}>
                <input name="org" className={controlClass} defaultValue={org.name} disabled={!canEdit} />
              </Field>
              {canEdit ? <Btn type="submit">{t(lang, "save")}</Btn> : null}
            </form>
          ) : null}
          <Card>
            <h2 className="text-xl">{t(lang, "division")}</h2>
            {data.divisions.filter((item) => item.orgId === org?.id).map((item) => (
              <p key={item.id} className="mt-2 text-sm">{item.name}</p>
            ))}
            {canEdit && org ? (
              <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); if (!division.trim()) return; addDivision(org.id, division.trim()); setDivision(""); }}>
                <input className={controlClass} value={division} onChange={(event) => setDivision(event.target.value)} />
                <Btn type="submit">{t(lang, "add")}</Btn>
              </form>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-xl">{t(lang, "classLabel")}</h2>
            {classes.map((room) => (
              <div key={room.id} className="mt-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-sm text-muted">{data.profiles.find((item) => item.id === room.homeroomTeacherId)?.name ?? t(lang, "none")}</p>
                </div>
                {canEdit ? <Btn variant="danger" onClick={() => removeClass(room.id)}>{t(lang, "delete")}</Btn> : null}
              </div>
            ))}
            {canEdit && org ? (
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!className.trim()) return;
                  saveClass({
                    id: uid(),
                    spaceId: space.id,
                    orgId: org.id,
                    divisionId: data.divisions.find((item) => item.orgId === org.id)?.id,
                    name: className.trim(),
                    homeroomTeacherId: homeroom || undefined,
                  });
                  setClassName("");
                  setHomeroom("");
                }}
              >
                <input className={controlClass} value={className} onChange={(event) => setClassName(event.target.value)} />
                <Field label={t(lang, "homeroomPick")}>
                  <select className={controlClass} value={homeroom} onChange={(event) => setHomeroom(event.target.value)}>
                    <option value="">—</option>
                    {data.profiles
                      .filter((item) => item.memberships.some((membership) => membership.spaceId === space.id))
                      .map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                  </select>
                </Field>
                <Btn type="submit">{t(lang, "add")}</Btn>
              </form>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-xl">{t(lang, "subject")}</h2>
            {subjects.map((item) => (
              <div key={item.id} className="mt-2 flex items-center justify-between">
                <span>{item.name}</span>
                {canEdit ? <Btn variant="ghost" onClick={() => removeSubject(item.id)}>{t(lang, "delete")}</Btn> : null}
              </div>
            ))}
            {canEdit ? (
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!subject.trim()) return;
                  const tones: AvatarTone[] = ["copper", "sage", "clay", "ink"];
                  saveSubject({ id: uid(), spaceId: space.id, name: subject.trim(), tone: tones[subjects.length % tones.length] ?? "copper" });
                  setSubject("");
                }}
              >
                <input className={controlClass} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t(lang, "subjectName")} />
                <Btn type="submit">{t(lang, "add")}</Btn>
              </form>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-xl">{t(lang, "group")}</h2>
            {data.groups.filter((group) => classes.some((room) => room.id === group.classId)).map((group) => (
              <div key={group.id} className="mt-2 flex items-center justify-between">
                <span>{group.name}</span>
                {canEdit ? <Btn variant="ghost" onClick={() => removeGroup(group.id)}>{t(lang, "delete")}</Btn> : null}
              </div>
            ))}
            {canEdit && classes[0] ? (
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const room = classes[0];
                  if (!room || !groupName.trim()) return;
                  saveGroup({ id: uid(), classId: room.id, name: groupName.trim(), studentIds: [] });
                  setGroupName("");
                }}
              >
                <input className={controlClass} value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                <Btn type="submit">{t(lang, "add")}</Btn>
              </form>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-xl">{t(lang, "period")}</h2>
            {data.periods.filter((item) => item.orgId === org?.id).map((item) => (
              <p key={item.id} className="mt-2 text-sm">{item.name}: {item.start} — {item.end}</p>
            ))}
            {canEdit && org ? (
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!periodName.trim()) return;
                  addPeriod(org.id, periodName.trim(), periodStart, periodEnd);
                  setPeriodName("");
                }}
              >
                <input className={controlClass} value={periodName} onChange={(event) => setPeriodName(event.target.value)} />
                <input className={controlClass} type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                <input className={controlClass} type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                <Btn type="submit">{t(lang, "add")}</Btn>
              </form>
            ) : null}
          </Card>
        </>
      )}
      {profile && (canCreateSpace(profile, "family") || canCreateSpace(profile, "personal")) ? (
        <Card>
          <h2 className="text-xl">{t(lang, "addSpace")}</h2>
          <p className="mt-2 text-sm text-muted">{t(lang, "addSpaceLead")}</p>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim() || !canCreateSpace(profile, newKind)) return;
              createSpace({ name: newName.trim(), kind: newKind });
              setNewName("");
            }}
          >
            <input className={controlClass} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t(lang, "spaceName")} />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["family", "modeFamily"],
                  ["personal", "modePersonal"],
                  ["school", "modeSchool"],
                ] as const
              ).map(([value, key]) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canCreateSpace(profile, value)}
                  className={`h-11 rounded-xl text-sm font-semibold disabled:opacity-40 ${newKind === value ? "bg-copper text-copper-fg" : "bg-surface-2 text-fg"}`}
                  onClick={() => setNewKind(value)}
                >
                  {t(lang, key)}
                </button>
              ))}
            </div>
            <Btn type="submit" disabled={!newName.trim() || !canCreateSpace(profile, newKind)}>{t(lang, "continue")}</Btn>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
