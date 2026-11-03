import { useState } from "react";
import { askTutor, probeModels, type AiResult } from "@/lib/ms/ai.functions";
import { uid } from "@/lib/ms/id";
import { t, tf } from "@/lib/ms/i18n";
import { aiAllowed, canInSpace } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import type { AiProvider } from "@/lib/ms/types";
import { Btn, Card, areaClass, controlClass, Field } from "@/components/ms/ui";

const PRESETS: { name: string; baseUrl: string }[] = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { name: "xAI Grok", baseUrl: "https://api.x.ai/v1" },
];

function explain(lang: Parameters<typeof t>[0], result: AiResult): string {
  if (result.ok) return "";
  if (result.error === "no_key") return t(lang, "err_no_key");
  if (result.error === "bad_url") return t(lang, "err_bad_url");
  if (result.error === "empty") return t(lang, "err_empty");
  if (result.error === "network") return t(lang, "err_network");
  return `${t(lang, "err_upstream")}${result.detail ? ` (${result.detail})` : ""}`;
}

export function AiScreen() {
  const data = useMs((s) => s.data);
  const startChat = useMs((s) => s.startChat);
  const appendChat = useMs((s) => s.appendChat);
  const addUsage = useMs((s) => s.addUsage);
  const saveProvider = useMs((s) => s.saveProvider);
  const removeProvider = useMs((s) => s.removeProvider);
  const saveAssistant = useMs((s) => s.saveAssistant);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const allowed = aiAllowed(data, profile, data.activeSpaceId);
  const studentBlocked =
    Boolean(profile?.memberships.some((item) => item.spaceId === data.activeSpaceId && item.roleKeys.includes("student"))) &&
    data.spaces.find((space) => space.id === data.activeSpaceId)?.aiRestrictedForMinors;
  const providers = data.providers.filter((item) => item.enabled);
  const [assistantId, setAssistantId] = useState(data.assistants[0]?.id ?? "");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [secondId, setSecondId] = useState("");
  const [compare, setCompare] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [probe, setProbe] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [draft, setDraft] = useState({ name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", apiKey: "", temperature: 0.4 });
  const chat = data.chats.find((item) => item.id === data.activeChatId) ?? null;

  if (!profile || !canInSpace(profile, data.activeSpaceId, "ai", data.customRoles)) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">{t(lang, "ai")}</h1>
        <p className="text-sm text-muted">{t(lang, "aiNoGrant")}</p>
      </div>
    );
  }
  if (!allowed || studentBlocked) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">{t(lang, "ai")}</h1>
        <p className="text-sm text-muted">{t(lang, "aiBlocked")}</p>
      </div>
    );
  }

  const ask = async (provider: AiProvider, prompt: string, history: { role: "user" | "assistant"; content: string }[]) => {
    const assistant = data.assistants.find((item) => item.id === assistantId);
    const result = await askTutor({
      data: {
        mode: provider.kind === "builtin" ? "builtin" : "custom",
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: provider.model,
        temperature: provider.temperature,
        messages: [
          { role: "system", content: `${assistant?.instruction ?? ""}\n${t(lang, "langAnswer")}` },
          ...history.slice(-8),
          { role: "user", content: prompt },
        ],
      },
    });
    return result;
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{t(lang, "ai")}</h1>
      <p className="text-sm text-muted">{t(lang, "aiLead")}</p>
      <Field label={t(lang, "assistant")}>
        <select className={controlClass} value={assistantId} onChange={(event) => setAssistantId(event.target.value)}>
          {data.assistants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label={t(lang, "model")}>
        <select className={controlClass} value={providerId} onChange={(event) => setProviderId(event.target.value)}>
          {providers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model}</option>)}
        </select>
      </Field>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
        {t(lang, "compare")}
      </label>
      {compare ? (
        <Field label={t(lang, "secondModel")}>
          <select className={controlClass} value={secondId} onChange={(event) => setSecondId(event.target.value)}>
            <option value="">—</option>
            {providers.filter((item) => item.id !== providerId).map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.model}</option>
            ))}
          </select>
        </Field>
      ) : null}
      <Card>
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {chat?.messages.map((message) => (
            <p key={message.id} className={message.role === "user" ? "text-fg" : "text-muted"}>
              <span className="font-semibold">{message.role === "user" ? profile.name : message.providerId || "AI"}: </span>
              {message.content}
            </p>
          ))}
          {busy ? <p className="text-sm text-copper">{t(lang, "thinking")}</p> : null}
          {error ? <p className="text-sm text-clay">{error}</p> : null}
        </div>
      </Card>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const prompt = text.trim();
          const provider = providers.find((item) => item.id === providerId);
          if (!prompt || !provider || busy) return;
          setBusy(true);
          setError("");
          const chatId = chat?.id ?? startChat(assistantId, provider.id);
          const history = (chat?.messages ?? []).map((message) => ({ role: message.role, content: message.content }));
          appendChat(chatId, { role: "user", content: prompt });
          setText("");
          const first = await ask(provider, prompt, history);
          if (!first.ok) {
            setError(explain(lang, first));
            setBusy(false);
            return;
          }
          appendChat(chatId, { role: "assistant", content: first.text, providerId: provider.name });
          addUsage(provider.id, first.model, first.promptTokens, first.completionTokens);
          const second = providers.find((item) => item.id === secondId);
          if (compare && second) {
            const other = await ask(second, prompt, history);
            if (other.ok) {
              appendChat(chatId, { role: "assistant", content: other.text, providerId: second.name });
              addUsage(second.id, other.model, other.promptTokens, other.completionTokens);
            } else {
              setError(explain(lang, other));
            }
          }
          setBusy(false);
        }}
      >
        <textarea className={areaClass} placeholder={t(lang, "askPh")} value={text} onChange={(event) => setText(event.target.value)} />
        <Btn type="submit" disabled={busy || !text.trim()}>{t(lang, "send")}</Btn>
      </form>

      <h2 className="text-2xl">{t(lang, "usage")}</h2>
      {data.usage.length === 0 ? <p className="text-sm text-muted">{t(lang, "usageEmpty")}</p> : null}
      {data.usage.slice(0, 8).map((row) => (
        <p key={row.id} className="text-sm text-muted">{row.model} · {tf(lang, "tokens", { p: row.promptTokens, c: row.completionTokens })}</p>
      ))}

      <h2 className="text-2xl">{t(lang, "newAssistant")}</h2>
      <Field label={t(lang, "namePh")}><input className={controlClass} value={customName} onChange={(event) => setCustomName(event.target.value)} /></Field>
      <Field label={t(lang, "instruction")}><textarea className={areaClass} value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} /></Field>
      <Btn
        variant="ghost"
        disabled={!customName.trim() || !customPrompt.trim()}
        onClick={() => {
          saveAssistant({ id: uid(), name: customName.trim(), instruction: customPrompt.trim(), builtin: false });
          setCustomName("");
          setCustomPrompt("");
        }}
      >
        {t(lang, "save")}
      </Btn>

      <h2 className="text-2xl">{t(lang, "providers")}</h2>
      <p className="text-sm text-muted">{t(lang, "catalogNote")}</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Btn key={preset.name} variant="ghost" onClick={() => setDraft({ ...draft, name: preset.name, baseUrl: preset.baseUrl })}>
            {preset.name}
          </Btn>
        ))}
      </div>
      <Field label={t(lang, "namePh")}><input className={controlClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
      <Field label={t(lang, "baseUrl")}><input className={controlClass} value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /></Field>
      <Field label={t(lang, "model")}><input className={controlClass} value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} /></Field>
      <Field label={t(lang, "apiKey")}><input className={controlClass} type="password" autoComplete="off" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} /></Field>
      <Field label={t(lang, "temperature")}>
        <input className={controlClass} type="number" min={0} max={1} step={0.1} value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: Math.min(1, Math.max(0, Number(event.target.value) || 0)) })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn
          onClick={() => {
            const id = uid();
            saveProvider({ id, name: draft.name, kind: "openai", baseUrl: draft.baseUrl, model: draft.model, apiKey: draft.apiKey, temperature: draft.temperature, enabled: true });
            setProviderId(id);
          }}
          disabled={!draft.apiKey || !draft.model}
        >
          {t(lang, "addProvider")}
        </Btn>
        <Btn
          variant="ghost"
          onClick={async () => {
            const builtin = draft.baseUrl.includes("api.x.ai") && !draft.apiKey;
            const result = await probeModels({
              data: builtin
                ? { mode: "builtin" }
                : { mode: "custom", baseUrl: draft.baseUrl, apiKey: draft.apiKey },
            });
            setProbe(result.ok ? tf(lang, "probeOk", { n: result.models.length }) : explain(lang, { ok: false, error: result.error, detail: result.detail }));
          }}
        >
          {t(lang, "probe")}
        </Btn>
      </div>
      {probe ? <p className="text-sm text-muted">{probe}</p> : null}
      {data.providers.map((provider) => (
        <Card key={provider.id}>
          <p className="font-semibold">{provider.name}</p>
          <p className="text-sm text-muted">{provider.model}</p>
          <p className="text-sm text-muted">{provider.kind === "builtin" ? t(lang, "builtinKey") : provider.baseUrl}</p>
          {provider.kind !== "builtin" ? <Btn variant="danger" className="mt-2" onClick={() => removeProvider(provider.id)}>{t(lang, "delete")}</Btn> : null}
        </Card>
      ))}
    </div>
  );
}
