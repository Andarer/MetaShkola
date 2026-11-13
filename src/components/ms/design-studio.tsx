import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Eye,
  Grid,
  Layers,
  LayoutDashboard,
  Monitor,
  Moon,
  Navigation,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Trash2,
  Type,
  Upload,
  AlertTriangle,
  MousePointerClick,
  FolderOpen,
} from "lucide-react";
import { Btn, Card, controlClass, downloadText } from "@/components/ms/ui";
import {
  DEFAULT_DESIGN,
  DESIGN_PRESET_PROFILES,
  PALETTES,
  computeDesignVariables,
  getContrastColor,
  getContrastRatio,
  hexToRgb,
  isValidHexColor,
  isWcagAA,
  rgbToHex,
  validateDesignConfigImport,
} from "@/lib/ms/design";
import { uid } from "@/lib/ms/id";
import { useMs } from "@/lib/ms/store";
import type {
  AnimationSpeed,
  ButtonHeight,
  ButtonRadius,
  ButtonStyle,
  CardBorder,
  CardRadius,
  CardShadow,
  CardTransparency,
  ColorPalette,
  DesignProfile,
  HomeBlockItem,
  IconSet,
  IconSize,
  MetaDesignConfig,
  Screen,
  ScreenTransition,
  Theme,
  TypographyFontFamily,
  TypographyFontWeight,
  TypographyLineHeight,
  UiDensity,
} from "@/lib/ms/types";
import { defaultHomeBlocks } from "@/lib/ms/types";

type StudioSection =
  | "overview"
  | "themes"
  | "colors"
  | "typography"
  | "density"
  | "cards"
  | "buttons"
  | "icons"
  | "navigation"
  | "home"
  | "animation"
  | "preview"
  | "profiles"
  | "reset";

const SECTIONS: { id: StudioSection; label: string; icon: typeof Palette }[] = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "themes", label: "Темы", icon: Sun },
  { id: "colors", label: "Цвета", icon: Palette },
  { id: "typography", label: "Типографика", icon: Type },
  { id: "density", label: "Плотность", icon: Grid },
  { id: "cards", label: "Карточки", icon: Layers },
  { id: "buttons", label: "Кнопки", icon: MousePointerClick },
  { id: "icons", label: "Иконки", icon: Sparkles },
  { id: "navigation", label: "Навигация", icon: Navigation },
  { id: "home", label: "Главный экран", icon: Sliders },
  { id: "animation", label: "Анимация", icon: Sparkles },
  { id: "preview", label: "Предпросмотр", icon: Eye },
  { id: "profiles", label: "Профили", icon: FolderOpen },
  { id: "reset", label: "Сброс", icon: RotateCcw },
];

const NAV_TAB_OPTIONS: { id: Screen; label: string; locked?: boolean }[] = [
  { id: "home", label: "Главная", locked: true },
  { id: "schedule", label: "Расписание" },
  { id: "tasks", label: "Задания" },
  { id: "calendar", label: "Календарь" },
  { id: "personal", label: "Личное" },
  { id: "tools", label: "Инструменты" },
  { id: "ai", label: "MetaAI" },
  { id: "bells", label: "Звонки" },
  { id: "community", label: "Сообщество" },
  { id: "updates", label: "Обновления" },
  { id: "design", label: "MetaDesign" },
  { id: "more", label: "Ещё", locked: true },
];

const CUSTOM_COLOR_FIELDS: {
  key: keyof MetaDesignConfig;
  label: string;
  hint: string;
  fallbackKey: "copper" | "sage" | "bg" | "surface" | "surface2" | "fg" | "muted" | "line" | "fixed";
  fixedHex?: string;
}[] = [
  { key: "primaryColor", label: "Основной (Primary)", hint: "Кнопки, акценты, активные вкладки", fallbackKey: "copper" },
  { key: "accentColor", label: "Акцент (Accent)", hint: "Вторичные акценты, графики, бейджи", fallbackKey: "sage" },
  { key: "secondaryColor", label: "Вторичный фон", hint: "Второстепенные панели и кнопки", fallbackKey: "surface2" },
  { key: "bgColor", label: "Фон экрана", hint: "Основной фон приложения", fallbackKey: "bg" },
  { key: "surfaceColor", label: "Поверхность карточек", hint: "Фон карточек и диалогов", fallbackKey: "surface" },
  { key: "surfaceElevatedColor", label: "Приподнятая поверхность", hint: "Вложенные панели и поля", fallbackKey: "surface2" },
  { key: "textColor", label: "Основной текст", hint: "Заголовки и основной контент", fallbackKey: "fg" },
  { key: "secondaryTextColor", label: "Вторичный текст", hint: "Подписи и вспомогательный текст", fallbackKey: "muted" },
  { key: "borderColor", label: "Границы (Borders)", hint: "Разделители и рамки карточек", fallbackKey: "line" },
  { key: "successColor", label: "Статус: Успех", hint: "Подтверждения и оценки", fallbackKey: "fixed", fixedHex: "#16a34a" },
  { key: "warningColor", label: "Статус: Предупреждение", hint: "Внимание и бета-каналы", fallbackKey: "fixed", fixedHex: "#d97706" },
  { key: "errorColor", label: "Статус: Ошибка", hint: "Критические ошибки и удаление", fallbackKey: "fixed", fixedHex: "#d32f2f" },
  { key: "infoColor", label: "Статус: Информация", hint: "Системные подсказки", fallbackKey: "sage" },
];

