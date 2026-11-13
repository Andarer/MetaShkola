# История изменений (CHANGELOG.md)

Все заметные изменения в проекте MetaШкола 2.0 документируются в этом файле.

---

## [2.2.3] - 2026-11-09

### UI/UX Overhaul, MetaUpdate Center & MetaDesign Studio
- **MetaUpdate Center:**
  - Полная синхронизация с GitHub Releases API (`https://api.github.com/repos/Andarer/MetaShkola/releases`) и оффлайн-фолбэк на `public/releases/manifest.json` + локальный кэш.
  - 17 критериев верификации каждого релиза с раздельными статусами (`verified`, `corrupted`, `verification_failed` и др.).
  - Безопасное переключение каналов (`stable`, `beta`, `debug`) с предварительным предпросмотром версии и предупреждением о несовместимости подписи Keystore без переустановки.
  - Потоковая загрузка с прогрессом и реальной проверкой целостности `SHA-256` через WebCrypto (`crypto.subtle.digest`), блокировка установки при несовпадении хэша.
  - История версий с поиском, фильтрацией по каналу, кнопкой переустановки текущей сборки и безопасным откатом к прошлым релизам.
  - Автоматическая проверка обновлений при запуске и возврате в приложение с настраиваемым троттлингом и дедупликацией уведомлений во входящих.
- **MetaDesign Studio (14 разделов персонализации):**
  - Разделы: Обзор, Темы (`light`, `dark`, `system`, `adaptive`, `auto` по заданным часам), Цвета (6 фирменных палитр + 13 кастомных токенов с HEX/RGB, визуальным пикером и расчётом контраста WCAG 2.1 AA), Типографика, Плотность, Карточки (скругление, тени, границы, стекло/прозрачность), Кнопки (filled/outlined/soft/minimal, радиус, высота, press-эффект), Иконки, Навигация (настройка нижней панели до 5 вкладок), Главный экран (конструктор порядка и видимости 6 блоков + компактный режим), Анимация, Предпросмотр (интерактивный Live Preview Mobile/Tablet/Desktop без мутации рабочих данных), Профили (5 пресетов + создание, переименование, дублирование, удаление, экспорт/импорт JSON) и Сброс.
- **Android Native Bridge & CI/CD:**
  - Добавлены `REQUEST_INSTALL_PACKAGES`, `FileProvider` (`file_paths.xml`), методы `getSigningFingerprint()`, `canInstallPackages()`, `requestInstallPermission()`, `downloadAndInstallApk()` в `MetaSchoolNativeBridge.kt`.
  - Версия обновлена до `2.2.3` (`versionCode: 223`), Service Worker переведён на `metaschool-v2.2.3`.

---

## [2.2.2] - 2026-11-09

