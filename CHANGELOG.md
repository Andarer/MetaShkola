# История изменений (CHANGELOG.md)

Все заметные изменения в проекте MetaШкола 2.0 документируются в этом файле.

---

## [2.0.0] - 2026-11-03

### Добавлено
- **Полноценная Android-архитектура:**
  - Создана структура `android/` с поддержкой `minSdk = 21` (Android 5.0 Lollipop) и `targetSdk = 34` (Android 14+);
  - Интеграция `MetaSchoolNativeBridge` для прямого вызова нативных уведомлений, вибрации звонков и проверки сети;
  - Сервис уведомлений `NotificationHelper` с каналами звонков, заданий и системных алертов;
  - Приемники `AlarmReceiver` и `BootReceiver` для гарантированной доставки уведомлений звонков даже после перезагрузки смартфона;
  - Скрипт автоматизированной подготовки и сборки `./scripts/build-apk.sh`.
- **PWA & Offline-First:**
  - Добавлен Web App Manifest (`public/manifest.json`) с иконками и ярлыками быстрого перехода;
  - Добавлен Service Worker (`public/sw.js`) для кэширования статических ассетов и автономного запуска.
- **Universal AI Gateway:**
  - Интеграция шлюза `src/lib/ms/ai.functions.ts` с поддержкой OpenAI, Gemini, Grok, DeepSeek, Mistral, OpenRouter и оффлайн-репетитора.
- **CI/CD Автоматизация:**
  - `.github/workflows/web-ci.yml` — линтинг, тесты и сборка веб-бандла;
  - `.github/workflows/android-ci.yml` — компиляция Debug APK и вычисление SHA-256;
  - `.github/workflows/release.yml` — автоматическая публикация подписанных релизов по Git-тегам.
- **Звуковые звонки:**
  - Реализован полифонический Web Audio синтезатор школьного звонка в `src/components/ms/notifier.tsx`.
- **Полная документация:**
  - Созданы `AUDIT.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `SECURITY.md`, `docs/DATA_ARCHITECTURE.md`, `docs/API.md`, `docs/ANDROID_BUILD.md`, `docs/RELEASE_PROCESS.md`, `docs/INTEGRATIONS.md`, `docs/AI_GATEWAY.md`.