function ColorControlRow({
  label,
  hint,
  value,
  defaultHex,
  onChange,
  onReset,
}: {
  label: string;
  hint: string;
  value?: string;
  defaultHex: string;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  const effectiveHex = isValidHexColor(value) ? value! : defaultHex;
  const [r, g, b] = hexToRgb(effectiveHex);
  const [hexDraft, setHexDraft] = useState(value ?? "");

  return (
    <div className="rounded-xl border border-line bg-surface-2/30 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-fg">{label}</p>
          <p className="text-[11px] text-muted">{hint}</p>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => {
              setHexDraft("");
              onReset();
            }}
            className="text-[11px] font-semibold text-copper hover:underline shrink-0"
          >
            Сброс
          </button>
        ) : (
          <span className="text-[10px] text-muted">Палитра</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={effectiveHex.slice(0, 7)}
          onChange={(e) => {
            setHexDraft(e.target.value);
            onChange(e.target.value);
          }}
          className="h-9 w-11 cursor-pointer rounded-lg border border-line bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value ?? hexDraft}
          placeholder={defaultHex}
          onChange={(e) => {
            const val = e.target.value.trim();
            setHexDraft(val);
            if (!val) {
              onReset();
            } else if (isValidHexColor(val)) {
              onChange(val);
            }
          }}
          className="h-9 w-28 rounded-lg border border-line bg-surface px-2 font-mono text-xs text-fg uppercase"
        />
        <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
          <span>R</span>
          <input
            type="number"
            min={0}
            max={255}
            value={r}
            onChange={(e) => {
              const next = rgbToHex(Number(e.target.value), g, b);
              setHexDraft(next);
              onChange(next);
            }}
            className="h-8 w-12 rounded border border-line bg-surface px-1 text-center text-xs text-fg"
          />
          <span>G</span>
          <input
            type="number"
            min={0}
            max={255}
            value={g}
            onChange={(e) => {
              const next = rgbToHex(r, Number(e.target.value), b);
              setHexDraft(next);
              onChange(next);
            }}
            className="h-8 w-12 rounded border border-line bg-surface px-1 text-center text-xs text-fg"
          />
          <span>B</span>
          <input
            type="number"
            min={0}
            max={255}
            value={b}
            onChange={(e) => {
              const next = rgbToHex(r, g, Number(e.target.value));
              setHexDraft(next);
              onChange(next);
            }}
            className="h-8 w-12 rounded border border-line bg-surface px-1 text-center text-xs text-fg"
          />
        </div>
      </div>
    </div>
  );
}