### Autonomous Engineering, MetaDesign 2.0 Depth & Pipeline Integrity
- **CI/CD Heredoc & Release Integrity Fix:**
  - Устранена ошибка quoted heredoc (`cat << 'EOF'`) в `.github/workflows/android-ci.yml`, из-за которой команды `$(cat ...)` попадали в текст Release Notes буквально без вычисления значений.
  - Реализован предварительный расчёт переменных `APK_HASH` и `APK_SIZE` с динамической генерацией честных заметок к релизу `v2.2.2-debug`.
  - Добавлено логирование цифрового отпечатка (fingerprint) keystore (`SHA1`, `SHA256`, `Owner`) через `keytool -list -v` для предотвращения несовместимости подписей при обновлении (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
  - Установлен строгий запрет на fallback к неконтролируемым самоподписанным ключам при сборке релизного APK в `android/app/build.gradle`.
- **MetaDesign 2.0 Depth & Contrast:**
  - Реализовано физическое влияние плотности интерфейса (`compact`, `normal`, `spacious`) на отступы карточек (`--ms-density-pad: 0.625rem / 1rem / 1.375rem`), высоту интерактивных элементов (`--ms-control-h: 2.25rem / 2.75rem / 3.25rem`) и боковые отступы кнопок (`--ms-btn-px`).
  - Внедрён математический расчёт относительной яркости (WCAG 2.1 relative luminance) с оптимальным порогом 0.179 для автоматического выбора цвета текста (`#0d1b2a` vs `#ffffff`) при настройке кастомных Primary и Accent цветов.
- **PWA & Offline-First Hardening:**
  - Обновлён Service Worker (`CACHE_NAME = "metaschool-v2.2.2"`) с поддержкой кеширования непрозрачных ответов веб-шрифтов (`response.type === "opaque"`).
  - Внедрены безопасные системные font-stack fallbacks на случай отсутствия подключения к Google Fonts CDN.
- **Multi-Channel Release Management:**
  - В `public/release.json` оформлены раздельные каналы `stable`, `beta` и `debug` с честным указанием размеров (8.6 МБ vs 27 МБ со всеми офлайн-ресурсами и multidex) и хеш-сумм SHA-256.
  - Экран «Центр обновлений» (`UpdatesScreen`) адаптирован под динамическое отображение метаданных выбранного канала.
- **Тестирование и валидация:**
  - 28/28 автоматизированных модульных тестов и 6/6 e2e smoke-тестов успешно пройдены.

---

## [2.2.1] - 2026-11-09

### Добавлено и улучшено (MetaDesign 2.0 & Mobile Ergonomics)
- **Студия персонализации MetaDesign 2.0:**
  - 6 фирменных палитр экосистемы: Янтарная медь (`amber`), Изумрудный бор (`emerald`), Неоновый аметист (`violet`), Лазурный океан (`azure`), Малиновый закат (`rose`), Графитовый монохром (`graphite`).
  - Ручной выбор цветов Primary и Accent с живой палитрой и HEX-редактором.
  - Настройка плотности интерфейса (`compact`, `normal`, `spacious`) и скругления карточек (`sm` 4px, `md` 8px, `lg` 12px, `full` 20px).
  - Масштабирование шрифта (`sm` 14px, `md` 16px, `lg` 18px) и режим пониженного движения (`reducedMotion`).
  - Автоматическая смена темы по времени суток (тёмная с 20:00 до 07:00, светлая днём).
  - Мгновенное применение CSS-переменных на `:root` без перезагрузки приложения.
- **Android Debug Release Automation:**
  - Добавлена автоматическая публикация `MetaSchool-debug.apk` и контрольных сумм SHA-256 в GitHub Releases (`v2.2.1-debug`).
  - Обеспечен детерминированный Keystore и единый `applicationId: "org.metaschool.app"` для предотвращения ошибки `INSTALL_FAILED_UPDATE_INCOMPATIBLE` при обновлении на OPPO A74 и других Android устройствах.
- **Интеграция версий:**
  - Синхронизированы версии: `CURRENT_VERSION = "2.2.1"`, `versionCode: 221` во всех манифестах (`package.json`, `build.gradle`, `version.ts`, `release.json`).
  - 27/27 автоматизированных unit-тестов и 6/6 smoke-тестов успешно пройдены.

---

## [2.2.0] - 2026-11-05

### Стабилизация, безопасность и экосистема
- **Android WebView Security Hardening:**
  - В `MainActivity.kt` явно отключен доступ к файловой системе устройства (`allowFileAccess = false`, `allowContentAccess = false`, `allowFileAccessFromFileURLs = false`, `allowUniversalAccessFromFileURLs = false`).
- **Строгое разделение CI/CD релизов (Release Integrity):**
  - Устранена автоматическая публикация релизов при коммитах в ветку `main`.
  - Debug APK теперь сохраняется исключительно в GitHub Actions Artifacts (`MetaSchool-debug-apk`).
  - Официальный Stable Release собирается и подписывается релизным ключом только по тегам `vX.Y.Z` в workflow `release.yml`.
- **Честный Offline-First и Sync Engine:**
  - Устранены вводящие в заблуждение сообщения об «облачной синхронизации».
  - Очередь `flushOutbox()` теперь проверяет реальный статус соединения (`navigator.onLine`), гарантируя сохранность очереди в оффлайн-режиме (`offline_pending`) и отображая честный статус локального сохранения (`local_synced`).
- **Синхронизация версий:**
  - Все модули экосистемы (Gradle `versionCode: 220`, `versionName: "2.2.0"`, `package.json`, Service Worker `metaschool-v2.2.0`, `release.json`) переведены на единую версию 2.2.0.
- **Динамический Update Center:**
  - Загрузка APK в Центре обновлений динамически привязана к манифесту `release.json` с проверкой контрольной суммы SHA-256.
- **Расширенное тестирование:**
  - Добавлены тесты приватности несовершеннолетних в сообществе и проверки семантических версий (5/5 тестов пройдено).

---

## [2.1.0] - 2026-11-05

### Добавлено
- **MetaCommunity:**
  - Локальная школьная социальная платформа: публикация новостей, сообщества классов и клубов, реакции и древовидные комментарии.
  - Защита несовершеннолетних, фильтрация видимости контента и система жалоб модераторам.
- **Центр обновлений (Update Center):**
  - Экран проверки доступных обновлений, переключение каналов (Stable/Beta/Debug), верификация SHA-256.

---

## [2.0.1] - 2026-11-04

### Исправлено и автоматизировано
- **Устранение конфликта зависимостей Vite 8:**
  - Обновлен `esbuild` до `^0.28.0` в `package.json`, что устранило блокирующий конфликт `ERESOLVE` при установке зависимостей в GitHub Actions.
  - Удален устаревший `bun.lock`, зафиксирован официальный детерминированный `package-lock.json`.
- **Автоматизация GitHub Pages и устранение 404:**
  - Настроен динамический `base: process.env.BASE_PATH || './'` в `vite.config.ts`.
  - Service Worker `public/sw.js` теперь динамически вычисляет префикс пути (`/MetaShkola/`), предотвращая 404 при кэшировании на GitHub Pages.
  - `public/manifest.json` переведен на относительные пути для бесшовной установки PWA как из подкаталога GitHub Pages, так и из корня.
- **Восстановление Android Gradle Wrapper и ресурсов иконок:**
  - В репозиторий добавлены официальные исполняемые файлы Gradle Wrapper 8.5 (`android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`).
  - Сгенерированы недостающие растровые иконки `ic_launcher.png` и `ic_launcher_round.png` для всех плотностей экранов (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`), устранив аварийный сбой AAPT2 при сборке.
  - В `android/app/build.gradle` полностью исключен debug-fallback для release-сборки.
- **Комплексный CI/CD пайплайн:**
  - Настроены 4 workflow: `web-ci.yml`, `deploy-pages.yml`, `android-ci.yml`, `release.yml`.
  - Добавлена строгая проверка 4 обязательных секретов в `release.yml` с автоматическим прерыванием при их отсутствии.
  - Реализовано безопасное удаление Keystore (`shred -u`) после компиляции APK в CI.

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
