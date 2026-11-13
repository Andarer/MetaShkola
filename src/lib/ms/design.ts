import { defaultDesignConfig, type ColorPalette, type DesignProfile, type MetaDesignConfig, type Theme } from "@/lib/ms/types";

export const DEFAULT_DESIGN: MetaDesignConfig = defaultDesignConfig();

export type PalettePreset = {
  id: ColorPalette;
  name: string;
  nameRu: string;
  previewColor: string;
  accentColor: string;
  light: {
    copper: string;
    copperFg: string;
    sage: string;
    bg: string;
    surface: string;
    surface2: string;
    line: string;
    fg: string;
    muted: string;
  };
  dark: {
    copper: string;
    copperFg: string;
    sage: string;
    bg: string;
    surface: string;
    surface2: string;
    line: string;
    fg: string;
    muted: string;
  };
};

export const PALETTES: Record<ColorPalette, PalettePreset> = {
  amber: {
    id: "amber",
    name: "Amber Copper",
    nameRu: "Янтарная медь (Классика)",
    previewColor: "#ff8c00",
    accentColor: "#1976d2",
    light: {
      copper: "#ff8c00",
      copperFg: "#ffffff",
      sage: "#1976d2",
      bg: "#e6f1ff",
      surface: "#ffffff",
      surface2: "#d6e8ff",
      line: "#c2dcfa",
      fg: "#0d1b2a",
      muted: "#4a627a",
    },
    dark: {
      copper: "#ff9d26",
      copperFg: "#0d1b2a",
      sage: "#00bfff",
      bg: "#0d1b2a",
      surface: "#14283e",
      surface2: "#1b3552",
      line: "#24466d",
      fg: "#e6f1ff",
      muted: "#8ba2bd",
    },
  },
  emerald: {
    id: "emerald",
    name: "Emerald Forest",
    nameRu: "Изумрудный бор",
    previewColor: "#059669",
    accentColor: "#0d9488",
    light: {
      copper: "#059669",
      copperFg: "#ffffff",
      sage: "#0d9488",
      bg: "#f0fdf4",
      surface: "#ffffff",
      surface2: "#dcfce7",
      line: "#bbf7d0",
      fg: "#064e3b",
      muted: "#377d68",
    },
    dark: {
      copper: "#10b981",
      copperFg: "#06251d",
      sage: "#2dd4bf",
      bg: "#06251d",
      surface: "#0b3b2f",
      surface2: "#124f3f",
      line: "#1b6954",
      fg: "#ecfdf5",
      muted: "#7abda8",
    },
  },
  violet: {
    id: "violet",
    name: "Neon Amethyst",
    nameRu: "Неоновый аметист",
    previewColor: "#7c3aed",
    accentColor: "#9333ea",
    light: {
      copper: "#7c3aed",
      copperFg: "#ffffff",
      sage: "#9333ea",
      bg: "#f5f3ff",
      surface: "#ffffff",
      surface2: "#ede9fe",
      line: "#ddd6fe",
      fg: "#2e1065",
      muted: "#6b5993",
    },
    dark: {
      copper: "#a78bfa",
      copperFg: "#150d2a",
      sage: "#c084fc",
      bg: "#150d2a",
      surface: "#211442",
      surface2: "#2e1b5c",
      line: "#422880",
      fg: "#f5f3ff",
      muted: "#9e8bc4",
    },
  },
  azure: {
    id: "azure",
    name: "Azure Ocean",
    nameRu: "Лазурный океан",
    previewColor: "#2563eb",
    accentColor: "#0284c7",
    light: {
      copper: "#2563eb",
      copperFg: "#ffffff",
      sage: "#0284c7",
      bg: "#f0f9ff",
      surface: "#ffffff",
      surface2: "#e0f2fe",
      line: "#bae6fd",
      fg: "#082f49",
      muted: "#486e88",
    },
    dark: {
      copper: "#60a5fa",
      copperFg: "#0a192f",
      sage: "#38bdf8",
      bg: "#0a192f",
      surface: "#102a4e",
      surface2: "#183c6c",
      line: "#23508f",
      fg: "#f0f9ff",
      muted: "#85a7cb",
    },
  },
  rose: {
    id: "rose",
    name: "Raspberry Sunset",
    nameRu: "Малиновый закат",
    previewColor: "#e11d48",
    accentColor: "#f43f5e",
    light: {
      copper: "#e11d48",
      copperFg: "#ffffff",
      sage: "#db2777",
      bg: "#fff1f2",
      surface: "#ffffff",
      surface2: "#ffe4e6",
      line: "#fecdd3",
      fg: "#4c0519",
      muted: "#8a4a58",
    },
    dark: {
      copper: "#fb7185",
      copperFg: "#260b13",
      sage: "#f472b6",
      bg: "#260b13",
      surface: "#3b1320",
      surface2: "#521c2e",
      line: "#6e2840",
      fg: "#fff1f2",
      muted: "#c07e91",
    },
  },
  graphite: {
    id: "graphite",
    name: "Minimal Graphite",
    nameRu: "Графитовый монохром",
    previewColor: "#4b5563",
    accentColor: "#64748b",
    light: {
      copper: "#374151",
      copperFg: "#ffffff",
      sage: "#475569",
      bg: "#f8fafc",
      surface: "#ffffff",
      surface2: "#f1f5f9",
      line: "#e2e8f0",
      fg: "#0f172a",
      muted: "#64748b",
    },
    dark: {
      copper: "#9ca3af",
      copperFg: "#0b0f17",
      sage: "#cbd5e1",
      bg: "#0b0f17",
      surface: "#151b26",
      surface2: "#1f2937",
      line: "#334155",
      fg: "#f8fafc",
      muted: "#94a3b8",
    },
  },
};

