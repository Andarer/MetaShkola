import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AvatarTone, Data } from "@/lib/ms/types";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-line bg-surface p-4", className)}>{children}</section>;
}

export function Btn({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-copper text-copper-fg",
    ghost: "bg-surface-2 text-fg",
    danger: "bg-clay text-bg",
  } as const;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-fg";

export const areaClass =
  "min-h-24 w-full rounded-xl border border-line bg-bg px-3 py-2 text-base text-fg";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-dvh w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl text-fg">{title}</h2>
          <button type="button" className="h-11 rounded-xl px-3 text-sm text-muted" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}

const toneBg: Record<AvatarTone, string> = {
  copper: "bg-copper text-copper-fg",
  sage: "bg-sage text-bg",
  clay: "bg-clay text-bg",
  ink: "bg-fg text-bg",
};

export function toneBorder(tone: AvatarTone | undefined): string {
  if (tone === "sage") return "border-l-sage";
  if (tone === "clay") return "border-l-clay";
  if (tone === "ink") return "border-l-fg";
  return "border-l-copper";
}

export function Avatar({ name, tone }: { name: string; tone: AvatarTone }) {
  const letters = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold", toneBg[tone])}>
      {letters || "·"}
    </span>
  );
}

export function personName(data: Data, id: string | null | undefined): string {
  if (!id) return "—";
  return data.profiles.find((item) => item.id === id)?.name ?? "—";
}

export function subjectOf(data: Data, id: string | undefined) {
  return data.subjects.find((item) => item.id === id);
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
