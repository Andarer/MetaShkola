import { useState } from "react";
import { Btn, controlClass, Field } from "@/components/ms/ui";
import { t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";
import type { Lang, SpaceKind } from "@/lib/ms/types";

export function Welcome({ locked = false }: { locked?: boolean }) {
  const data = useMs((s) => s.data);
  const setLang = useMs((s) => s.setLang);
  const openDemo = useMs((s) => s.openDemo);
  const openEmpty = useMs((s) => s.openEmpty);
  const lang = data.lang;
  const [empty, setEmpty] = useState(false);
  const [name, setName] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [kind, setKind] = useState<SpaceKind>("family");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-copper">{t(lang, "appName")}</p>
        <h1 className="text-4xl text-fg">{t(lang, "welcomeTitle")}</h1>
        <p className="text-base text-muted">{t(lang, "welcomeLead")}</p>
      </header>
      <div className="flex gap-2">
        {(["ru", "uk", "en"] as Lang[]).map((code) => (
          <button
            key={code}
            type="button"
            className={`h-11 rounded-xl px-4 text-sm font-semibold ${lang === code ? "bg-copper text-copper-fg" : "bg-surface text-fg"}`}
            onClick={() => setLang(code)}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      {!empty ? (
        <div className="flex flex-col gap-3">
          <Btn data-testid="welcome-demo" disabled={locked} onClick={() => openDemo()}>
            {t(lang, "openDemo")}
          </Btn>
          <p className="text-sm text-muted">{t(lang, "demoHint")}</p>
          <Btn variant="ghost" data-testid="welcome-empty" disabled={locked} onClick={() => setEmpty(true)}>
            {t(lang, "startEmpty")}
          </Btn>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            openEmpty({ name, spaceName, kind, lang });
          }}
        >
          <Field label={t(lang, "yourName")}>
            <input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label={t(lang, "spaceName")}>
            <input className={controlClass} value={spaceName} onChange={(event) => setSpaceName(event.target.value)} required />
          </Field>
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
                className={`h-11 rounded-xl text-sm font-semibold ${kind === value ? "bg-copper text-copper-fg" : "bg-surface text-fg"}`}
                onClick={() => setKind(value)}
              >
                {t(lang, key)}
              </button>
            ))}
          </div>
          <Btn type="submit">{t(lang, "continue")}</Btn>
          <Btn variant="ghost" onClick={() => setEmpty(false)}>
            {t(lang, "cancel")}
          </Btn>
        </form>
      )}
      <p className="text-sm text-muted">{t(lang, "authorLine")}</p>
    </main>
  );
}
