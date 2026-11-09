import type { ColorPalette, MetaDesignConfig, Theme } from "@/lib/ms/types";

export const DEFAULT_DESIGN: MetaDesignConfig = {
  theme: "system",
  palette: "amber",
  density: "normal",
  radius: "lg",
  fontSize: "md",
  reducedMotion: false,
  autoThemeByTime: false,
};

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
 * Resolves effective dark/light mode based on design configuration,
 * system preference, and time-of-day automation.
 */
export function resolveEffectiveTheme(
  theme: Theme,
  autoThemeByTime: boolean = false
): "light" | "dark" {
  if (autoThemeByTime) {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 7 ? "dark" : "light";
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

  const targetTheme = explicitTheme ?? cfg.theme;
  const effectiveMode = resolveEffectiveTheme(targetTheme, cfg.autoThemeByTime);

  // 1. Theme classes on :root
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(effectiveMode === "dark" ? "theme-dark" : "theme-light");
  root.style.colorScheme = effectiveMode;

  // 2. Palette Colors
  const palette = PALETTES[cfg.palette] || PALETTES.amber;
  const colors = effectiveMode === "dark" ? palette.dark : palette.light;

  const primary = cfg.primaryColor?.trim() || colors.copper;
  const accent = cfg.accentColor?.trim() || colors.sage;

  root.style.setProperty("--ms-copper", primary);
  root.style.setProperty("--color-copper", primary);
  root.style.setProperty("--ms-copper-fg", colors.copperFg);
  root.style.setProperty("--color-copper-fg", colors.copperFg);
  root.style.setProperty("--ms-sage", accent);
  root.style.setProperty("--color-sage", accent);
  root.style.setProperty("--ms-bg", colors.bg);
  root.style.setProperty("--color-bg", colors.bg);
  root.style.setProperty("--ms-surface", colors.surface);
  root.style.setProperty("--color-surface", colors.surface);
  root.style.setProperty("--ms-surface-2", colors.surface2);
  root.style.setProperty("--color-surface-2", colors.surface2);
  root.style.setProperty("--ms-line", colors.line);
  root.style.setProperty("--color-line", colors.line);
  root.style.setProperty("--ms-fg", colors.fg);
  root.style.setProperty("--color-fg", colors.fg);
  root.style.setProperty("--ms-muted", colors.muted);
  root.style.setProperty("--color-muted", colors.muted);

  // 3. Card Corner Radius
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
  root.style.setProperty("--radius-xl", rx);
  root.style.setProperty("--radius-2xl", r2x);

  // 4. UI Density
  root.setAttribute("data-density", cfg.density);
  if (cfg.density === "compact") {
    root.style.setProperty("--ms-density-pad", "0.5rem");
  } else if (cfg.density === "spacious") {
    root.style.setProperty("--ms-density-pad", "1.5rem");
  } else {
    root.style.setProperty("--ms-density-pad", "1rem");
  }

  // 5. Font Size Scaling
  if (cfg.fontSize === "sm") {
    root.style.fontSize = "14px";
  } else if (cfg.fontSize === "lg") {
    root.style.fontSize = "18px";
  } else {
    root.style.fontSize = "16px";
  }

  // 6. Reduced Motion
  if (cfg.reducedMotion) {
    root.classList.add("reduce-motion");
  } else {
    root.classList.remove("reduce-motion");
  }
}
