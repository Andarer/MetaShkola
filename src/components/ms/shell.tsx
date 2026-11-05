import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Cable,
  Clock,
  Home,
  ListChecks,
  MoreHorizontal,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { AiScreen } from "@/components/ms/ai-screen";
import { BellsScreen } from "@/components/ms/bells-screen";
import { CalendarScreen } from "@/components/ms/calendar-screen";
import { HomeScreen } from "@/components/ms/home-screen";
import { IntegrationsScreen } from "@/components/ms/integrations-screen";
import { Notifier } from "@/components/ms/notifier";
import { OrgsScreen } from "@/components/ms/orgs-screen";
import { PeopleScreen } from "@/components/ms/people-screen";
import { ScheduleScreen } from "@/components/ms/schedule-screen";
import { SettingsScreen } from "@/components/ms/settings-screen";
import { TasksScreen } from "@/components/ms/tasks-screen";
import { CommunityScreen } from "@/components/ms/community-screen";
import { UpdatesScreen } from "@/components/ms/updates-screen";
import { Avatar, Btn, controlClass, Field, Modal } from "@/components/ms/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/ms/i18n";
import { useMs } from "@/lib/ms/store";
import type { Screen } from "@/lib/ms/types";

const PRIMARY: { id: Screen; key: "home" | "schedule" | "tasks" | "ai" | "more"; icon: typeof Home }[] = [
  { id: "home", key: "home", icon: Home },
  { id: "schedule", key: "schedule", icon: CalendarDays },
  { id: "tasks", key: "tasks", icon: ListChecks },
  { id: "ai", key: "ai", icon: Sparkles },
  { id: "more", key: "more", icon: MoreHorizontal },
];

const ALL: { id: Screen; key: "home" | "schedule" | "bells" | "tasks" | "calendar" | "ai" | "community" | "updates" | "people" | "orgs" | "integrations" | "settings"; icon: typeof Home }[] = [
  { id: "home", key: "home", icon: Home },
  { id: "schedule", key: "schedule", icon: CalendarDays },
  { id: "bells", key: "bells", icon: Clock },
  { id: "tasks", key: "tasks", icon: ListChecks },
  { id: "calendar", key: "calendar", icon: BookOpen },
  { id: "ai", key: "ai", icon: Sparkles },
  { id: "community", key: "community", icon: Users },
  { id: "updates", key: "updates", icon: Sparkles },
  { id: "people", key: "people", icon: Users },
  { id: "orgs", key: "orgs", icon: Building2 },
  { id: "integrations", key: "integrations", icon: Cable },
  { id: "settings", key: "settings", icon: Settings },
];

function isMore(screen: Screen): boolean {
  return !["home", "schedule", "tasks", "ai"].includes(screen);
}

