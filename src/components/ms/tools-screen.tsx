import { useState, useEffect, useRef } from "react";
import { useMs } from "@/lib/ms/store";
import { Card, Btn, Field, controlClass, Modal } from "@/components/ms/ui";
import { t } from "@/lib/ms/i18n";
import type { Alarm } from "@/lib/ms/types";
import {
  Bell,
  Clock,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Volume2,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  Globe,
} from "lucide-react";
import {
  getPlatform,
  getAlarmPermissionStatus,
  requestAlarmPermission,
  scheduleNativeAlarm,
  cancelNativeAlarm,
  scheduleNativeTimer,
  cancelNativeTimer,
  showNativeNotification,
  playNativeVibrate,
  computeNextAlarmOccurrence,
} from "@/lib/ms/native";

type ToolsTab = "alarm" | "timer" | "stopwatch";

const DAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const TIMER_PRESETS = [
  { label: "1 мин", seconds: 60 },
  { label: "3 мин", seconds: 180 },
  { label: "5 мин", seconds: 300 },
  { label: "10 мин", seconds: 600 },
  { label: "15 мин", seconds: 900 },
  { label: "25 мин (Помодоро)", seconds: 1500 },
  { label: "45 мин (Урок)", seconds: 2700 },
];

export function ToolsScreen() {
  const { data, saveAlarm, toggleAlarm, deleteAlarm } = useMs();
  const profileId = data.activeProfileId;
  const platform = getPlatform();

  const [tab, setTab] = useState<ToolsTab>("alarm");

  // Platform permission status for exact alarms
  const [alarmPermission, setAlarmPermission] = useState<"granted" | "denied" | "unsupported">("unsupported");

  useEffect(() => {
    setAlarmPermission(getAlarmPermissionStatus());
    const interval = setInterval(() => {
      setAlarmPermission(getAlarmPermissionStatus());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Alarms State
  const alarms = (data.alarms || []).filter((a) => !a.profileId || a.profileId === profileId);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [alarmTime, setAlarmTime] = useState("07:30");
  const [alarmLabel, setAlarmLabel] = useState("");
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [alarmSound, setAlarmSound] = useState<Alarm["sound"]>("school");

  // --- PERSISTENT TIMER STATE ---
  const [timerTotal, setTimerTotal] = useState<number>(() => {
    const saved = localStorage.getItem("ms_timer_total");
    return saved ? parseInt(saved, 10) : 300;
  });
  const [timerRemaining, setTimerRemaining] = useState<number>(300);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [customSeconds, setCustomSeconds] = useState("");
  const timerEndTargetRef = useRef<number | null>(null);

  // Initialize timer from storage if it was running
  useEffect(() => {
    const savedEnd = localStorage.getItem("ms_timer_end_target");
    if (savedEnd) {
      const endMs = parseInt(savedEnd, 10);
      const diff = endMs - Date.now();
      if (diff > 0) {
        timerEndTargetRef.current = endMs;
        setTimerRemaining(Math.ceil(diff / 1000));
        setTimerRunning(true);
      } else {
        localStorage.removeItem("ms_timer_end_target");
        setTimerRemaining(timerTotal);
      }
    } else {
      setTimerRemaining(timerTotal);
    }
  }, [timerTotal]);

  // --- PERSISTENT STOPWATCH STATE ---
  const [stopwatchMs, setStopwatchMs] = useState<number>(() => {
    const saved = localStorage.getItem("ms_stopwatch_accumulated");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<{ id: string; lapNumber: number; splitMs: number; totalMs: number }[]>(() => {
    const saved = localStorage.getItem("ms_stopwatch_laps");
    return saved ? JSON.parse(saved) : [];
  });
  const stopwatchIntervalRef = useRef<number | null>(null);
  const stopwatchStartRef = useRef<number>(0);

  // Audio tone synth
  const playBeep = (freq = 880, duration = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch {
      /* ignore */
    }
  };

  // Timer Tick - Absolute timestamp based
  useEffect(() => {
    let interval: number | null = null;
    if (timerRunning) {
      if (!timerEndTargetRef.current) {
        const targetMs = Date.now() + timerRemaining * 1000;
        timerEndTargetRef.current = targetMs;
        localStorage.setItem("ms_timer_end_target", targetMs.toString());
        // Schedule native Android background alarm for this timer
        scheduleNativeTimer(timerRemaining, "Время таймера вышло!");
      }

      interval = window.setInterval(() => {
        if (!timerEndTargetRef.current) return;
        const diffMs = timerEndTargetRef.current - Date.now();
        const leftSecs = Math.max(0, Math.ceil(diffMs / 1000));
        setTimerRemaining(leftSecs);

        if (leftSecs <= 0) {
          setTimerRunning(false);
          setTimerFinished(true);
          timerEndTargetRef.current = null;
          localStorage.removeItem("ms_timer_end_target");
          playBeep(920, 0.6);
          showNativeNotification("⏱️ Таймер завершён", "Время вышло!", "alerts");
          playNativeVibrate(600);
        }
      }, 500);
    } else {
      if (timerEndTargetRef.current) {
        timerEndTargetRef.current = null;
        localStorage.removeItem("ms_timer_end_target");
        cancelNativeTimer();
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  // Stopwatch Tick
  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchStartRef.current = Date.now() - stopwatchMs;
      stopwatchIntervalRef.current = window.setInterval(() => {
        const curMs = Date.now() - stopwatchStartRef.current;
        setStopwatchMs(curMs);
        localStorage.setItem("ms_stopwatch_accumulated", curMs.toString());
      }, 50);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
      localStorage.setItem("ms_stopwatch_accumulated", stopwatchMs.toString());
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchRunning]);

  // Save laps to storage
  useEffect(() => {
    localStorage.setItem("ms_stopwatch_laps", JSON.stringify(laps));
  }, [laps]);

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatStopwatchTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
  };

  const [alarmError, setAlarmError] = useState<string | null>(null);
  const [alarmNotice, setAlarmNotice] = useState<{ id: string; msg: string; type: "success" | "warn" | "error" } | null>(null);

  const handleOpenAlarmModal = (alarm?: Alarm) => {
    setAlarmError(null);
    if (alarm) {
      setEditingAlarm(alarm);
      setAlarmTime(alarm.time);
      setAlarmLabel(alarm.label);
      setAlarmDays(alarm.days);
      setAlarmSound(alarm.sound);
    } else {
      setEditingAlarm(null);
      setAlarmTime("07:30");
      setAlarmLabel("");
      setAlarmDays([1, 2, 3, 4, 5]);
      setAlarmSound("school");
    }
    setAlarmModalOpen(true);
  };

  const handleSaveAlarm = async () => {
    setAlarmError(null);

    // Валидация времени HH:mm
    const timeClean = alarmTime.trim();
    if (!timeClean.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
      setAlarmError("Некорректный формат времени. Используйте ЧЧ:ММ (00:00 - 23:59)");
      return;
    }

    const alarmId = editingAlarm ? editingAlarm.id : `alarm-${Date.now()}`;
    const isEnabled = editingAlarm ? editingAlarm.enabled : true;

    let scheduleStatus: Alarm["status"] = "saved_local";
    let scheduleErrorMsg: string | undefined = undefined;

    if (isEnabled) {
      const result = await scheduleNativeAlarm(alarmId, timeClean, alarmDays, alarmLabel.trim() || "Будильник", alarmSound);
      scheduleStatus = result.status;
      scheduleErrorMsg = result.message;

      if (!result.success) {
        if (result.status === "pending_permission") {
          setAlarmNotice({
            id: alarmId,
            msg: "Будильник сохранён, но ожидает системного разрешения точных будильников в Android",
            type: "warn",
          });
        } else {
          setAlarmNotice({
            id: alarmId,
            msg: result.message || "Ошибка планирования в AlarmManager",
            type: "error",
          });
        }
      } else {
        setAlarmNotice({
          id: alarmId,
          msg: result.status === "scheduled_android"
            ? "Будильник успешно запланирован в системном AlarmManager Android"
            : "Будильник сохранён локально в браузере",
          type: "success",
        });
      }
    } else {
      scheduleStatus = "disabled";
      await cancelNativeAlarm(alarmId);
    }

    const newAlarm: Alarm = {
      id: alarmId,
      profileId,
      time: timeClean,
      label: alarmLabel.trim() || "Будильник",
      enabled: isEnabled,
      days: alarmDays,
      sound: alarmSound,
      status: scheduleStatus,
      scheduleError: scheduleErrorMsg,
      createdAt: editingAlarm ? editingAlarm.createdAt : new Date().toISOString(),
    };

    saveAlarm(newAlarm);
    setAlarmModalOpen(false);
  };

  const handleToggleAlarm = async (alarm: Alarm) => {
    const nextEnabled = !alarm.enabled;
    let nextStatus: Alarm["status"] = "disabled";
    let nextError: string | undefined = undefined;

    if (nextEnabled) {
      const result = await scheduleNativeAlarm(alarm.id, alarm.time, alarm.days, alarm.label, alarm.sound);
      nextStatus = result.status;
      nextError = result.message;
      if (!result.success) {
        setAlarmNotice({
          id: alarm.id,
          msg: result.message || "Не удалось запланировать системный будильник",
          type: result.status === "pending_permission" ? "warn" : "error",
        });
      }
    } else {
      await cancelNativeAlarm(alarm.id);
    }

    saveAlarm({
      ...alarm,
      enabled: nextEnabled,
      status: nextStatus,
      scheduleError: nextError,
    });
  };

  const handleDeleteAlarm = async (alarmId: string) => {
    deleteAlarm(alarmId);
    await cancelNativeAlarm(alarmId);
    if (alarmNotice?.id === alarmId) {
      setAlarmNotice(null);
    }
  };

  const toggleDay = (dayIdx: number) => {
    setAlarmDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort((a, b) => a - b),
    );
  };

  const handleAddLap = () => {
    const prevTotal = laps.length > 0 ? laps[0].totalMs : 0;
    const split = stopwatchMs - prevTotal;
    const newLap = {
      id: `lap-${Date.now()}`,
      lapNumber: laps.length + 1,
      splitMs: split,
      totalMs: stopwatchMs,
    };
    setLaps([newLap, ...laps]);
  };

  const handleApplyCustomTimer = () => {
    const mins = parseInt(customMinutes || "0", 10);
    const secs = parseInt(customSeconds || "0", 10);
    const total = mins * 60 + secs;
    if (total > 0) {
      setTimerTotal(total);
      setTimerRemaining(total);
      localStorage.setItem("ms_timer_total", total.toString());
      setTimerRunning(false);
      setTimerFinished(false);
      setCustomMinutes("");
      setCustomSeconds("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner & Platform indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg flex items-center gap-2">
            <span>MetaTools</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full border border-line bg-surface-2 text-muted">
              P0 Reliability
            </span>
          </h1>
          <p className="text-xs text-muted">
            Повседневные инструменты и утилиты времени · Автор концепции — Andárer
          </p>
        </div>

        {/* Platform badge */}
        <div className="flex items-center gap-2">
          {platform === "android" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sage/15 border border-sage/30 text-sage text-xs font-medium">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android AlarmManager</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-2 border border-line text-muted text-xs">
              <Globe className="h-3.5 w-3.5" />
              <span>{platform === "pwa" ? "PWA Standalone" : "Web браузер"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Android 12+ Exact Alarm Permission Alert */}
      {platform === "android" && alarmPermission === "denied" && (
        <div className="rounded-2xl border border-clay/40 bg-clay/10 p-3.5 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-clay shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-fg">Требуется системное разрешение для точных будильников</p>
              <p className="text-muted mt-0.5">
                На Android 12+ операционная система требует явного разрешения пользователя для срабатывания будильника секунда в секунду.
              </p>
            </div>
          </div>
          <Btn onClick={requestAlarmPermission} className="text-xs shrink-0 whitespace-nowrap bg-clay text-bg">
            Настройки
          </Btn>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-1 text-xs font-semibold">
        <button
          type="button"
          data-testid="tab-tools-alarm"
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl transition-all ${
            tab === "alarm" ? "bg-surface text-copper shadow-xs font-bold" : "text-muted hover:text-fg"
          }`}
          onClick={() => setTab("alarm")}
        >
          <Bell className="h-4 w-4" />
          <span>Будильник ({alarms.length})</span>
        </button>
        <button
          type="button"
          data-testid="tab-tools-timer"
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl transition-all ${
            tab === "timer" ? "bg-surface text-copper shadow-xs font-bold" : "text-muted hover:text-fg"
          }`}
          onClick={() => setTab("timer")}
        >
          <Timer className="h-4 w-4" />
          <span>Таймер {timerRunning && "•"}</span>
        </button>
        <button
          type="button"
          data-testid="tab-tools-stopwatch"
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl transition-all ${
            tab === "stopwatch" ? "bg-surface text-copper shadow-xs font-bold" : "text-muted hover:text-fg"
          }`}
          onClick={() => setTab("stopwatch")}
        >
          <Clock className="h-4 w-4" />
          <span>Секундомер {stopwatchRunning && "•"}</span>
        </button>
      </div>

      {/* TAB 1: ALARMS */}
      {tab === "alarm" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">
              Установлено будильников: {alarms.length}
            </span>
            <Btn
              data-testid="add-alarm-btn"
              onClick={() => handleOpenAlarmModal()}
              className="h-9 gap-1 px-3 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Добавить будильник</span>
            </Btn>
          </div>

          {alarms.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-10 w-10 text-muted/40 mb-2" />
              <p className="font-semibold text-fg">Нет активных будильников</p>
              <p className="text-xs text-muted mt-1 max-w-xs">
                Создайте будильник для подъёма, подготовки к урокам или звонка.
              </p>
              <Btn onClick={() => handleOpenAlarmModal()} className="mt-4 text-xs">
                Создать будильник
              </Btn>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {alarms.map((alarm) => {
                const daysLabel =
                  alarm.days.length === 7
                    ? "Каждый день"
                    : alarm.days.length === 5 && !alarm.days.includes(0) && !alarm.days.includes(6)
                      ? "По будням"
                      : alarm.days.length === 0
                        ? "Однократно"
                        : alarm.days.map((d) => DAYS_SHORT[d]).join(", ");

                const nextDate = computeNextAlarmOccurrence(alarm.time, alarm.days);
                const isToday = nextDate.toDateString() === new Date().toDateString();
                const isTomorrow = new Date(Date.now() + 86400000).toDateString() === nextDate.toDateString();
                const nextOccurLabel = isToday
                  ? `Сегодня в ${alarm.time}`
                  : isTomorrow
                    ? `Завтра в ${alarm.time}`
                    : `${DAYS_SHORT[nextDate.getDay()]}, ${nextDate.toLocaleDateString([], { day: "numeric", month: "short" })} в ${alarm.time}`;

                return (
                  <Card
                    key={alarm.id}
                    className={`flex items-center justify-between border-l-4 transition-all ${
                      alarm.enabled ? "border-l-copper bg-surface" : "border-l-line/60 bg-surface/50 opacity-70"
                    }`}
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleOpenAlarmModal(alarm)}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black tracking-tight text-fg font-mono">
                          {alarm.time}
                        </span>
                        <span className="text-xs font-semibold text-copper">
                          {alarm.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{daysLabel}</span>
                        <span>•</span>
                        <span className="text-[11px] text-fg font-medium">
                          {alarm.enabled ? `Следующий: ${nextOccurLabel}` : "Отключён"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Volume2 className="h-3 w-3" />
                          {alarm.sound === "school" ? "Школьный звонок" : alarm.sound}
                        </span>
                        {alarm.enabled && (
                          <>
                            <span>•</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                alarm.status === "scheduled_android"
                                  ? "bg-sage/15 text-sage border border-sage/30"
                                  : alarm.status === "pending_permission"
                                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                    : alarm.status === "error"
                                      ? "bg-clay/15 text-clay border border-clay/30"
                                      : "bg-surface-2 text-muted border border-line"
                              }`}
                            >
                              {alarm.status === "scheduled_android"
                                ? "Запланирован Android"
                                : alarm.status === "pending_permission"
                                  ? "Ожидает разрешения"
                                  : alarm.status === "error"
                                    ? "Ошибка планирования"
                                    : "Сохранён локально"}
                            </span>
                          </>
                        )}
                      </div>
                      {alarm.scheduleError && (
                        <p className="mt-1 text-[10px] text-clay">{alarm.scheduleError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`toggle-alarm-${alarm.id}`}
                        aria-label="Включить или выключить будильник"
                        className={`h-7 w-12 rounded-full p-1 transition-colors ${
                          alarm.enabled ? "bg-copper" : "bg-line"
                        }`}
                        onClick={() => handleToggleAlarm(alarm)}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-surface shadow-xs transition-transform ${
                            alarm.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        data-testid={`delete-alarm-${alarm.id}`}
                        aria-label="Удалить будильник"
                        className="rounded-lg p-2 text-muted hover:text-clay transition-colors"
                        onClick={() => handleDeleteAlarm(alarm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Truthful capability disclosure banner */}
          <div className="rounded-2xl border border-line bg-surface/40 p-3.5 text-xs text-muted">
            <p className="font-semibold text-fg flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-4 w-4 text-copper" />
              <span>Достоверность срабатывания (Reliability Truthfulness)</span>
            </p>
            {platform === "android" ? (
              <p>
                В нативном приложении Android будильники планируются в системный <strong>AlarmManager</strong> и восстанавливаются через <strong>BootReceiver</strong> при перезагрузке устройства.
              </p>
            ) : (
              <p>
                <strong>Ограничение веб-платформы:</strong> В браузере (PWA/Web) будильник гарантированно звучит при открытом приложении или фоновой вкладке. При полном закрытии браузера системное пробуждение зависит от ограничений вашей ОС. Для критически важных подъёмов используйте нативное Android-приложение MetaШкола.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 2: TIMER */}
      {tab === "timer" ? (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden">
            {timerFinished ? (
              <div className="absolute inset-0 bg-copper/15 flex flex-col items-center justify-center animate-pulse">
                <span className="text-3xl">⏰</span>
                <p className="font-bold text-copper text-lg mt-1">Время истекло!</p>
              </div>
            ) : null}

            <span className="text-6xl font-black tracking-tight text-fg font-mono">
              {formatTimerDigits(timerRemaining)}
            </span>

            <div className="mt-6 flex items-center gap-3">
              {timerRunning ? (
                <Btn
                  data-testid="timer-pause-btn"
                  onClick={() => setTimerRunning(false)}
                  className="h-12 w-32 gap-2 text-sm"
                >
                  <Pause className="h-5 w-5" />
                  <span>Пауза</span>
                </Btn>
              ) : (
                <Btn
                  data-testid="timer-start-btn"
                  onClick={() => {
                    if (timerRemaining === 0) {
                      setTimerRemaining(timerTotal);
                    }
                    setTimerFinished(false);
                    setTimerRunning(true);
                  }}
                  className="h-12 w-32 gap-2 text-sm"
                >
                  <Play className="h-5 w-5" />
                  <span>{timerRemaining === 0 ? "Сначала" : "Старт"}</span>
                </Btn>
              )}

              <button
                type="button"
                data-testid="timer-reset-btn"
                className="h-12 w-12 rounded-xl border border-line bg-surface flex items-center justify-center text-muted hover:text-fg"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerRemaining(timerTotal);
                  setTimerFinished(false);
                  localStorage.removeItem("ms_timer_end_target");
                  cancelNativeTimer();
                }}
                aria-label="Сброс таймера"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          </Card>

          {/* Quick Presets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Быстрые пресеты:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  data-testid={`timer-preset-${preset.seconds}`}
                  className={`h-11 rounded-xl border px-3 text-xs font-semibold text-left transition-all flex items-center justify-between ${
                    timerTotal === preset.seconds && !timerRunning
                      ? "border-copper bg-copper/10 text-copper"
                      : "border-line bg-surface hover:border-line/80 text-fg"
                  }`}
                  onClick={() => {
                    setTimerTotal(preset.seconds);
                    setTimerRemaining(preset.seconds);
                    localStorage.setItem("ms_timer_total", preset.seconds.toString());
                    setTimerRunning(false);
                    setTimerFinished(false);
                  }}
                >
                  <span>{preset.label}</span>
                  {timerTotal === preset.seconds && <Check className="h-3.5 w-3.5 text-copper" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div className="rounded-2xl border border-line bg-surface p-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-fg">Своё время:</span>
            <input
              type="number"
              min="0"
              max="999"
              placeholder="Мин"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className={`${controlClass} w-20 text-xs py-1.5`}
            />
            <span>:</span>
            <input
              type="number"
              min="0"
              max="59"
              placeholder="Сек"
              value={customSeconds}
              onChange={(e) => setCustomSeconds(e.target.value)}
              className={`${controlClass} w-20 text-xs py-1.5`}
            />
            <Btn onClick={handleApplyCustomTimer} className="text-xs h-9 px-3">
              Установить
            </Btn>
          </div>
        </div>
      ) : null}

      {/* TAB 3: STOPWATCH */}
      {tab === "stopwatch" ? (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-5xl font-black tracking-tight text-fg font-mono">
              {formatStopwatchTime(stopwatchMs)}
            </span>

            <div className="mt-6 flex items-center gap-3">
              {stopwatchRunning ? (
                <>
                  <Btn
                    data-testid="stopwatch-lap-btn"
                    variant="ghost"
                    onClick={handleAddLap}
                    className="h-12 w-28 gap-2 text-sm"
                  >
                    <span>Круг</span>
                  </Btn>
                  <Btn
                    data-testid="stopwatch-pause-btn"
                    onClick={() => setStopwatchRunning(false)}
                    className="h-12 w-28 gap-2 text-sm bg-clay text-bg"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Стоп</span>
                  </Btn>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    data-testid="stopwatch-reset-btn"
                    disabled={stopwatchMs === 0}
                    className="h-12 w-12 rounded-xl border border-line bg-surface flex items-center justify-center text-muted hover:text-fg disabled:opacity-40"
                    onClick={() => {
                      setStopwatchRunning(false);
                      setStopwatchMs(0);
                      setLaps([]);
                      localStorage.removeItem("ms_stopwatch_accumulated");
                      localStorage.removeItem("ms_stopwatch_laps");
                    }}
                    aria-label="Сброс секундомера"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <Btn
                    data-testid="stopwatch-start-btn"
                    onClick={() => setStopwatchRunning(true)}
                    className="h-12 w-36 gap-2 text-sm"
                  >
                    <Play className="h-4 w-4" />
                    <span>{stopwatchMs > 0 ? "Продолжить" : "Старт"}</span>
                  </Btn>
                </>
              )}
            </div>
          </Card>

          {/* Laps List */}
          {laps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted">Засечки кругов:</span>
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {laps.map((lap) => (
                  <div
                    key={lap.id}
                    className="flex items-center justify-between rounded-xl border border-line/60 bg-surface px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-muted">Круг {lap.lapNumber}</span>
                    <span className="font-mono text-fg font-medium">
                      +{formatStopwatchTime(lap.splitMs)}
                    </span>
                    <span className="font-mono font-bold text-copper">
                      {formatStopwatchTime(lap.totalMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Alarm Modal */}
      <Modal
        open={alarmModalOpen}
        title={editingAlarm ? "Редактировать будильник" : "Новый будильник"}
        onClose={() => setAlarmModalOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <Field label="Время">
            <input
              type="time"
              data-testid="alarm-time-input"
              className={controlClass}
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
            />
          </Field>

          <Field label="Название">
            <input
              type="text"
              data-testid="alarm-label-input"
              className={controlClass}
              placeholder="Например, Подъём в школу"
              value={alarmLabel}
              onChange={(e) => setAlarmLabel(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Дни повторения:</span>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_SHORT.map((name, idx) => {
                const active = alarmDays.includes(idx);
                return (
                  <button
                    key={name}
                    type="button"
                    className={`h-9 rounded-lg text-xs font-semibold transition-all ${
                      active ? "bg-copper text-copper-fg" : "bg-surface-2 text-muted hover:text-fg"
                    }`}
                    onClick={() => toggleDay(idx)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted">
              {alarmDays.length === 0 ? "Однократный будильник на ближайшее время" : "Будильник будет повторяться в выбранные дни"}
            </p>
          </div>

          <Field label="Звуковой сигнал">
            <select
              className={controlClass}
              value={alarmSound}
              onChange={(e) => setAlarmSound(e.target.value as Alarm["sound"])}
            >
              <option value="school">Школьный звонок</option>
              <option value="bell">Классический колокольчик</option>
              <option value="digital">Электронный бип</option>
              <option value="gentle">Мягкий сигнал</option>
            </select>
          </Field>

          {alarmError && (
            <div className="rounded-xl border border-clay/30 bg-clay/10 p-2.5 text-xs text-clay font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{alarmError}</span>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAlarmModalOpen(false)}>
              Отмена
            </Btn>
            <Btn data-testid="save-alarm-modal-btn" onClick={handleSaveAlarm}>
              Сохранить
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
