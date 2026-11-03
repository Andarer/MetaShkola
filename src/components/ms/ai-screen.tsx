import { useState } from "react";
import { MessageSquare, Sparkles, Sliders, Send } from "lucide-react";
import { askTutor, probeModels, type AiResult } from "@/lib/ms/ai.functions";
import { uid } from "@/lib/ms/id";
import { t, tf } from "@/lib/ms/i18n";
import { aiAllowed, canInSpace } from "@/lib/ms/rbac";
import { useMs } from "@/lib/ms/store";
import type { AiProvider } from "@/lib/ms/types";
import { Btn, Card, areaClass, controlClass, Field } from "@/components/ms/ui";
import { AiQuizGenerator } from "@/components/ms/ai-quiz";

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
  const [aiTab, setAiTab] = useState<"chat" | "quiz" | "providers">("chat");
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">{t(lang, "ai")}</h1>
      </div>
      <p className="text-sm text-muted">{t(lang, "aiLead")}</p>

      {/* Mode navigation */}
      <div className="grid grid-cols-3 gap-2">
        <Btn
          variant={aiTab === "chat" ? "primary" : "ghost"}
          onClick={() => setAiTab("chat")}
          className="text-xs flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Диалог с AI</span>
        </Btn>
        <Btn
          variant={aiTab === "quiz" ? "primary" : "ghost"}
          onClick={() => setAiTab("quiz")}
          className="text-xs flex items-center justify-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-copper" />
          <span>Тренажёр тестов</span>
        </Btn>
        <Btn
          variant={aiTab === "providers" ? "primary" : "ghost"}
          onClick={() => setAiTab("providers")}
          className="text-xs flex items-center justify-center gap-1.5"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Провайдеры ({providers.length})</span>
        </Btn>
      </div>

      {aiTab === "quiz" && <AiQuizGenerator />}

      {aiTab === "chat" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label={t(lang, "assistant")}>
              <select className={controlClass} value={assistantId} onChange={(event) => setAssistantId(event.target.value)}>
                {data.assistants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t(lang, "model")}>
              <select className={controlClass} value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.model}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
            {t(lang, "compare")}
          </label>
          {compare ? (
            <Field label={t(lang, "secondModel")}>
              <select className={controlClass} value={secondId} onChange={(event) => setSecondId(event.target.value)}>
                <option value="">—</option>
                {providers.filter((item) => item.id !== providerId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.model}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Card>
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
              {(!chat || chat.messages.length === 0) ? (
                <p className="text-sm text-muted">Задайте вопрос AI-репетитору по домашнему заданию или теме урока.</p>
              ) : null}
              {chat?.messages.map((message) => (
                <div key={message.id} className="text-sm">
                  <span className="font-semibold text-fg">
                    {message.role === "user" ? profile.name : message.providerId || "MetaAI"}:{" "}
                  </span>
                  <span className={message.role === "user" ? "text-fg" : "text-muted leading-relaxed"}>
                    {message.content}
                  </span>
                </div>
              ))}
              {busy ? <p className="text-sm text-copper animate-pulse">{t(lang, "thinking")}</p> : null}
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
              setText("");

              let currentChatId = data.activeChatId;
              if (!currentChatId || !chat) {
                currentChatId = startChat(assistantId, providerId);
              }

              appendChat(currentChatId, { role: "user", content: prompt });
              const history = (data.chats.find((item) => item.id === currentChatId)?.messages ?? []).map((item) => ({
                role: item.role,
                content: item.content,
              }));

              const result = await ask(provider, prompt, history);
              if (result.ok) {
                appendChat(currentChatId, { role: "assistant", content: result.text, providerId: provider.name });
                addUsage(provider.id, result.model, result.promptTokens, result.completionTokens);
              } else {
                setError(explain(lang, result));
              }

              if (compare && secondId) {
                const second = providers.find((item) => item.id === secondId);
                if (second) {
                  const res2 = await ask(second, prompt, history);
                  if (res2.ok) {
                    appendChat(currentChatId, { role: "assistant", content: res2.text, providerId: second.name });
                    addUsage(second.id, res2.model, res2.promptTokens, res2.completionTokens);
                  }
                }
              }

              setBusy(false);
            }}
          >
            <textarea
              className={areaClass}
              placeholder={t(lang, "askPh")}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Btn type="submit" disabled={!text.trim() || busy} className="flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                <span>{busy ? t(lang, "thinking") : t(lang, "send")}</span>
              </Btn>
            </div>
          </form>
        </div>
      )}

      {aiTab === "providers" && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-xl font-semibold">Свой ассистент</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Название ассистента">
                <input className={controlClass} value={customName} onChange={(event) => setCustomName(event.target.value)} />
              </Field>
              <Field label="Системная инструкция (промпт)">
                <textarea className={areaClass} value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} />
              </Field>
              <Btn
                disabled={!customName.trim() || !customPrompt.trim()}
                onClick={() => {
                  saveAssistant({ id: uid(), name: customName.trim(), instruction: customPrompt.trim(), builtin: false });
                  setCustomName("");
                  setCustomPrompt("");
                }}
              >
                {t(lang, "save")}
              </Btn>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">{t(lang, "providers")}</h2>
            <p className="mt-1 text-sm text-muted">{t(lang, "catalogNote")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Btn
                  key={preset.name}
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setDraft({ ...draft, name: preset.name, baseUrl: preset.baseUrl })}
                >
                  {preset.name}
                </Btn>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <Field label={t(lang, "namePh")}>
                <input className={controlClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label={t(lang, "baseUrl")}>
                <input className={controlClass} value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
              </Field>
              <Field label={t(lang, "model")}>
                <input className={controlClass} value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} />
              </Field>
              <Field label={t(lang, "apiKey")}>
                <input
                  className={controlClass}
                  type="password"
                  autoComplete="off"
                  value={draft.apiKey}
                  onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
                />
              </Field>
              <Field label={t(lang, "temperature")}>
                <input
                  className={controlClass}
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={draft.temperature}
                  onChange={(event) =>
                    setDraft({ ...draft, temperature: Math.min(1, Math.max(0, Number(event.target.value) || 0)) })
                  }
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={() => {
                    const id = uid();
                    saveProvider({
                      id,
                      name: draft.name,
                      kind: "openai",
                      baseUrl: draft.baseUrl,
                      model: draft.model,
                      apiKey: draft.apiKey,
                      temperature: draft.temperature,
                      enabled: true,
                    });
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
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            {data.providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                <div>
                  <p className="font-semibold text-sm">{provider.name}</p>
                  <p className="text-xs text-muted">{provider.model} · {provider.kind === "builtin" ? t(lang, "builtinKey") : provider.baseUrl}</p>
                </div>
                {provider.kind !== "builtin" ? (
                  <Btn variant="danger" className="text-xs py-1 h-8" onClick={() => removeProvider(provider.id)}>
                    {t(lang, "delete")}
                  </Btn>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
