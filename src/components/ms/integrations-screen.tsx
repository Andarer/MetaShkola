import { useState } from "react";
import { uid } from "@/lib/ms/id";
import type { CopyKey } from "@/lib/ms/i18n";
import { t } from "@/lib/ms/i18n";
import { canInSpace, canSeeEvent } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import type { IntegrationService, SyncData, SyncDirection } from "@/lib/ms/types";
import { Btn, Card, controlClass, downloadText, Field } from "@/components/ms/ui";

const SERVICES: { id: IntegrationService; key: CopyKey }[] = [
  { id: "google-calendar", key: "svc_google_calendar" },
  { id: "google-drive", key: "svc_google_drive" },
  { id: "gmail", key: "svc_gmail" },
  { id: "classroom", key: "svc_classroom" },
  { id: "outlook", key: "svc_outlook" },
  { id: "onedrive", key: "svc_onedrive" },
  { id: "ms-calendar", key: "svc_ms_calendar" },
  { id: "telegram", key: "svc_telegram" },
  { id: "caldav", key: "svc_caldav" },
  { id: "webdav", key: "svc_webdav" },
  { id: "rest", key: "svc_rest" },
];

function icsStamp(iso: string): string {
  return iso.replace(/-/g, "") + "T000000";
}

export function IntegrationsScreen() {
  const data = useMs((s) => s.data);
  const saveIntegration = useMs((s) => s.saveIntegration);
  const removeIntegration = useMs((s) => s.removeIntegration);
  const saveRule = useMs((s) => s.saveRule);
  const removeRule = useMs((s) => s.removeRule);
  const logSync = useMs((s) => s.logSync);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const allowed = Boolean(profile && canInSpace(profile, data.activeSpaceId, "integrations", data.customRoles));
  const [service, setService] = useState<IntegrationService>("google-calendar");
  const [account, setAccount] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [direction, setDirection] = useState<SyncDirection>("export");
  const [dataKind, setDataKind] = useState<SyncData>("calendar");

  const exportIcs = () => {
    const events = data.events.filter((event) => canSeeEvent(data, profile, event));
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MetaShkola//RU"];
    for (const event of events) {
      lines.push("BEGIN:VEVENT", `UID:${event.id}@metashkola`, `DTSTART;VALUE=DATE:${icsStamp(event.date).slice(0, 8)}`, `SUMMARY:${event.title.replace(/[\n,;]/g, " ")}`, "END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    downloadText("metashkola.ics", lines.join("\r\n"), "text/calendar");
    logSync("ICS exported locally", true);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "integrations")}</h1>
      <p className="text-sm text-muted">{t(lang, "integrationsLead")}</p>
      <Btn variant="ghost" onClick={exportIcs}>{t(lang, "exportIcs")}</Btn>
      {allowed ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveIntegration({ id: uid(), service, label: t(lang, SERVICES.find((item) => item.id === service)?.key ?? "svc_rest"), accountLabel: account, enabled: true });
            setAccount("");
          }}
        >
          <Field label={t(lang, "preset")}>
            <select className={controlClass} value={service} onChange={(event) => setService(event.target.value as IntegrationService)}>
              {SERVICES.map((item) => <option key={item.id} value={item.id}>{t(lang, item.key)}</option>)}
            </select>
          </Field>
          <Field label={t(lang, "accountLabel")}>
            <input className={controlClass} value={account} onChange={(event) => setAccount(event.target.value)} />
          </Field>
          <Btn type="submit">{t(lang, "add")}</Btn>
        </form>
      ) : (
        <p className="text-sm text-muted">{t(lang, "noAccess")}</p>
      )}
      {data.integrations.map((item) => (
        <Card key={item.id}>
          <h2 className="text-xl">{item.label}</h2>
          <p className="text-sm text-muted">{item.accountLabel || t(lang, "none")}</p>
          {allowed ? <Btn variant="danger" className="mt-2" onClick={() => removeIntegration(item.id)}>{t(lang, "delete")}</Btn> : null}
        </Card>
      ))}
      {allowed && data.integrations.length > 0 ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const id = integrationId || data.integrations[0]?.id;
            if (!id) return;
            saveRule({ id: uid(), integrationId: id, direction, dataKind, frequency: "manual", profileId: "all", enabled: true });
          }}
        >
          <h2 className="text-2xl">{t(lang, "enableRule")}</h2>
          <Field label={t(lang, "integrations")}>
            <select className={controlClass} value={integrationId || data.integrations[0]?.id} onChange={(event) => setIntegrationId(event.target.value)}>
              {data.integrations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>
          <Field label={t(lang, "direction")}>
            <select className={controlClass} value={direction} onChange={(event) => setDirection(event.target.value as SyncDirection)}>
              <option value="import">{t(lang, "dir_import")}</option>
              <option value="export">{t(lang, "dir_export")}</option>
              <option value="both">{t(lang, "dir_both")}</option>
            </select>
          </Field>
          <Field label={t(lang, "dataKind")}>
            <select className={controlClass} value={dataKind} onChange={(event) => setDataKind(event.target.value as SyncData)}>
              <option value="calendar">{t(lang, "data_calendar")}</option>
              <option value="materials">{t(lang, "data_materials")}</option>
              <option value="notifications">{t(lang, "data_notifications")}</option>
              <option value="tasks">{t(lang, "data_tasks")}</option>
            </select>
          </Field>
          <Btn type="submit">{t(lang, "save")}</Btn>
        </form>
      ) : null}
      {data.rules.map((rule) => {
        const integration = data.integrations.find((item) => item.id === rule.integrationId);
        return (
          <Card key={rule.id}>
            <p className="font-semibold">{integration?.label}</p>
            <p className="text-sm text-muted">{t(lang, `dir_${rule.direction}` as CopyKey)} · {t(lang, `data_${rule.dataKind}` as CopyKey)} · {t(lang, rule.frequency === "daily" ? "freq_daily" : "freq_manual")}</p>
            {allowed ? (
              <div className="mt-2 flex gap-2">
                <Btn
                  variant="ghost"
                  onClick={() => logSync(t(lang, "syncHonest"), false, rule.id)}
                >
                  {t(lang, "runSync")}
                </Btn>
                <Btn variant="danger" onClick={() => removeRule(rule.id)}>{t(lang, "delete")}</Btn>
              </div>
            ) : null}
          </Card>
        );
      })}
      <h2 className="text-2xl">{t(lang, "journal")}</h2>
      {data.syncLog.length === 0 ? <p className="text-sm text-muted">{t(lang, "journalEmpty")}</p> : null}
      {data.syncLog.map((row) => (
        <p key={row.id} className="text-sm text-muted">{row.ok ? "OK" : "—"} · {row.text}</p>
      ))}
    </div>
  );
}
