import { useState } from "react";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { blankGrants, canInSpace, isRoleKey } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import { ACTIONS, ROLE_KEYS, type Action, type AvatarTone, type Profile, type RoleKey } from "@/lib/ms/types";
import { Avatar, Btn, Card, controlClass, Field, Modal } from "@/components/ms/ui";

const ROLE_LABEL: Record<RoleKey, CopyKey> = {
  creator: "role_creator",
  sysadmin: "role_sysadmin",
  orgAdmin: "role_orgAdmin",
  familyAdmin: "role_familyAdmin",
  parent: "role_parent",
  teacher: "role_teacher",
  homeroom: "role_homeroom",
  student: "role_student",
  guest: "role_guest",
};

export function PeopleScreen({ onSwitch }: { onSwitch: (id: string) => void }) {
  const data = useMs((s) => s.data);
  const saveProfile = useMs((s) => s.saveProfile);
  const removeProfile = useMs((s) => s.removeProfile);
  const setPin = useMs((s) => s.setPin);
  const saveCustomRole = useMs((s) => s.saveCustomRole);
  const joinProfile = useMs((s) => s.joinProfile);
  const lang = data.lang;
  const me = data.profiles.find((item) => item.id === data.activeProfileId);
  const canMembers = Boolean(me && canInSpace(me, data.activeSpaceId, "members", data.customRoles));
  const canRoles = Boolean(me && canInSpace(me, data.activeSpaceId, "roles", data.customRoles));
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [joinRoles, setJoinRoles] = useState<string[]>(["student"]);
  const visible = data.profiles.filter((profile) => profile.memberships.some((item) => item.spaceId === data.activeSpaceId));
  const outsiders = data.profiles.filter((profile) => !profile.memberships.some((item) => item.spaceId === data.activeSpaceId));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "people")}</h1>
      <p className="text-sm text-muted">{t(lang, "peopleLead")}</p>
      {canMembers ? <Btn onClick={() => setOpen(true)}>{t(lang, "addPerson")}</Btn> : <p className="text-sm text-muted">{t(lang, "noAccess")}</p>}
      {visible.map((profile) => {
        const membership = profile.memberships.find((item) => item.spaceId === data.activeSpaceId);
        return (
          <Card key={profile.id}>
            <div className="flex items-center gap-3">
              <Avatar name={profile.name} tone={profile.tone} />
              <div>
                <h2 className="text-xl">{profile.name}</h2>
                <p className="text-sm text-muted">
                  {(membership?.roleKeys ?? []).map((key) => (isRoleKey(key) ? t(lang, ROLE_LABEL[key]) : data.customRoles.find((role) => role.id === key)?.name ?? key)).join(", ")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => onSwitch(profile.id)}>{t(lang, "switchProfile")}</Btn>
              {canMembers && !profile.isProjectCreator ? <Btn variant="danger" onClick={() => removeProfile(profile.id)}>{t(lang, "delete")}</Btn> : null}
            </div>
            {canMembers ? <PinRow profile={profile} onSet={(pin) => setPin(profile.id, pin)} /> : null}
          </Card>
        );
      })}
      {canMembers && outsiders.length > 0 ? (
        <Card>
          <h2 className="text-xl">{t(lang, "joinExisting")}</h2>
          <p className="mt-2 text-sm text-muted">{t(lang, "joinLead")}</p>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!joinId || joinRoles.length === 0) return;
              joinProfile(joinId, joinRoles);
              setJoinId("");
            }}
          >
            <select className={controlClass} value={joinId} onChange={(event) => setJoinId(event.target.value)}>
              <option value="">—</option>
              {outsiders.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              {ROLE_KEYS.filter((key) => key !== "creator").map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`h-11 rounded-xl px-3 text-sm font-semibold ${joinRoles.includes(key) ? "bg-copper text-copper-fg" : "bg-surface-2 text-fg"}`}
                  onClick={() => setJoinRoles((list) => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]))}
                >
                  {t(lang, ROLE_LABEL[key])}
                </button>
              ))}
            </div>
            <Btn type="submit" disabled={!joinId || joinRoles.length === 0}>{t(lang, "add")}</Btn>
          </form>
        </Card>
      ) : null}
      {canRoles ? (
        <>
          <h2 className="text-2xl">{t(lang, "customRole")}</h2>
          <Btn variant="ghost" onClick={() => setRoleOpen(true)}>{t(lang, "add")}</Btn>
          {data.customRoles.map((role) => (
            <p key={role.id} className="text-sm">{role.name}</p>
          ))}
          <RoleComposer open={roleOpen} onClose={() => setRoleOpen(false)} onSave={saveCustomRole} />
        </>
      ) : null}
      <PersonComposer open={open} onClose={() => setOpen(false)} onSave={saveProfile} />
    </div>
  );
}

