/**
 * MetaTools Native Bridge & Platform Adapter.
 * Реализует единый контракт Web ↔ Android для управления системными будильниками,
 * точными таймерами и уведомлениями, с честным информированием об ограничениях PWA/веб-среды.
 */

export interface MetaSchoolNativeInterface {
  getPlatform?(): string;
  getAppVersion?(): string;
  getVersionCode?(): number;
  getDeviceModel?(): string;
  isOnline?(): boolean;
  getAlarmPermissionStatus?(): string;
  requestAlarmPermission?(): void;
  scheduleAlarm?(id: string, time: string, daysJson: string, label: string, sound: string): boolean;
  cancelAlarm?(alarmId: string): void;
  restoreAlarms?(): number;
  scheduleTimer?(durationSeconds: number, label: string): boolean;
  cancelTimer?(): void;
  showNotification?(title: string, message: string, channel?: string): void;
  playVibrate?(durationMs: number): void;
  syncScheduleData?(current: string, next: string, status: string, badge: string): void;
}

declare global {
  interface Window {
    MetaSchoolNative?: MetaSchoolNativeInterface;
  }
}

export type PlatformType = "android" | "pwa" | "web";
export type AlarmPermissionStatus = "granted" | "denied" | "unsupported";

/**
 * Определение текущей платформы выполнения.
 */
export function getPlatform(): PlatformType {
  if (typeof window !== "undefined" && window.MetaSchoolNative && typeof window.MetaSchoolNative.getPlatform === "function") {
    return "android";
  }
  if (typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone)) {
    return "pwa";
  }
  return "web";
}

/**
 * Проверка статуса разрешения системных точных будильников.
 */
export function getAlarmPermissionStatus(): AlarmPermissionStatus {
  if (typeof window !== "undefined" && window.MetaSchoolNative?.getAlarmPermissionStatus) {
    try {
      const status = window.MetaSchoolNative.getAlarmPermissionStatus();
      if (status === "granted" || status === "denied") return status;
    } catch {
      /* ignore */
    }
  }
  return getPlatform() === "android" ? "denied" : "unsupported";
}

/**
 * Запрос системного разрешения точных будильников через настройки Android.
 */
export function requestAlarmPermission(): void {
  if (typeof window !== "undefined" && window.MetaSchoolNative?.requestAlarmPermission) {
    try {
      window.MetaSchoolNative.requestAlarmPermission();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Вычисляет следующее время срабатывания будильника.
 * @param timeStr "HH:mm" (например, "07:30")
 * @param days Дни недели: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб
 * @param fromDate Базовая дата расчета (по умолчанию текущая)
 */
export function computeNextAlarmOccurrence(timeStr: string, days: number[], fromDate = new Date()): Date {
  const [hStr, mStr] = timeStr.split(":");
  const hour = parseInt(hStr || "7", 10);
  const min = parseInt(mStr || "30", 10);

  const target = new Date(fromDate.getTime());
  target.setHours(hour, min, 0, 0);

  // Однократный будильник (дни не указаны)
  if (days.length === 0) {
    if (target.getTime() <= fromDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  // Повторяющийся будильник
  const currentDay = fromDate.getDay(); // 0=Вс, 1=Пн...

  // 1. Проверяем сегодня: если день входит в список и время ещё не наступило
  if (days.includes(currentDay) && target.getTime() > fromDate.getTime()) {
    return target;
  }

  // 2. Ищем минимальный следующий подходящий день недели (от 1 до 7 дней вперед)
  for (let offset = 1; offset <= 7; offset++) {
    const nextDate = new Date(fromDate.getTime());
    nextDate.setDate(nextDate.getDate() + offset);
    nextDate.setHours(hour, min, 0, 0);
    if (days.includes(nextDate.getDay())) {
      return nextDate;
    }
  }

  // Fallback: завтра в это же время
  target.setDate(target.getDate() + 1);
  return target;
}

/**
 * Запланировать будильник в нативном Android AlarmManager (или локальном PWA-таймере).
 */
export async function scheduleNativeAlarm(
  id: string,
  time: string,
  days: number[],
  label: string,
  sound: string
): Promise<boolean> {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.scheduleAlarm === "function") {
    try {
      return native.scheduleAlarm(id, time, JSON.stringify(days), label, sound);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Отменить системный будильник.
 */
export async function cancelNativeAlarm(id: string): Promise<void> {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.cancelAlarm === "function") {
    try {
      native.cancelAlarm(id);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Запланировать системный таймер (срабатывает даже при закрытом WebView на Android).
 */
export async function scheduleNativeTimer(durationSeconds: number, label: string): Promise<boolean> {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.scheduleTimer === "function") {
    try {
      return native.scheduleTimer(durationSeconds, label);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Отменить системный таймер.
 */
export async function cancelNativeTimer(): Promise<void> {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.cancelTimer === "function") {
    try {
      native.cancelTimer();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Отправить системное уведомление.
 */
export function showNativeNotification(title: string, message: string, channel = "alerts"): void {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.showNotification === "function") {
    try {
      native.showNotification(title, message, channel);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Вызов нативной вибрации устройства.
 */
export function playNativeVibrate(durationMs = 400): void {
  const native = typeof window !== "undefined" ? window.MetaSchoolNative : undefined;
  if (native && typeof native.playVibrate === "function") {
    try {
      native.playVibrate(durationMs);
    } catch {
      /* ignore */
    }
  } else if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(durationMs);
    } catch {
      /* ignore */
    }
  }
}