function LivePreviewBox({
  config,
  viewport,
  onViewportChange,
}: {
  config: MetaDesignConfig;
  viewport: "mobile" | "tablet" | "desktop";
  onViewportChange: (v: "mobile" | "tablet" | "desktop") => void;
}) {
  const computed = useMemo(() => computeDesignVariables(config), [config]);
  const vars = computed.vars;
  const styleVars = vars as React.CSSProperties;

  const widthClass =
    viewport === "mobile"
      ? "max-w-[360px]"
      : viewport === "tablet"
        ? "max-w-[580px]"
        : "w-full";

  const previewTabs = (config.navTabs && config.navTabs.length > 0
    ? config.navTabs
    : ["home", "schedule", "tasks", "ai", "more"]
  ).slice(0, 5);

  return (
    <Card className="border-copper/30">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
        <div>
          <h3 className="text-base font-bold text-fg flex items-center gap-2">
            <Eye className="h-4 w-4 text-copper" />
            <span>Интерактивный предпросмотр (Live Preview)</span>
          </h3>
          <p className="text-xs text-muted">
            Изолированный макет · Не изменяет учебные данные · Тема: {computed.effectiveMode === "dark" ? "Тёмная" : "Светлая"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
          {([
            ["mobile", Smartphone, "360px"],
            ["tablet", Tablet, "580px"],
            ["desktop", Monitor, "100%"],
          ] as const).map(([v, Icon, lbl]) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewportChange(v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewport === v ? "bg-copper text-copper-fg" : "text-muted hover:text-fg"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center overflow-x-auto">
        <div
          className={`w-full ${widthClass} rounded-2xl border overflow-hidden transition-all`}
          style={{
            ...styleVars,
            backgroundColor: vars["--ms-bg"],
            color: vars["--ms-fg"],
            borderColor: vars["--ms-line"],
            fontFamily: vars["--ms-font-sans"],
            lineHeight: vars["--ms-line-height"],
            fontWeight: Number(vars["--ms-font-weight"] || 400),
            fontSize: `${computed.rootFontSizePx}px`,
          }}
        >
          {/* Preview Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{
              backgroundColor: vars["--ms-surface"],
              borderColor: vars["--ms-line"],
            }}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: vars["--ms-copper"] }}>
                MetaШкола Preview
              </p>
              <p className="text-sm font-bold">Лицей «Горизонт» · 9-А</p>
            </div>
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: vars["--ms-copper"], color: vars["--ms-copper-fg"] }}
            >
              ОК
            </span>
          </div>

          {/* Preview Body */}
          <div className="p-3.5 space-y-3" style={{ gap: vars["--ms-gap"] }}>
            {/* Sample Card */}
            <div
              style={{
                backgroundColor: vars["--ms-card-bg"],
                borderWidth: vars["--ms-card-border-w"],
                borderStyle: "solid",
                borderColor: vars["--ms-line"],
                borderRadius: vars["--radius-2xl"],
                boxShadow: vars["--ms-card-shadow"],
                padding: vars["--ms-density-pad"],
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold" style={{ color: vars["--ms-copper"] }}>
                    Урок 2 · Сейчас (08:55–09:40)
                  </span>
                  <h4 className="text-base font-bold mt-0.5">Физика · Каб. 204</h4>
                  <p className="text-xs mt-0.5" style={{ color: vars["--ms-muted"] }}>
                    Закон сохранения импульса · Преп. Тарас Коваленко
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: vars["--ms-surface-2"], color: vars["--ms-sage"] }}
                >
                  22 мин
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  style={{
                    minHeight: vars["--ms-btn-h"],
                    paddingLeft: vars["--ms-btn-px"],
                    paddingRight: vars["--ms-btn-px"],
                    borderRadius: vars["--ms-btn-radius"],
                    backgroundColor:
                      config.buttonStyle === "outlined" || config.buttonStyle === "minimal"
                        ? "transparent"
                        : config.buttonStyle === "soft"
                          ? `${vars["--ms-copper"]}26`
                          : vars["--ms-copper"],
                    color:
                      config.buttonStyle === "filled" || !config.buttonStyle
                        ? vars["--ms-copper-fg"]
                        : vars["--ms-copper"],
                    border:
                      config.buttonStyle === "outlined"
                        ? `1.5px solid ${vars["--ms-copper"]}`
                        : "1px solid transparent",
                  }}
                  className="text-xs font-semibold"
                >
                  Основная кнопка
                </button>
                <button
                  type="button"
                  style={{
                    minHeight: vars["--ms-btn-h"],
                    paddingLeft: vars["--ms-btn-px"],
                    paddingRight: vars["--ms-btn-px"],
                    borderRadius: vars["--ms-btn-radius"],
                    backgroundColor: vars["--ms-surface-2"],
                    color: vars["--ms-fg"],
                  }}
                  className="text-xs font-semibold"
                >
                  Вторичная
                </button>
              </div>
            </div>

            {/* Sample Form Control */}
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: vars["--ms-muted"] }}>
                Пример поля ввода и статусов
              </span>
              <input
                type="text"
                readOnly
                value="Параграф 14, задачи 1–3"
                style={{
                  minHeight: vars["--ms-control-h"],
                  borderRadius: vars["--radius-xl"],
                  borderColor: vars["--ms-line"],
                  backgroundColor: vars["--ms-surface"],
                  color: vars["--ms-fg"],
                }}
                className="w-full border px-3 text-xs"
              />
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold">
                <span style={{ color: vars["--ms-success"] }}>● Успех</span>
                <span style={{ color: vars["--ms-warning"] }}>● Внимание</span>
                <span style={{ color: vars["--ms-clay"] }}>● Ошибка</span>
                <span style={{ color: vars["--ms-info"] }}>● Инфо</span>
              </div>
            </div>
          </div>

          {/* Preview Bottom Navigation */}
          <div
            className="grid border-t py-2 text-center text-[10px] font-semibold"
            style={{
              gridTemplateColumns: `repeat(${previewTabs.length}, minmax(0, 1fr))`,
              backgroundColor: vars["--ms-surface"],
              borderColor: vars["--ms-line"],
            }}
          >
            {previewTabs.map((tabId, idx) => (
              <div
                key={tabId}
                className="truncate px-1"
                style={{ color: idx === 0 ? vars["--ms-copper"] : vars["--ms-muted"] }}
              >
                {NAV_TAB_OPTIONS.find((opt) => opt.id === tabId)?.label || tabId}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DesignStudioScreen() {
  const data = useMs((s) => s.data);
  const setDesignConfig = useMs((s) => s.setDesignConfig);
  const saveDesignProfile = useMs((s) => s.saveDesignProfile);
  const deleteDesignProfile = useMs((s) => s.deleteDesignProfile);
  const applyDesignProfile = useMs((s) => s.applyDesignProfile);
  const resetDesignConfig = useMs((s) => s.resetDesignConfig);

  const design: MetaDesignConfig = { ...DEFAULT_DESIGN, ...(data.design || {}) };

  const [section, setSection] = useState<StudioSection>("overview");
  const [previewViewport, setPreviewViewport] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const computed = useMemo(() => computeDesignVariables(design), [design]);
  const paletteColors =
    computed.effectiveMode === "dark"
      ? (PALETTES[design.palette] || PALETTES.amber).dark
      : (PALETTES[design.palette] || PALETTES.amber).light;

  const effectivePrimary = computed.vars["--ms-copper"] || "#ff8c00";
  const effectiveBg = computed.vars["--ms-bg"] || "#ffffff";
  const effectiveSurface = computed.vars["--ms-surface"] || "#ffffff";
  const effectiveText = computed.vars["--ms-fg"] || "#0d1b2a";

  const textContrastRatio = getContrastRatio(effectiveText, effectiveSurface);
  const textAaOk = isWcagAA(textContrastRatio);
  const primaryBtnContrast = getContrastRatio(effectivePrimary, getContrastColor(effectivePrimary));
  const primaryBgContrast = getContrastRatio(effectivePrimary, effectiveBg);

  const navTabs: Screen[] =
    design.navTabs && design.navTabs.length > 0 ? design.navTabs : ["home", "schedule", "tasks", "ai", "more"];
  const homeBlocks: HomeBlockItem[] =
    design.homeBlocks && design.homeBlocks.length > 0 ? design.homeBlocks : defaultHomeBlocks();

  const toggleNavTab = (tabId: Screen) => {
    const opt = NAV_TAB_OPTIONS.find((o) => o.id === tabId);
    if (opt?.locked) return;
    if (navTabs.includes(tabId)) {
      if (navTabs.length <= 3) return;
      setDesignConfig({ navTabs: navTabs.filter((id) => id !== tabId) });
    } else {
      if (navTabs.length >= 5) {
        setStatusMessage("На нижней панели помещается до 5 вкладок. Сначала снимите одну из текущих.");
        return;
      }
      const next: Screen[] = navTabs.filter((id) => id !== "more");
      next.push(tabId);
      next.push("more");
      setDesignConfig({ navTabs: next });
    }
  };

  const moveHomeBlock = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= homeBlocks.length) return;
    const copy = homeBlocks.slice();
    const [moved] = copy.splice(idx, 1);
    if (moved) {
      copy.splice(nextIdx, 0, moved);
      setDesignConfig({ homeBlocks: copy });
    }
  };

  const toggleHomeBlock = (id: string) => {
    setDesignConfig({
      homeBlocks: homeBlocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)),
    });
  };

  const handleSaveProfile = () => {
    const cleanName = profileNameDraft.trim();
    if (!cleanName) {
      setStatusMessage("Укажите название профиля оформления.");
      return;
    }
    const profile: DesignProfile = {
      id: `custom_${uid()}`,
      name: cleanName,
      isPreset: false,
      config: { ...design },
    };
    saveDesignProfile(profile);
    setProfileNameDraft("");
    setStatusMessage(`Профиль «${cleanName}» сохранён.`);
  };

  const handleDuplicateProfile = (p: DesignProfile) => {
    const dup: DesignProfile = {
      id: `custom_${uid()}`,
      name: `${p.name} (копия)`,
      isPreset: false,
      config: { ...p.config },
    };
    saveDesignProfile(dup);
    setStatusMessage(`Создана копия профиля «${dup.name}».`);
  };

  const handleRenameSubmit = (p: DesignProfile) => {
    const nextName = renameDraft.trim();
    if (!nextName) return;
    saveDesignProfile({ ...p, name: nextName });
    setRenameId(null);
    setRenameDraft("");
    setStatusMessage(`Профиль переименован в «${nextName}».`);
  };

  const handleImportJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const check = validateDesignConfigImport(parsed);
      if (!check.ok || !check.config) {
        setStatusMessage(check.error || "Ошибка валидации файла конфигурации.");
        return;
      }
      setDesignConfig(check.config);
      setThemeSafely(check.config.theme);
      if (check.name) {
        saveDesignProfile({
          id: `import_${uid()}`,
          name: check.name,
          isPreset: false,
          config: check.config,
        });
      }
      setStatusMessage("Конфигурация MetaDesign успешно импортирована и применена.");
    } catch {
      setStatusMessage("Не удалось прочитать JSON-файл оформления.");
    }
  };

  const setThemeSafely = (nextTheme: Theme) => {
    setDesignConfig({ theme: nextTheme });
  };

  const userProfiles = data.designProfiles || [];
  const allProfiles = [...DESIGN_PRESET_PROFILES, ...userProfiles];
  const activeProfile = allProfiles.find((p) => p.id === data.activeDesignProfileId);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <Palette className="h-7 w-7 text-copper" />
            <span>MetaDesign Studio</span>
          </h1>
          <p className="text-sm text-muted">
            Система персонализации интерфейса MetaШколы 2.2.3 · Мгновенное применение и живой предпросмотр
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            variant="ghost"
            onClick={() => setSection("preview")}
            className="text-xs"
          >
            <Eye className="h-4 w-4" />
            <span>Live Preview</span>
          </Btn>
          <Btn
            variant="ghost"
            onClick={() =>
              downloadText(
                `metashkola-design-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify({ name: activeProfile?.name || "My MetaDesign", version: 1, config: design }, null, 2),
                "application/json"
              )
            }
            className="text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Экспорт JSON</span>
          </Btn>
        </div>
      </header>

      {statusMessage ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-copper/40 bg-copper/10 px-3 py-2 text-xs text-fg">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-muted hover:text-fg px-1">
            ✕
          </button>
        </div>
      ) : null}

      {/* 14-Section Horizontal / Wrapping Navigation */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-surface p-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-copper text-copper-fg" : "bg-surface-2/60 text-muted hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: ОБЗОР */}
      {section === "overview" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-xl font-bold">Текущая конфигурация оформления</h2>
            <p className="mt-1 text-sm text-muted">
              Все изменения сразу записываются в локальное хранилище (Zustand Persist v3) и обновляют CSS-токены интерфейса.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                <p className="text-muted">Тема</p>
                <p className="mt-1 font-bold text-fg capitalize">{design.theme}</p>
                <p className="text-[11px] text-muted">Активна: {computed.effectiveMode === "dark" ? "Тёмная" : "Светлая"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                <p className="text-muted">Палитра</p>
                <p className="mt-1 font-bold text-fg">{PALETTES[design.palette]?.nameRu || design.palette}</p>
                <p className="text-[11px] text-muted">{design.primaryColor ? "Кастомный цвет" : "Стандарт палитры"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                <p className="text-muted">Шрифт и плотность</p>
                <p className="mt-1 font-bold text-fg">
                  {computed.rootFontSizePx}px · {design.density}
                </p>
                <p className="text-[11px] text-muted">Масштаб {design.fontScale ?? 100}%</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                <p className="text-muted">Контраст WCAG AA</p>
                <p className={`mt-1 font-bold ${textAaOk ? "text-sage" : "text-clay"}`}>
                  {textContrastRatio.toFixed(1)}:1 {textAaOk ? "(OK)" : "(Низкий)"}
                </p>
                <p className="text-[11px] text-muted">Профиль: {activeProfile?.name || "Пользовательский"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={() => setSection("colors")} className="text-xs">
                <Palette className="h-4 w-4" />
                <span>Настроить цвета</span>
              </Btn>
              <Btn variant="ghost" onClick={() => setSection("profiles")} className="text-xs">
                <FolderOpen className="h-4 w-4" />
                <span>Выбрать пресет ({allProfiles.length})</span>
              </Btn>
              <Btn variant="ghost" onClick={() => setSection("home")} className="text-xs">
                <Sliders className="h-4 w-4" />
                <span>Конструктор главного экрана</span>
              </Btn>
            </div>
          </Card>

          <LivePreviewBox
            config={design}
            viewport={previewViewport}
            onViewportChange={setPreviewViewport}
          />
        </div>
      ) : null}

      {/* SECTION 2: ТЕМЫ */}
      {section === "themes" ? (
        <Card>
          <h2 className="text-xl font-bold">Режим темы (5 режимов)</h2>
          <p className="mt-1 text-sm text-muted">
            Выберите базовое освещение интерфейса или автоматическое переключение по времени суток.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              ["light", "Светлая", "Чистый дневной режим", Sun],
              ["dark", "Тёмная", "Комфорт при слабом освещении", Moon],
              ["system", "Системная", "Следует настройкам ОС / Android", Smartphone],
              ["adaptive", "Адаптивная", "Системная + вечернее авто-затемнение (21:00–06:00)", Sparkles],
              ["auto", "По расписанию", "Строго по заданным ниже часам", Navigation],
            ] as const).map(([val, title, desc, Icon]) => {
              const active = design.theme === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setThemeSafely(val)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-copper bg-copper/10" : "border-line bg-surface-2/40 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2 text-sm font-bold text-fg">
                      <Icon className="h-4 w-4 text-copper" />
                      {title}
                    </span>
                    {active ? <Check className="h-4 w-4 text-copper" /> : null}
                  </div>
                  <span className="text-xs text-muted">{desc}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface-2/30 p-3 space-y-3">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(design.autoThemeByTime || design.theme === "auto")}
                onChange={(e) =>
                  setDesignConfig({
                    autoThemeByTime: e.target.checked,
                    theme: e.target.checked ? "auto" : "system",
                  })
                }
              />
              <span>Включить автопереключение на тёмную тему по времени суток</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted flex flex-col gap-1">
                <span>Начало тёмной темы (час, 0–23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={design.autoThemeStartHour ?? 20}
                  onChange={(e) =>
                    setDesignConfig({
                      autoThemeStartHour: Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                    })
                  }
                  className={controlClass}
                />
              </label>
              <label className="text-xs text-muted flex flex-col gap-1">
                <span>Возврат к светлой (час, 0–23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={design.autoThemeEndHour ?? 7}
                  onChange={(e) =>
                    setDesignConfig({
                      autoThemeEndHour: Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                    })
                  }
                  className={controlClass}
                />
              </label>
            </div>
          </div>
        </Card>
      ) : null}

      {/* SECTION 3: ЦВЕТА */}
      {section === "colors" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">Фирменные палитры и WCAG-контраст</h2>
                <p className="text-sm text-muted">Выберите готовую палитру или переопределите каждый цвет вручную.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDesignConfig({
                    primaryColor: undefined,
                    secondaryColor: undefined,
                    accentColor: undefined,
                    bgColor: undefined,
                    surfaceColor: undefined,
                    surfaceElevatedColor: undefined,
                    textColor: undefined,
                    secondaryTextColor: undefined,
                    borderColor: undefined,
                    successColor: undefined,
                    warningColor: undefined,
                    errorColor: undefined,
                    infoColor: undefined,
                  })
                }
                className="text-xs font-semibold text-copper hover:underline"
              >
                Сбросить все ручные цвета
              </button>
            </div>

            {/* WCAG Contrast Monitor */}
            <div className={`mt-3 rounded-xl border p-3 text-xs ${textAaOk ? "border-sage/40 bg-sage/10" : "border-clay/50 bg-clay/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  {textAaOk ? <Check className="h-4 w-4 text-sage" /> : <AlertTriangle className="h-4 w-4 text-clay" />}
                  <span>Контраст текста на карточках (WCAG 2.1 AA ≥ 4.5:1): {textContrastRatio.toFixed(2)}:1</span>
                </span>
                <span className="text-muted">
                  Текст кнопок: {primaryBtnContrast.toFixed(1)}:1 · Акцент/Фон: {primaryBgContrast.toFixed(1)}:1
                </span>
              </div>
              {!textAaOk ? (
                <p className="mt-1 text-clay">
                  Предупреждение: текущий цвет текста или поверхности имеет низкую читаемость. Сделайте текст темнее/светлее.
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PALETTES) as ColorPalette[]).map((palKey) => {
                const pal = PALETTES[palKey];
                const isSelected = design.palette === palKey && !design.primaryColor;
                return (
                  <button
                    key={palKey}
                    type="button"
                    onClick={() =>
                      setDesignConfig({
                        palette: palKey,
                        primaryColor: undefined,
                        accentColor: undefined,
                      })
                    }
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                      isSelected ? "border-copper bg-copper/10 font-semibold" : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex -space-x-1 items-center">
                      <span className="inline-block h-5 w-5 rounded-full border border-surface" style={{ backgroundColor: pal.previewColor }} />
                      <span className="inline-block h-4 w-4 rounded-full border border-surface" style={{ backgroundColor: pal.accentColor }} />
                    </div>
                    <p className="text-xs truncate text-fg font-medium flex-1">{pal.nameRu}</p>
                    {isSelected ? <Check className="h-3.5 w-3.5 text-copper shrink-0" /> : null}
                  </button>
                );
              })}
            </div>

            <h3 className="mt-5 mb-2 text-sm font-bold text-fg">Точная настройка 13 цветовых токенов (HEX / RGB)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CUSTOM_COLOR_FIELDS.map((field) => {
                const fallbackHex =
                  field.fallbackKey === "fixed"
                    ? field.fixedHex || "#16a34a"
                    : paletteColors[field.fallbackKey];
                const currentVal = design[field.key] as string | undefined;
                return (
                  <ColorControlRow
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    value={currentVal}
                    defaultHex={fallbackHex}
                    onChange={(hex) => setDesignConfig({ [field.key]: hex })}
                    onReset={() => setDesignConfig({ [field.key]: undefined })}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      ) : null}

      {/* SECTION 4: ТИПОГРАФИКА */}
      {section === "typography" ? (
        <Card>
          <h2 className="text-xl font-bold">Типографика и читаемость</h2>
          <p className="mt-1 text-sm text-muted">Настройте семейство шрифтов, базовый кегль, интерлиньяж и начертание.</p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Семейство шрифтов (с безопасным системным fallback)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["default", "По умолчанию (Manrope)"],
                  ["manrope", "Manrope UI"],
                  ["system", "Системный шрифт"],
                  ["serif", "Literata (Книжный)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.fontFamily || "default") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ fontFamily: val as TypographyFontFamily })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                  Базовый размер текста
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["sm", "Мелкий (14px)"],
                    ["md", "Обычный (16px)"],
                    ["lg", "Крупный (18px)"],
                  ] as const).map(([val, lbl]) => (
                    <Btn
                      key={val}
                      variant={design.fontSize === val ? "primary" : "ghost"}
                      onClick={() => setDesignConfig({ fontSize: val })}
                      className="text-xs"
                    >
                      {lbl}
                    </Btn>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Масштаб шрифта (%)
                  </label>
                  <span className="text-xs font-bold text-copper tabular-nums">
                    {design.fontScale ?? 100}% ({computed.rootFontSizePx}px)
                  </span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={130}
                  step={5}
                  value={design.fontScale ?? 100}
                  onChange={(e) => setDesignConfig({ fontScale: Number(e.target.value) })}
                  className="w-full accent-copper"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                  Межстрочный интервал
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["tight", "Плотный (1.35)"],
                    ["normal", "Обычный (1.5)"],
                    ["relaxed", "Свободный (1.7)"],
                  ] as const).map(([val, lbl]) => (
                    <Btn
                      key={val}
                      variant={(design.lineHeight || "normal") === val ? "primary" : "ghost"}
                      onClick={() => setDesignConfig({ lineHeight: val as TypographyLineHeight })}
                      className="text-xs"
                    >
                      {lbl}
                    </Btn>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                  Толщина текста
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ["normal", "400"],
                    ["medium", "500"],
                    ["semibold", "600"],
                    ["bold", "700"],
                  ] as const).map(([val, lbl]) => (
                    <Btn
                      key={val}
                      variant={(design.fontWeight || "normal") === val ? "primary" : "ghost"}
                      onClick={() => setDesignConfig({ fontWeight: val as TypographyFontWeight })}
                      className="text-xs"
                    >
                      {lbl}
                    </Btn>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* SECTION 5: ПЛОТНОСТЬ */}
      {section === "density" ? (
        <Card>
          <h2 className="text-xl font-bold">Плотность интерфейса</h2>
          <p className="mt-1 text-sm text-muted">
            Регулирует внутренние отступы карточек, интервалы списков и высоту интерактивных элементов. Минимальные зоны касания остаются удобными для сенсорного экрана.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ["compact", "Компактная", "Больше уроков и задач на одном экране (отступы 10px, поля 36px)"],
              ["normal", "Стандартная", "Сбалансированная эргономика по умолчанию (отступы 16px, поля 44px)"],
              ["spacious", "Просторная", "Увеличенные отступы и крупные зоны нажатия (отступы 22px, поля 52px)"],
            ] as const).map(([val, title, desc]) => {
              const active = design.density === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDesignConfig({ density: val as UiDensity })}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors ${
                    active ? "border-copper bg-copper/10" : "border-line bg-surface-2/40 hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-fg">{title}</span>
                    {active ? <Check className="h-4 w-4 text-copper" /> : null}
                  </div>
                  <span className="text-xs text-muted">{desc}</span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* SECTION 6: КАРТОЧКИ */}
      {section === "cards" ? (
        <Card>
          <h2 className="text-xl font-bold">Оформление карточек и поверхностей</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Скругление углов</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ["sm", "Острые (4px)"],
                  ["md", "Умеренные (8px)"],
                  ["lg", "Мягкие (12px)"],
                  ["full", "Крупные (20px)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={design.radius === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ radius: val as CardRadius })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Тени карточек</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ["none", "Без тени"],
                  ["subtle", "Лёгкая"],
                  ["medium", "Средняя"],
                  ["strong", "Выраженная"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.cardShadow || "subtle") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ cardShadow: val as CardShadow })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Толщина границ</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ["none", "Нет"],
                  ["thin", "Тонкая (1px)"],
                  ["normal", "Обычная (1.5px)"],
                  ["emphasized", "Акцентная (2px)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.cardBorder || "thin") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ cardBorder: val as CardBorder })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Прозрачность фона</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["opaque", "Плотный (100%)"],
                  ["translucent", "Полупрозрачный (84%)"],
                  ["glass", "Стекло (Blur + 65%)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.cardTransparency || "opaque") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ cardTransparency: val as CardTransparency })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* SECTION 7: КНОПКИ И ЭЛЕМЕНТЫ УПРАВЛЕНИЯ */}
      {section === "buttons" ? (
        <Card>
          <h2 className="text-xl font-bold">Кнопки и элементы управления</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Стиль основных кнопок</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["filled", "Заливка (Filled)"],
                  ["outlined", "Контур (Outlined)"],
                  ["soft", "Мягкий (Soft)"],
                  ["minimal", "Минимал"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.buttonStyle || "filled") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ buttonStyle: val as ButtonStyle })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Форма кнопок</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ["sm", "Угловатая"],
                  ["md", "Средняя"],
                  ["lg", "Мягкая"],
                  ["full", "Капсула"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.buttonRadius || "lg") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ buttonRadius: val as ButtonRadius })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Высота кнопок</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["compact", "Компактная (36px)"],
                  ["normal", "Обычная (44px)"],
                  ["spacious", "Крупная (52px)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.buttonHeight || "normal") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ buttonHeight: val as ButtonHeight })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={design.pressEffect !== false}
                onChange={(e) => setDesignConfig({ pressEffect: e.target.checked })}
              />
              <span>Тактильный эффект сжатия при нажатии (scale 0.97)</span>
            </label>
          </div>
        </Card>
      ) : null}

      {/* SECTION 8: ИКОНКИ И ВИЗУАЛЬНЫЕ ДЕТАЛИ */}
      {section === "icons" ? (
        <Card>
          <h2 className="text-xl font-bold">Иконки и штрихи</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Стиль набора иконок</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["default", "Стандарт (Lucide 2px)"],
                  ["rounded", "Скруглённый акцент"],
                  ["minimal", "Тонкий штрих (1.5px)"],
                  ["outline", "Контурный (2.25px)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.iconSet || "default") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ iconSet: val as IconSet })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Размер иконок навигации</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["sm", "Мелкие (16px)"],
                  ["md", "Средние (20px)"],
                  ["lg", "Крупные (24px)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.iconSize || "md") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ iconSize: val as IconSize })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* SECTION 9: НАВИГАЦИЯ */}
      {section === "navigation" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Нижняя навигационная панель (Mobile)</h2>
              <p className="text-sm text-muted">
                Выберите от 3 до 5 вкладок для быстрого доступа. «Главная» и «Ещё» защищены от скрытия.
              </p>
            </div>
            <Btn
              variant="ghost"
              onClick={() => setDesignConfig({ navTabs: ["home", "schedule", "tasks", "ai", "more"] })}
              className="text-xs"
            >
              Сбросить вкладки
            </Btn>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NAV_TAB_OPTIONS.map((opt) => {
              const checked = navTabs.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                    checked ? "border-copper bg-copper/10 text-fg" : "border-line bg-surface-2/40 text-muted"
                  }`}
                >
                  <span>
                    {opt.label}
                    {opt.locked ? " (обяз.)" : ""}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={opt.locked}
                    onChange={() => toggleNavTab(opt.id)}
                  />
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Выбрано вкладок: <strong>{navTabs.length} / 5</strong>
          </p>
        </Card>
      ) : null}

      {/* SECTION 10: ГЛАВНЫЙ ЭКРАН */}
      {section === "home" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Конструктор главного экрана</h2>
              <p className="text-sm text-muted">
                Управляйте порядком и видимостью секций на главном экране. Данные модулей при скрытии не удаляются.
              </p>
            </div>
            <Btn variant="ghost" onClick={() => setDesignConfig({ homeBlocks: defaultHomeBlocks(), homeCompact: false })} className="text-xs">
              Порядок по умолчанию
            </Btn>
          </div>

          <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(design.homeCompact)}
              onChange={(e) => setDesignConfig({ homeCompact: e.target.checked })}
            />
            <span>Компактный режим карточек на Главной</span>
          </label>

          <div className="mt-4 flex flex-col gap-2">
            {homeBlocks.map((block, idx) => (
              <div
                key={block.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5"
              >
                <label className="flex items-center gap-2.5 text-sm font-semibold text-fg cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={block.enabled}
                    onChange={() => toggleHomeBlock(block.id)}
                  />
                  <span>{block.label}</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveHomeBlock(idx, -1)}
                    aria-label="Переместить вверх"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-fg disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === homeBlocks.length - 1}
                    onClick={() => moveHomeBlock(idx, 1)}
                    aria-label="Переместить вниз"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-fg disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* SECTION 11: АНИМАЦИЯ */}
      {section === "animation" ? (
        <Card>
          <h2 className="text-xl font-bold">Анимация и переходы</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={design.animationsEnabled !== false}
                onChange={(e) => setDesignConfig({ animationsEnabled: e.target.checked })}
              />
              <span>Включить плавные переходы и микроанимации интерфейса</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(design.reducedMotion)}
                onChange={(e) => setDesignConfig({ reducedMotion: e.target.checked })}
              />
              <span>Режим уменьшенного движения (Reduced Motion — экономия батареи и комфорт глаз)</span>
            </label>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Скорость анимаций</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["slow", "Плавная (360ms)"],
                  ["normal", "Обычная (200ms)"],
                  ["fast", "Быстрая (100ms)"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.animationSpeed || "normal") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ animationSpeed: val as AnimationSpeed })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">Эффект переключения экранов</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["none", "Мгновенно"],
                  ["fade", "Плавное появление"],
                  ["slide", "Сдвиг"],
                ] as const).map(([val, lbl]) => (
                  <Btn
                    key={val}
                    variant={(design.screenTransition || "fade") === val ? "primary" : "ghost"}
                    onClick={() => setDesignConfig({ screenTransition: val as ScreenTransition })}
                    className="text-xs"
                  >
                    {lbl}
                  </Btn>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* SECTION 12: ПРЕДПРОСМОТР */}
      {section === "preview" ? (
        <LivePreviewBox
          config={design}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
        />
      ) : null}

      {/* SECTION 13: ПРОФИЛИ ОФОРМЛЕНИЯ */}
      {section === "profiles" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-xl font-bold">Профили оформления (Пресеты и Пользовательские)</h2>
            <p className="mt-1 text-sm text-muted">
              Сохраняйте наборы настроек в отдельные профили, дублируйте их или обменивайтесь через JSON-файлы.
            </p>

            {/* Save Current as Profile */}
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                type="text"
                value={profileNameDraft}
                onChange={(e) => setProfileNameDraft(e.target.value)}
                placeholder="Название нового профиля..."
                className="min-h-11 flex-1 min-w-[200px] rounded-xl border border-line bg-bg px-3 text-sm text-fg"
              />
              <Btn onClick={handleSaveProfile} className="text-xs">
                <Save className="h-4 w-4" />
                <span>Сохранить текущий</span>
              </Btn>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-xs font-semibold text-fg hover:bg-surface-2/80">
                <Upload className="h-4 w-4 text-copper" />
                <span>Импорт JSON</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportJson(f);
                  }}
                />
              </label>
            </div>

            {/* Built-in Presets */}
            <h3 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Встроенные пресеты (5)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DESIGN_PRESET_PROFILES.map((p) => {
                const isActive = data.activeDesignProfileId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                      isActive ? "border-copper bg-copper/10" : "border-line bg-surface-2/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-fg truncate">{p.name}</p>
                      <p className="text-[11px] text-muted">
                        {p.config.palette} · {p.config.density} · {p.config.theme}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Btn
                        variant={isActive ? "primary" : "ghost"}
                        onClick={() => {
                          applyDesignProfile(p.id);
                          setStatusMessage(`Применён пресет «${p.name}».`);
                        }}
                        className="text-xs"
                      >
                        {isActive ? "Активен" : "Применить"}
                      </Btn>
                      <button
                        type="button"
                        onClick={() => handleDuplicateProfile(p)}
                        title="Дублировать как свой"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:text-fg"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Profiles */}
            <h3 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Мои профили ({userProfiles.length})
            </h3>
            {userProfiles.length === 0 ? (
              <p className="text-xs text-muted">Вы ещё не создали собственных профилей. Введите название выше и нажмите «Сохранить текущий».</p>
            ) : (
              <div className="flex flex-col gap-2">
                {userProfiles.map((p) => {
                  const isActive = data.activeDesignProfileId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                        isActive ? "border-copper bg-copper/10" : "border-line bg-surface-2/30"
                      }`}
                    >
                      {renameId === p.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            className="h-9 flex-1 rounded-lg border border-line bg-surface px-2 text-xs text-fg"
                          />
                          <Btn onClick={() => handleRenameSubmit(p)} className="text-xs">
                            Ок
                          </Btn>
                          <Btn variant="ghost" onClick={() => setRenameId(null)} className="text-xs">
                            Отмена
                          </Btn>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-fg truncate">{p.name}</p>
                            <p className="text-[11px] text-muted">
                              {p.config.palette} · {p.config.density} · {p.config.theme}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Btn
                              variant={isActive ? "primary" : "ghost"}
                              onClick={() => {
                                applyDesignProfile(p.id);
                                setStatusMessage(`Применён профиль «${p.name}».`);
                              }}
                              className="text-xs"
                            >
                              {isActive ? "Активен" : "Применить"}
                            </Btn>
                            <Btn
                              variant="ghost"
                              onClick={() => {
                                setRenameId(p.id);
                                setRenameDraft(p.name);
                              }}
                              className="text-xs"
                            >
                              Переименовать
                            </Btn>
                            <Btn
                              variant="ghost"
                              onClick={() =>
                                downloadText(
                                  `${p.name.toLowerCase().replace(/\s+/g, "-")}.json`,
                                  JSON.stringify(p, null, 2),
                                  "application/json"
                                )
                              }
                              className="text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Btn>
                            <Btn
                              variant="danger"
                              onClick={() => {
                                deleteDesignProfile(p.id);
                                setStatusMessage(`Профиль «${p.name}» удалён.`);
                              }}
                              className="text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Btn>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {/* SECTION 14: СБРОС И ВОССТАНОВЛЕНИЕ */}
      {section === "reset" ? (
        <Card className="border-clay/40">
          <h2 className="text-xl font-bold text-fg flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-clay" />
            <span>Сброс и восстановление оформления</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Вернёт все цвета, шрифты, плотность, карточки, кнопки, вкладки навигации и блоки главного экрана к заводским параметрам MetaШколы 2.2.3. Учебные данные и созданные профили сохранятся.
          </p>

          {!confirmReset ? (
            <div className="mt-4 flex gap-2">
              <Btn variant="danger" onClick={() => setConfirmReset(true)}>
                Сбросить оформление к стандартному
              </Btn>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-clay/40 bg-clay/10 p-3 space-y-3">
              <p className="text-xs font-bold text-clay">
                Подтвердите сброс всех текущих параметров MetaDesign Studio:
              </p>
              <div className="flex gap-2">
                <Btn
                  variant="danger"
                  onClick={() => {
                    resetDesignConfig();
                    setConfirmReset(false);
                    setStatusMessage("Настройки оформления сброшены к стандартным.");
                  }}
                >
                  Да, сбросить сейчас
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirmReset(false)}>
                  Отмена
                </Btn>
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