function PinRow({ profile, onSet }: { profile: Profile; onSet: (pin: string | undefined) => void }) {
  const lang = useMs((s) => s.data.lang);
  const [pin, setPin] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (pin.trim()) onSet(pin.trim());
      }}
    >
      <input className={controlClass} inputMode="numeric" placeholder={t(lang, "pinPh")} value={pin} onChange={(event) => setPin(event.target.value)} />
      <Btn type="submit">{t(lang, "setPin")}</Btn>
      {profile.pin ? <Btn variant="ghost" onClick={() => onSet(undefined)}>{t(lang, "clearPin")}</Btn> : null}
    </form>
  );
}

function PersonComposer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (profile: Profile) => void }) {
  const data = useMs((s) => s.data);
  const lang = data.lang;
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>(["student"]);
  const [classId, setClassId] = useState("");
  const [childIds, setChildIds] = useState<string[]>([]);
  const classes = data.classes.filter((item) => item.spaceId === data.activeSpaceId);
  const students = data.profiles.filter((item) => item.memberships.some((membership) => membership.roleKeys.includes("student")));
  if (!open) return null;
  const toggle = (key: string) => setRoles((list) => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]));
  return (
    <Modal open={open} title={t(lang, "addPerson")} onClose={onClose}>
      <Field label={t(lang, "yourName")}><input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <p className="text-sm text-muted">{t(lang, "roles")}</p>
      <div className="flex flex-wrap gap-2">
        {ROLE_KEYS.filter((key) => key !== "creator").map((key) => (
          <button key={key} type="button" className={`h-11 rounded-xl px-3 text-sm font-semibold ${roles.includes(key) ? "bg-copper text-copper-fg" : "bg-surface-2 text-fg"}`} onClick={() => toggle(key)}>
            {t(lang, ROLE_LABEL[key])}
          </button>
        ))}
        {data.customRoles.map((role) => (
          <button key={role.id} type="button" className={`h-11 rounded-xl px-3 text-sm font-semibold ${roles.includes(role.id) ? "bg-copper text-copper-fg" : "bg-surface-2 text-fg"}`} onClick={() => toggle(role.id)}>
            {role.name}
          </button>
        ))}
      </div>
      <Field label={t(lang, "classLabel")}>
        <select className={controlClass} value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">—</option>
          {classes.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </Field>
      {roles.includes("parent") ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t(lang, "children")}</p>
          {students.map((student) => (
            <label key={student.id} className="flex h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={childIds.includes(student.id)}
                onChange={() => setChildIds((list) => (list.includes(student.id) ? list.filter((id) => id !== student.id) : [...list, student.id]))}
              />
              {student.name}
            </label>
          ))}
        </div>
      ) : null}
      <Btn
        disabled={!name.trim() || roles.length === 0}
        onClick={() => {
          const tone: AvatarTone = "sage";
          onSave({
            id: uid(),
            name: name.trim(),
            tone,
            memberships: [{ spaceId: data.activeSpaceId, roleKeys: roles, classId: classId || undefined, childIds: childIds.length ? childIds : undefined }],
          });
          onClose();
        }}
      >
        {t(lang, "save")}
      </Btn>
    </Modal>
  );
}

function RoleComposer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (role: { id: string; name: string; grants: Record<Action, boolean> }) => void }) {
  const lang = useMs((s) => s.data.lang);
  const [name, setName] = useState("");
  const [grants, setGrants] = useState(blankGrants());
  if (!open) return null;
  return (
    <Modal open={open} title={t(lang, "customRole")} onClose={onClose}>
      <Field label={t(lang, "roleName")}><input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      {ACTIONS.map((action) => (
        <label key={action} className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={grants[action]}
            onChange={() => setGrants((current) => ({ ...current, [action]: !current[action] }))}
          />
          {action}
        </label>
      ))}
      <Btn
        disabled={!name.trim()}
        onClick={() => {
          onSave({ id: uid(), name: name.trim(), grants });
          onClose();
        }}
      >
        {t(lang, "save")}
      </Btn>
    </Modal>
  );
}
