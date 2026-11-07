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
  Flame,
  Volume2,
} from "lucide-react";

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
  const lang = data.lang;
  const profileId = data.activeProfileId;

  const [tab, setTab] = useState<ToolsTab>("alarm");

  // Alarms State
  const alarms = (data.alarms || []).filter((a) => !a.profileId || a.profileId === profileId);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [alarmTime, setAlarmTime] = useState("07:30");
  const [alarmLabel, setAlarmLabel] = useState("");
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [alarmSound, setAlarmSound] = useState<Alarm["sound"]>("school");

  // Timer State with Absolute Timestamp
  const [timerTotal, setTimerTotal] = useState(300); // Default 5 mins
  const [timerRemaining, setTimerRemaining] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerEndTargetRef = useRef<number | null>(null);

  // Stopwatch State
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<{ id: string; lapNumber: number; splitMs: number; totalMs: number }[]>([]);
  const stopwatchIntervalRef = useRef<number | null>(null);
  const stopwatchStartRef = useRef<number>(0);

  // Sound playback trigger (Web Audio API synth fallback - 100% offline & zero assets needed)
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
      // Audio context restricted or muted
    }
  };

  // Timer Tick - Based on absolute timestamps (background & sleep safe)
  useEffect(() => {
    let interval: number | null = null;
    if (timerRunning) {
      if (!timerEndTargetRef.current) {
        timerEndTargetRef.current = Date.now() + timerRemaining * 1000;
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
          playBeep(920, 0.6);

          // Android native notification if available
          const native = (window as unknown as { MetaSchoolNative?: { showNotification: (t: string, m: string, c?: string) => void; playVibrate: (ms: number) => void } }).MetaSchoolNative;
          if (native && typeof native.showNotification === "function") {
            try {
              native.showNotification("Таймер завершён", "Время вышло!", "alerts");
              native.playVibrate(500);
            } catch {
              /* ignore */
            }
          }
        }
      }, 500);
    } else {
      timerEndTargetRef.current = null;
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
        setStopwatchMs(Date.now() - stopwatchStartRef.current);
      }, 50);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchRunning]);

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

  const handleOpenAlarmModal = (alarm?: Alarm) => {
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

  const handleSaveAlarm = () => {
    const newAlarm: Alarm = {
      id: editingAlarm ? editingAlarm.id : `alarm-${Date.now()}`,
      profileId,
      time: alarmTime,
      label: alarmLabel.trim() || "Будильник",
      enabled: editingAlarm ? editingAlarm.enabled : true,
      days: alarmDays,
      sound: alarmSound,
      createdAt: editingAlarm ? editingAlarm.createdAt : new Date().toISOString(),
    };
    saveAlarm(newAlarm);

    // If native Android bridge is available, schedule via AlarmManager
    const native = (window as unknown as { MetaSchoolNative?: { scheduleAlarm?: (id: string, triggerMs: number, title: string, msg: string) => void; cancelAlarm?: (id: string) => void } }).MetaSchoolNative;
    if (native && typeof native.scheduleAlarm === "function") {
      try {
        if (newAlarm.enabled) {
          const [hh, mm] = newAlarm.time.split(":").map(Number);
          const target = new Date();
          target.setHours(hh || 0, mm || 0, 0, 0);
          if (target.getTime() <= Date.now()) {
            target.setDate(target.getDate() + 1);
          }
          native.scheduleAlarm(newAlarm.id, target.getTime(), newAlarm.label, `Сигнал в ${newAlarm.time}`);
        } else if (native.cancelAlarm) {
          native.cancelAlarm(newAlarm.id);
        }
      } catch {
        /* fallback */
      }
    }

    setAlarmModalOpen(false);
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

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner / Attribution */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg">MetaTools</h1>
          <p className="text-xs text-muted">
            Повседневные инструменты и утилиты времени · Автор концепции — Andárer
          </p>
        </div>
      </div>

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
          <span>Будильник</span>
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
          <span>Таймер</span>
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
          <span>Секундомер</span>
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
                Создайте будильник для подъёма, подготовки к урокам или напоминания о звонке.
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
                        <span className="text-2xl font-black tracking-tight text-fg">
                          {alarm.time}
                        </span>
                        <span className="text-xs font-semibold text-copper">
                          {alarm.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span>{daysLabel}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Volume2 className="h-3 w-3" />
                          {alarm.sound === "school" ? "Школьный звонок" : alarm.sound}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`toggle-alarm-${alarm.id}`}
                        aria-label="Включить или выключить будильник"
                        className={`h-7 w-12 rounded-full p-1 transition-colors ${
                          alarm.enabled ? "bg-copper" : "bg-line"
                        }`}
                        onClick={() => {
                          toggleAlarm(alarm.id);
                          const native = (window as unknown as { MetaSchoolNative?: { cancelAlarm?: (id: string) => void } }).MetaSchoolNative;
                          if (alarm.enabled && native && typeof native.cancelAlarm === "function") {
                            native.cancelAlarm(alarm.id);
                          }
                        }}
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
                        onClick={() => {
                          deleteAlarm(alarm.id);
                          const native = (window as unknown as { MetaSchoolNative?: { cancelAlarm?: (id: string) => void } }).MetaSchoolNative;
                          if (native && typeof native.cancelAlarm === "function") {
                            native.cancelAlarm(alarm.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface/40 p-3 text-[11px] text-muted">
            <p className="font-semibold text-fg mb-1">Особенности работы в PWA и Android</p>
            <p>
              В веб-режиме будильник подаёт звуковой сигнал и уведомление, когда приложение открыто. В нативном приложении Android будильник регистрируется через системный AlarmManager.
            </p>
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
