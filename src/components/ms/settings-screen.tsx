import { useState } from "react";
import { t } from "@/lib/ms/i18n";
import { canInSpace } from "@/lib/ms/rbac";
import { redactSecrets, useMs } from "@/lib/ms/store";
import type { Lang, Theme } from "@/lib/ms/types";
import { Btn, Card, downloadText } from "@/components/ms/ui";

export function SettingsScreen() {
  const data = useMs((s) => s.data);
  const setLang = useMs((s) => s.setLang);
  const setTheme = useMs((s) => s.setTheme);
  const setNotif = useMs((s) => s.setNotif);
  const importData = useMs((s) => s.importData);
  const resetAll = useMs((s) => s.resetAll);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const canAdmin = Boolean(profile && canInSpace(profile, data.activeSpaceId, "import", data.customRoles) && (profile.memberships.find((item) => item.spaceId === data.activeSpaceId)?.roleKeys ?? []).some((key) => ["creator", "sysadmin", "orgAdmin", "familyAdmin"].includes(key)));
  const canReset = Boolean(profile?.isProjectCreator || canAdmin);
  const [secrets, setSecrets] = useState(false);
  const [message, setMessage] = useState("");
  const [perm, setPerm] = useState("");

  const notifKeys = [
    ["lessonStart", "n_lessonStart"],
    ["lessonEnd", "n_lessonEnd"],
    ["breakStart", "n_breakStart"],
    ["breakEnd", "n_breakEnd"],
    ["remind15", "n_remind15"],
    ["remind5", "n_remind5"],
    ["tasks", "n_tasks"],
    ["personal", "n_personal"],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "settings")}</h1>
      <Card>
        <h2 className="text-xl">{t(lang, "theme")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["light", "themeLight"],
            ["dark", "themeDark"],
            ["system", "themeSystem"],
          ] as const).map(([value, key]) => (
            <Btn key={value} variant={data.theme === value ? "primary" : "ghost"} onClick={() => setTheme(value as Theme)}>
              {t(lang, key)}
            </Btn>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl">{t(lang, "language")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["ru", "uk", "en"] as Lang[]).map((code) => (
            <Btn key={code} variant={lang === code ? "primary" : "ghost"} onClick={() => setLang(code)}>
              {code.toUpperCase()}
            </Btn>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl">{t(lang, "notif")}</h2>
        <p className="mt-2 text-sm text-muted">{t(lang, "notifHint")}</p>
        <div className="mt-3 flex flex-col gap-2">
          {notifKeys.map(([key, label]) => (
            <label key={key} className="flex h-11 items-center justify-between gap-3 text-sm">
              <span>{t(lang, label)}</span>
              <input type="checkbox" checked={data.notif[key]} onChange={(event) => setNotif(key, event.target.checked)} />
            </label>
          ))}
        </div>
        <Btn
          className="mt-3"
          variant="ghost"
          onClick={async () => {
            if (typeof Notification === "undefined") {
              setPerm(t(lang, "notifDenied"));
              return;
            }
            const result = await Notification.requestPermission();
            setPerm(result === "granted" ? t(lang, "notifGranted") : t(lang, "notifDenied"));
          }}
        >
          {t(lang, "notifBrowser")}
        </Btn>
        {perm ? <p className="mt-2 text-sm text-muted">{perm}</p> : null}
        <p className="mt-3 text-sm text-muted">{t(lang, "cloudNotif")}</p>
      </Card>
      <Card>
        <h2 className="text-xl">{t(lang, "exportJson")}</h2>
        {canAdmin ? (
          <>
            <label className="mt-3 flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={secrets} onChange={(event) => setSecrets(event.target.checked)} />
              {t(lang, "includeSecrets")}
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => downloadText("metashkola.json", JSON.stringify(redactSecrets(data, secrets), null, 2), "application/json")}>
                {t(lang, "exportJson")}
              </Btn>
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-surface-2 px-4 text-sm font-semibold">
                {t(lang, "importJson")}
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const raw = JSON.parse(await file.text()) as unknown;
                      const result = importData(raw, "merge");
                      setMessage(result.ok ? t(lang, "imported") : t(lang, "err_format"));
                    } catch {
                      setMessage(t(lang, "err_format"));
                    }
                  }}
                />
              </label>
              <Btn
                variant="ghost"
                onClick={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/json";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const raw = JSON.parse(await file.text()) as unknown;
                      const result = importData(raw, "replace");
                      setMessage(result.ok ? t(lang, "imported") : t(lang, "err_format"));
                    } catch {
                      setMessage(t(lang, "err_format"));
                    }
                  };
                  input.click();
                }}
              >
                {t(lang, "replace")}
              </Btn>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{t(lang, "noAccess")}</p>
        )}
        {message ? <p className="mt-2 text-sm text-sage">{message}</p> : null}
      </Card>
      <Card>
        <h2 className="text-xl">{t(lang, "about")}</h2>
        <p className="mt-2 text-sm">{t(lang, "aboutBody")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "authorLine")}</p>
        <h3 className="mt-4 text-lg">{t(lang, "architecture")}</h3>
        <p className="mt-2 text-sm">{t(lang, "archOk")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "archNo")}</p>
        <p className="mt-2 text-sm text-muted">{t(lang, "delivery")}</p>
      </Card>
      <Card>
        <h2 className="text-xl">{t(lang, "audit")}</h2>
        {data.audit.slice(0, 12).map((item) => (
          <p key={item.id} className="mt-2 text-sm text-muted">{item.text}</p>
        ))}
      </Card>
      {canReset ? (
        <Btn
          variant="danger"
          onClick={() => {
            if (window.confirm(t(lang, "resetConfirm"))) resetAll();
          }}
        >
          {t(lang, "reset")}
        </Btn>
      ) : null}
    </div>
  );
}