export function Shell() {
  const data = useMs((s) => s.data);
  const setActiveProfile = useMs((s) => s.setActiveProfile);
  const setActiveSpace = useMs((s) => s.setActiveSpace);
  const markInboxRead = useMs((s) => s.markInboxRead);
  const lang = data.lang;
  const profile = data.profiles.find((item) => item.id === data.activeProfileId);
  const [screen, setScreen] = useState<Screen>("home");
  const [whoOpen, setWhoOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [pinBad, setPinBad] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    if (data.theme === "dark") root.classList.add("theme-dark");
    if (data.theme === "light") root.classList.add("theme-light");
    root.lang = lang;
  }, [data.theme, lang]);

  const lockedProfile = profile?.pin && !unlocked.includes(profile.id) ? profile : null;
  const pending = data.profiles.find((item) => item.id === pendingId);
  const gateProfile = lockedProfile ?? (pending?.pin && !unlocked.includes(pending.id) ? pending : null);

  const unread = data.inbox.filter((item) => !item.read).length;
  const spaces = data.spaces.filter((space) => profile?.memberships.some((item) => item.spaceId === space.id));

  const chooseProfile = (id: string) => {
    const next = data.profiles.find((item) => item.id === id);
    if (!next) return;
    if (next.pin && !unlocked.includes(next.id)) {
      setPendingId(id);
      setPin("");
      setPinBad(false);
      setWhoOpen(false);
      return;
    }
    setActiveProfile(id);
    setWhoOpen(false);
    setScreen("home");
  };

  const submitPin = () => {
    if (!gateProfile) return;
    if (pin === gateProfile.pin) {
      setUnlocked((list) => [...list, gateProfile.id]);
      if (pendingId === gateProfile.id) setActiveProfile(gateProfile.id);
      setPendingId(null);
      setPin("");
      setPinBad(false);
      setScreen("home");
      return;
    }
    setPinBad(true);
  };

  return (
    <div className="min-h-screen bg-bg text-fg md:flex">
      <Notifier />
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3 md:flex">
        <p className="px-3 py-4 font-display text-2xl">{t(lang, "appName")}</p>
        {ALL.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`nav-${item.id}`}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold",
                active ? "bg-copper text-copper-fg" : "text-fg",
              )}
              onClick={() => setScreen(item.id)}
            >
              <Icon className="h-5 w-5" />
              {t(lang, item.key)}
            </button>
          );
        })}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-copper">{t(lang, "appName")}</p>
            <label className="sr-only" htmlFor="space-switch">
              {t(lang, "switchSpace")}
            </label>
            <select
              id="space-switch"
              className="w-full truncate bg-transparent text-base font-semibold text-fg"
              value={data.activeSpaceId}
              onChange={(event) => setActiveSpace(event.target.value)}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
            aria-label={t(lang, "inbox")}
            onClick={() => {
              setInboxOpen(true);
              markInboxRead();
            }}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1 text-xs font-semibold text-copper-fg">
                {unread}
              </span>
            ) : null}
          </button>
          <button type="button" data-testid="profile-switch" aria-label={t(lang, "switchProfile")} onClick={() => setWhoOpen(true)}>
            <Avatar name={profile?.name ?? "?"} tone={profile?.tone ?? "ink"} />
          </button>
        </header>
        <main className="nav-pad mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4" data-screen={screen}>
          {showInstallBanner ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-copper/30 bg-copper/10 p-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📲</span>
                <div>
                  <p className="font-semibold text-fg">Установить MetaШкола 2.0</p>
                  <p className="text-xs text-muted">Быстрый доступ с экрана "Домой" и 100% оффлайн-работа</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-copper px-3 py-1.5 text-xs font-semibold text-copper-fg hover:opacity-90"
                  onClick={async () => {
                    if (deferredPrompt) {
                      await deferredPrompt.prompt();
                      setDeferredPrompt(null);
                    }
                    setShowInstallBanner(false);
                  }}
                >
                  Установить
                </button>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-fg px-1"
                  onClick={() => setShowInstallBanner(false)}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : null}
          {screen === "home" ? <HomeScreen onOpen={setScreen} /> : null}
          {screen === "schedule" ? <ScheduleScreen /> : null}
          {screen === "bells" ? <BellsScreen /> : null}
          {screen === "tasks" ? <TasksScreen /> : null}
          {screen === "calendar" ? <CalendarScreen /> : null}
          {screen === "ai" ? <AiScreen /> : null}
          {screen === "community" ? <CommunityScreen /> : null}
          {screen === "updates" ? <UpdatesScreen /> : null}
          {screen === "people" ? <PeopleScreen onSwitch={chooseProfile} /> : null}
          {screen === "orgs" ? <OrgsScreen /> : null}
          {screen === "integrations" ? <IntegrationsScreen /> : null}
          {screen === "settings" ? <SettingsScreen /> : null}
          {screen === "more" ? (
            <div className="grid grid-cols-2 gap-3">
              {ALL.filter((item) => !["home", "schedule", "tasks", "ai"].includes(item.id)).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`more-${item.id}`}
                    className="flex h-24 flex-col items-start justify-between rounded-2xl border border-line bg-surface p-4 text-left"
                    onClick={() => setScreen(item.id)}
                  >
                    <Icon className="h-5 w-5 text-copper" />
                    <span className="font-semibold">{t(lang, item.key)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </main>
        <nav className="dock-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden">
          <div className="grid grid-cols-5">
            {PRIMARY.map((item) => {
              const Icon = item.icon;
              const active = item.id === "more" ? isMore(screen) : screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`tab-${item.id}`}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                    active ? "text-copper" : "text-muted",
                  )}
                  onClick={() => setScreen(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {t(lang, item.key)}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <Modal open={whoOpen} title={t(lang, "switchProfile")} onClose={() => setWhoOpen(false)}>
        {data.profiles.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex h-14 items-center gap-3 rounded-xl px-1 text-left"
            onClick={() => chooseProfile(item.id)}
          >
            <Avatar name={item.name} tone={item.tone} />
            <span className="font-semibold">{item.name}</span>
          </button>
        ))}
      </Modal>
      <Modal open={inboxOpen} title={t(lang, "inbox")} onClose={() => setInboxOpen(false)}>
        {data.inbox.length === 0 ? <p className="text-sm text-muted">{t(lang, "inboxEmpty")}</p> : null}
        {data.inbox.map((item) => (
          <article key={item.id} className="border-b border-line py-3">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </Modal>
      {gateProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg px-4">
          <form
            className="flex w-full max-w-sm flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitPin();
            }}
          >
            <h1 className="text-3xl">{t(lang, "pinTitle")}</h1>
            <p className="font-semibold">{gateProfile.name}</p>
            <Field label="PIN">
              <input
                className={controlClass}
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </Field>
            {pinBad ? <p className="text-sm text-clay">{t(lang, "pinWrong")}</p> : null}
            <Btn type="submit">{t(lang, "unlock")}</Btn>
            {pendingId ? (
              <Btn
                variant="ghost"
                onClick={() => {
                  setPendingId(null);
                  setPin("");
                  setPinBad(false);
                }}
              >
                {t(lang, "cancel")}
              </Btn>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
