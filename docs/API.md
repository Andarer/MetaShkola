# Спецификация API и нативного моста (API.md)

**Автор и инициатор:** Andárer

---

## 1. Нативный мост Android (`MetaSchoolNative`)

При запуске внутри нативного Android-клиента объект `window.MetaSchoolNative` становится доступен со следующими методами:

```typescript
interface MetaSchoolNativeBridge {
  /** Возвращает идентификатор платформы ("android") */
  getPlatform(): string;

  /** Возвращает семантическую версию приложения (например, "2.0.0") */
  getAppVersion(): string;

  /** Возвращает модель устройства (например, "OPPO CPH2219 (Android 12, API 31)") */
  getDeviceModel(): string;

  /** Проверяет физическое наличие интернет-соединения */
  isOnline(): boolean;

  /** Отображает нативное Android-уведомление через системный NotificationManager */
  showNotification(title: string, message: string, channel: "bells" | "tasks" | "alerts"): void;

  /** Планирует точный звонок/уведомление через системный AlarmManager */
  scheduleBellAlarm(triggerAtMillis: number, title: string, message: string): void;

  /** Запускает тактильную вибрацию устройства (длительность в миллисекундах) */
  playVibrate(durationMs: number): void;
}
```

---

## 2. Локальное хранилище данных (Storage API)

Доступ к состоянию платформы осуществляется через хук `useMs`:

```typescript
import { useMs } from "@/lib/ms/store";

// Чтение данных
const activeSpace = useMs((s) => s.data.spaces.find((sp) => sp.id === s.data.activeSpaceId));

// Мутации
const saveLesson = useMs((s) => s.saveLesson);
const pushInbox = useMs((s) => s.pushInbox);
```

---

## 3. Модуль AI Gateway API

```typescript
import { askTutor, probeModels } from "@/lib/ms/ai.functions";

// Отправка запроса к выбранному провайдеру
const result = await askTutor({
  data: {
    mode: "custom", // или "builtin"
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: "...",
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: "Ты опытный репетитор по математике." },
      { role: "user", content: "Объясни теорему Пифагора простыми словами." }
    ]
  }
});

if (result.ok) {
  console.log("Ответ:", result.text);
}
```