/**
 * Validates 3, 6, or 8 character hex color strings.
 */
export function isValidHexColor(color?: string): boolean {
  if (!color || typeof color !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
}

/**
 * Parses hex color to RGB tuple [r, g, b]
 */
export function hexToRgb(hexColor?: string): [number, number, number] {
  if (!hexColor || !isValidHexColor(hexColor)) return [255, 255, 255];
  const clean = hexColor.trim().replace(/^#/, "");
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n || 0)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Calculates WCAG 2.1 relative luminance (0..1)
 */
export function getRelativeLuminance(hexColor?: string): number {
  const [r, g, b] = hexToRgb(hexColor);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes WCAG 2.1 contrast ratio (1..21) between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isWcagAA(ratio: number, isLargeText = false): boolean {
  return ratio >= (isLargeText ? 3.0 : 4.5);
}

/**
 * Calculates WCAG 2.1 relative luminance and returns the optimal text contrast color
 * (either dark ink #0d1b2a or pure white #ffffff).
 */
export function getContrastColor(hexColor?: string): string {
  if (!hexColor || !isValidHexColor(hexColor)) return "#ffffff";
  const luminance = getRelativeLuminance(hexColor);
  // Optimal contrast threshold: (L + 0.05)^2 = 1.05 / 20 => L ≈ 0.179
  return luminance > 0.179 ? "#0d1b2a" : "#ffffff";
}

/**
 * Resolves effective dark/light mode based on design configuration,
 * system preference, and time-of-day automation.
 */
export function resolveEffectiveTheme(
  theme: Theme,
  autoThemeByTime: boolean = false,
  startHour: number = 20,
  endHour: number = 7
): "light" | "dark" {
  if (autoThemeByTime || theme === "auto") {
    const hour = new Date().getHours();
    if (startHour > endHour) {
      return hour >= startHour || hour < endHour ? "dark" : "light";
    }
    return hour >= startHour && hour < endHour ? "dark" : "light";
  }

  if (theme === "adaptive") {
    // Adaptive mode follows system dark preference during evening/night or if system prefers dark
    const hour = new Date().getHours();
    const sysDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return sysDark || hour >= 21 || hour < 6 ? "dark" : "light";
  }

  if (theme === "dark") return "dark";
  if (theme === "light") return "light";

  // System preference fallback
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/**
 * Built-in MetaDesign Studio preset profiles
 */
export const DESIGN_PRESET_PROFILES: DesignProfile[] = [
  {
    id: "preset_standard",
    name: "Стандартный",
    isPreset: true,
    config: defaultDesignConfig(),
  },
  {
    id: "preset_comfortable",
    name: "Комфортный",
    isPreset: true,
    config: {
      ...defaultDesignConfig(),
      palette: "azure",
      density: "spacious",
      radius: "full",
      fontSize: "lg",
      fontScale: 105,
      lineHeight: "relaxed",
      cardShadow: "medium",
      buttonHeight: "spacious",
    },
  },
  {
    id: "preset_compact",
    name: "Компактный",
    isPreset: true,
    config: {
      ...defaultDesignConfig(),
      palette: "graphite",
      density: "compact",
      radius: "sm",
      fontSize: "sm",
      fontScale: 95,
      lineHeight: "tight",
      cardShadow: "none",
      cardBorder: "thin",
      buttonHeight: "compact",
      homeCompact: true,
    },
  },
  {
    id: "preset_high_contrast",
    name: "Высокий контраст",
    isPreset: true,
    config: {
      ...defaultDesignConfig(),
      theme: "dark",
      palette: "graphite",
      primaryColor: "#ffd600",
      accentColor: "#00e5ff",
      bgColor: "#000000",
      surfaceColor: "#111111",
      surfaceElevatedColor: "#1e1e1e",
      textColor: "#ffffff",
      borderColor: "#ffffff",
      cardBorder: "emphasized",
      fontSize: "lg",
      fontWeight: "semibold",
      reducedMotion: true,
    },
  },
  {
    id: "preset_personal",
    name: "Личный (Изумруд)",
    isPreset: true,
    config: {
      ...defaultDesignConfig(),
      palette: "emerald",
      radius: "lg",
      cardShadow: "subtle",
      cardTransparency: "translucent",
      buttonStyle: "soft",
      fontFamily: "manrope",
    },
  },
];

/**
 * Validates and sanitizes an imported JSON design configuration or profile
 */
export function validateDesignConfigImport(raw: unknown): { ok: boolean; config?: MetaDesignConfig; name?: string; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Неверный формат JSON: ожидается объект конфигурации" };
  }
  const obj = raw as Record<string, any>;
  const sourceCfg = obj.config && typeof obj.config === "object" ? obj.config : obj;

  const base = defaultDesignConfig();
  const merged: MetaDesignConfig = { ...base };

  const themes = ["light", "dark", "system", "custom", "adaptive", "auto"];
  if (themes.includes(sourceCfg.theme)) merged.theme = sourceCfg.theme;

  const palettes = ["amber", "emerald", "violet", "azure", "rose", "graphite"];
  if (palettes.includes(sourceCfg.palette)) merged.palette = sourceCfg.palette;

  const densities = ["compact", "normal", "spacious"];
  if (densities.includes(sourceCfg.density)) merged.density = sourceCfg.density;

  const radii = ["sm", "md", "lg", "full"];
  if (radii.includes(sourceCfg.radius)) merged.radius = sourceCfg.radius;
  if (radii.includes(sourceCfg.buttonRadius)) merged.buttonRadius = sourceCfg.buttonRadius;

  const colorFields: (keyof MetaDesignConfig)[] = [
    "primaryColor", "secondaryColor", "accentColor", "bgColor",
    "surfaceColor", "surfaceElevatedColor", "textColor",
    "secondaryTextColor", "borderColor", "successColor",
    "warningColor", "errorColor", "infoColor",
  ];
  for (const field of colorFields) {
    if (isValidHexColor(sourceCfg[field])) {
      (merged as any)[field] = String(sourceCfg[field]).trim();
    }
  }

  if (typeof sourceCfg.fontScale === "number" && sourceCfg.fontScale >= 80 && sourceCfg.fontScale <= 135) {
    merged.fontScale = sourceCfg.fontScale;
  }
  if (["sm", "md", "lg"].includes(sourceCfg.fontSize)) merged.fontSize = sourceCfg.fontSize;
  if (["default", "manrope", "system", "serif"].includes(sourceCfg.fontFamily)) merged.fontFamily = sourceCfg.fontFamily;
  if (["tight", "normal", "relaxed"].includes(sourceCfg.lineHeight)) merged.lineHeight = sourceCfg.lineHeight;
  if (["normal", "medium", "semibold", "bold"].includes(sourceCfg.fontWeight)) merged.fontWeight = sourceCfg.fontWeight;
  if (["none", "subtle", "medium", "strong"].includes(sourceCfg.cardShadow)) merged.cardShadow = sourceCfg.cardShadow;
  if (["none", "thin", "normal", "emphasized"].includes(sourceCfg.cardBorder)) merged.cardBorder = sourceCfg.cardBorder;
  if (["opaque", "translucent", "glass"].includes(sourceCfg.cardTransparency)) merged.cardTransparency = sourceCfg.cardTransparency;
  if (["filled", "outlined", "soft", "minimal"].includes(sourceCfg.buttonStyle)) merged.buttonStyle = sourceCfg.buttonStyle;
  if (["compact", "normal", "spacious"].includes(sourceCfg.buttonHeight)) merged.buttonHeight = sourceCfg.buttonHeight;
  if (typeof sourceCfg.pressEffect === "boolean") merged.pressEffect = sourceCfg.pressEffect;
  if (typeof sourceCfg.reducedMotion === "boolean") merged.reducedMotion = sourceCfg.reducedMotion;
  if (typeof sourceCfg.animationsEnabled === "boolean") merged.animationsEnabled = sourceCfg.animationsEnabled;
  if (typeof sourceCfg.autoThemeByTime === "boolean") merged.autoThemeByTime = sourceCfg.autoThemeByTime;
  if (typeof sourceCfg.homeCompact === "boolean") merged.homeCompact = sourceCfg.homeCompact;
  if (Array.isArray(sourceCfg.navTabs) && sourceCfg.navTabs.length >= 2) merged.navTabs = sourceCfg.navTabs;
  if (Array.isArray(sourceCfg.homeBlocks)) merged.homeBlocks = sourceCfg.homeBlocks;

  return {
    ok: true,
    config: merged,
    name: typeof obj.name === "string" ? obj.name : undefined,
  };
}

/**
 * Resolves computed CSS token map for either document root or isolated Live Preview
 */
export function computeDesignVariables(config?: Partial<MetaDesignConfig>, explicitTheme?: Theme): {
  effectiveMode: "light" | "dark";
  vars: Record<string, string>;
  rootFontSizePx: number;
} {
  const cfg: MetaDesignConfig = {
    ...DEFAULT_DESIGN,
    ...(config || {}),
  };

  const targetTheme = explicitTheme ?? cfg.theme;
  const effectiveMode = resolveEffectiveTheme(
    targetTheme,
    cfg.autoThemeByTime,
    cfg.autoThemeStartHour ?? 20,
    cfg.autoThemeEndHour ?? 7
  );

  const palette = PALETTES[cfg.palette] || PALETTES.amber;
  const colors = effectiveMode === "dark" ? palette.dark : palette.light;

  const primary = (isValidHexColor(cfg.primaryColor) ? cfg.primaryColor!.trim() : null) || colors.copper;
  const accent = (isValidHexColor(cfg.accentColor) ? cfg.accentColor!.trim() : null) || colors.sage;
  const secondary = (isValidHexColor(cfg.secondaryColor) ? cfg.secondaryColor!.trim() : null) || colors.surface2;
  const copperFg = cfg.primaryColor ? getContrastColor(primary) : colors.copperFg;
  const bg = (isValidHexColor(cfg.bgColor) ? cfg.bgColor!.trim() : null) || colors.bg;
  const surface = (isValidHexColor(cfg.surfaceColor) ? cfg.surfaceColor!.trim() : null) || colors.surface;
  const surface2 = (isValidHexColor(cfg.surfaceElevatedColor) ? cfg.surfaceElevatedColor!.trim() : null) || colors.surface2;
  const fg = (isValidHexColor(cfg.textColor) ? cfg.textColor!.trim() : null) || colors.fg;
  const muted = (isValidHexColor(cfg.secondaryTextColor) ? cfg.secondaryTextColor!.trim() : null) || colors.muted;
  const line = (isValidHexColor(cfg.borderColor) ? cfg.borderColor!.trim() : null) || colors.line;

  const success = (isValidHexColor(cfg.successColor) ? cfg.successColor!.trim() : null) || "#16a34a";
  const warning = (isValidHexColor(cfg.warningColor) ? cfg.warningColor!.trim() : null) || "#d97706";
  const errorColor = (isValidHexColor(cfg.errorColor) ? cfg.errorColor!.trim() : null) || (effectiveMode === "dark" ? "#ff6b6b" : "#d32f2f");
  const infoColor = (isValidHexColor(cfg.infoColor) ? cfg.infoColor!.trim() : null) || accent;

  // Card Radius
  let rx = "0.75rem";
  let r2x = "1rem";
  if (cfg.radius === "sm") {
    rx = "0.25rem";
    r2x = "0.375rem";
  } else if (cfg.radius === "md") {
    rx = "0.5rem";
    r2x = "0.75rem";
  } else if (cfg.radius === "full") {
    rx = "1.25rem";
    r2x = "1.75rem";
  }

  // Card Shadow
  const shadowMap: Record<string, string> = {
    none: "none",
    subtle: effectiveMode === "dark" ? "0 1px 3px rgba(0,0,0,0.35)" : "0 1px 3px rgba(13,27,42,0.06)",
    medium: effectiveMode === "dark" ? "0 6px 16px rgba(0,0,0,0.45)" : "0 6px 16px rgba(13,27,42,0.09)",
    strong: effectiveMode === "dark" ? "0 12px 28px rgba(0,0,0,0.65)" : "0 12px 28px rgba(13,27,42,0.14)",
  };
  const cardShadow = shadowMap[cfg.cardShadow || "subtle"] || shadowMap.subtle;

  // Card Border Width
  const borderWMap: Record<string, string> = {
    none: "0px",
    thin: "1px",
    normal: "1.5px",
    emphasized: "2px",
  };
  const cardBorderW = borderWMap[cfg.cardBorder || "thin"] || "1px";

  // Card Transparency
  let cardBg = surface;
  if (cfg.cardTransparency === "translucent") {
    const [r, g, b] = hexToRgb(surface);
    cardBg = `rgba(${r}, ${g}, ${b}, 0.84)`;
  } else if (cfg.cardTransparency === "glass") {
    const [r, g, b] = hexToRgb(surface);
    cardBg = `rgba(${r}, ${g}, ${b}, 0.65)`;
  }

  // UI Density
  let densityPad = "1rem";
  let controlH = "2.75rem";
  let btnPx = "1rem";
  let gap = "1rem";
  if (cfg.density === "compact") {
    densityPad = "0.625rem";
    controlH = "2.25rem";
    btnPx = "0.75rem";
    gap = "0.625rem";
  } else if (cfg.density === "spacious") {
    densityPad = "1.375rem";
    controlH = "3.25rem";
    btnPx = "1.25rem";
    gap = "1.375rem";
  }

  // Button overrides
  let btnH = controlH;
  if (cfg.buttonHeight === "compact") btnH = "2.25rem";
  if (cfg.buttonHeight === "spacious") btnH = "3.25rem";

  let btnRadius = rx;
  if (cfg.buttonRadius === "sm") btnRadius = "0.375rem";
  else if (cfg.buttonRadius === "md") btnRadius = "0.5rem";
  else if (cfg.buttonRadius === "lg") btnRadius = "0.75rem";
  else if (cfg.buttonRadius === "full") btnRadius = "9999px";

  // Typography
  const fontScale = cfg.fontScale ?? 100;
  const basePx = cfg.fontSize === "sm" ? 14 : cfg.fontSize === "lg" ? 18 : 16;
  const rootFontSizePx = Math.round((basePx * fontScale) / 100);

  const fontSansMap: Record<string, string> = {
    default: '"Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    manrope: '"Manrope", system-ui, sans-serif',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: '"Literata", Georgia, Cambria, "Times New Roman", serif',
  };

  const lineHeightMap: Record<string, string> = {
    tight: "1.35",
    normal: "1.5",
    relaxed: "1.7",
  };

  const fontWeightMap: Record<string, string> = {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  };

  // Animation duration
  const animEnabled = cfg.animationsEnabled !== false && !cfg.reducedMotion;
  const animDuration = !animEnabled
    ? "0.01ms"
    : cfg.animationSpeed === "slow"
      ? "360ms"
      : cfg.animationSpeed === "fast"
        ? "100ms"
        : "200ms";

  const vars: Record<string, string> = {
    "--ms-copper": primary,
    "--color-copper": primary,
    "--ms-copper-fg": copperFg,
    "--color-copper-fg": copperFg,
    "--ms-sage": accent,
    "--color-sage": accent,
    "--ms-secondary": secondary,
    "--ms-bg": bg,
    "--color-bg": bg,
    "--ms-surface": surface,
    "--color-surface": surface,
    "--ms-surface-2": surface2,
    "--color-surface-2": surface2,
    "--ms-line": line,
    "--color-line": line,
    "--ms-fg": fg,
    "--color-fg": fg,
    "--ms-muted": muted,
    "--color-muted": muted,
    "--ms-clay": errorColor,
    "--color-clay": errorColor,
    "--ms-success": success,
    "--ms-warning": warning,
    "--ms-info": infoColor,
    "--radius-xl": rx,
    "--radius-2xl": r2x,
    "--ms-card-shadow": cardShadow,
    "--ms-card-border-w": cardBorderW,
    "--ms-card-bg": cardBg,
    "--ms-density-pad": densityPad,
    "--ms-control-h": controlH,
    "--ms-btn-h": btnH,
    "--ms-btn-px": btnPx,
    "--ms-btn-radius": btnRadius,
    "--ms-gap": gap,
    "--ms-font-sans": fontSansMap[cfg.fontFamily || "default"] || fontSansMap.default,
    "--ms-line-height": lineHeightMap[cfg.lineHeight || "normal"] || "1.5",
    "--ms-font-weight": fontWeightMap[cfg.fontWeight || "normal"] || "400",
    "--ms-anim-duration": animDuration,
  };

  return { effectiveMode, vars, rootFontSizePx };
}

/**
 * Applies all MetaDesign CSS custom variables and styling attributes to document.documentElement
 * live without page reloads.
 */
export function applyMetaDesign(config?: Partial<MetaDesignConfig>, explicitTheme?: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const cfg: MetaDesignConfig = {
    ...DEFAULT_DESIGN,
    ...(config || {}),
  };

  const { effectiveMode, vars, rootFontSizePx } = computeDesignVariables(cfg, explicitTheme);

  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(effectiveMode === "dark" ? "theme-dark" : "theme-light");
  root.style.colorScheme = effectiveMode;

  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }

  root.setAttribute("data-density", cfg.density);
  root.setAttribute("data-btn-style", cfg.buttonStyle || "filled");
  root.setAttribute("data-press-effect", cfg.pressEffect === false ? "off" : "on");
  root.setAttribute("data-icon-size", cfg.iconSize || "md");
  root.setAttribute("data-icon-set", cfg.iconSet || "default");
  root.setAttribute("data-card-transparency", cfg.cardTransparency || "opaque");

  root.style.fontSize = `${rootFontSizePx}px`;

  if (cfg.reducedMotion || cfg.animationsEnabled === false) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }
}
