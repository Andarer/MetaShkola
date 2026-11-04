# Технический аудит проекта MetaШкола 2.0 (AUDIT.md)

**Автор и инициатор проекта:** Andárer  
**Дата аудита:** Ноябрь 2026 г.  
**Объект аудита:** Исходный код и структура архива `grok-workspace.zip`

---

## 1. Введение и обзор исходного состояния

Исходный архив представляет собой прототип платформы **MetaШкола**, разработанный с использованием стека TanStack Start / React 19 / Vite / Tailwind v4 / Zustand / Better Auth / PGLite. 

В проекте заложена глубоко продуманная доменная модель (`src/lib/ms/types.ts`), охватывающая:
- Пространства (Семейный, Школьный, Персональный);
- Ролевую модель (9 ролей: Создатель, Системный администратор, Администратор организации, Администратор семьи, Родитель, Преподаватель, Классный руководитель, Ученик, Гость);
- Расписание уроков и расписание звонков (первый урок 08:00, 45 минут урок, перемены 10 и 20 минут, исключения и замены);
- Домашние задания со статусами, приоритетами, комментариями и вложениями;
- Календарь учебных событий, каникул, экзаменов и праздников;
- Оценки и достижения;
- Интеграционный шлюз и универсальный ИИ-центр.

---

## 2. Что действительно работает

1. **Доменное ядро и Zustand-хранилище (`src/lib/ms/store.ts`, `types.ts`):**
   - Полная реактивная модель данных;
   - Механизм `persist` с сохранением в `localStorage` браузера и устройства;
   - Создание пространств (семья / школа / персональное);
   - Редактирование профилей, переключение ролей, установка локального PIN-кода;
   - Управление расписанием звонков, уроков, исключений и предметов;
   - Создание и фильтрация домашних заданий, добавление комментариев и статусов;
   - Экспорт и импорт всего состояния базы данных в JSON.

2. **RBAC и разграничение доступа (`src/lib/ms/rbac.ts`):**
   - Проверка прав на уровне действий (`view`, `create`, `edit`, `delete`, `schedule`, `tasks`, `grades`, `ai`, `integrations`);
   - Защита данных несовершеннолетних: флаг `aiRestrictedForMinors`, блокирующий доступ к внешним ИИ для учеников без разрешения;
   - Изоляция действий между родителями, учителями, учениками и администраторами.

3. **Интернационализация (i18n):**
   - 3 полноценных языка: Русский (`ru`), Украинский (`uk`), Английский (`en`);
   - Полный словарь всех системных сообщений, названий уроков, ролей, подсказок и ошибок.

4. **Интерфейс экранов:**
   - Главный экран (`home-screen.tsx`): отслеживание текущего урока, обратный отсчет до звонка, сводка заданий и ближайших событий;
   - Расписание (`schedule-screen.tsx`): сетка по дням недели, добавление уроков, отметка отмен/замен;
   - Звонки (`bells-screen.tsx`): настройка времени первого урока, продолжительности и больших перемен;
   - Задания (`tasks-screen.tsx`): фильтры по статусам, приоритетам, исполнителям;
   - Календарь (`calendar-screen.tsx`): сетка месяца и список событий с цветовой дифференциацией;
   - Люди и роли (`people-screen.tsx`): управление участниками, назначение классов и ролей;
   - Организации (`orgs-screen.tsx`): структура школ, подразделений, классов и групп.

---

## 3. Что реализовано частично

1. **MetaAI Gateway (`src/lib/ms/ai.functions.ts`):**
   - Было реализовано через TanStack Start серверные функции (`createServerFn`), что создавало жесткую зависимость от SSR Nitro/H3 сервера и делало невозможным прямой запуск в автономном Android APK или статическом PWA.
   - **Исправлено:** Шлюз переработан в универсальный клиент-серверный модуль с поддержкой прямого вызова OpenAI, Gemini, Grok, DeepSeek, Mistral, OpenRouter, пользовательских endpoints и встроенного автономного оффлайн-движка.

2. **Интеграции со сторонними сервисами (`integrations-screen.tsx`):**
   - В интерфейсе присутствовали тумблеры и списки правил для Google Calendar, Outlook, Telegram, CalDAV, но исполнение опиралось на локальный журнал без прямого сетевого коннектора в оффлайн-режиме.
   - Экспорт и импорт JSON полностью функционируют.

---

## 4. Что являлось демонстрацией / заглушкой

1. **Серверная база PGLite / Better Auth:**
   - В архиве присутствовали скрипты инициализации Better Auth и PGLite, однако они были жестко привязаны к внутренней виртуальной среде песочницы Grok (`.grok/`, `scripts/with-app-env.mjs`, Nitro beta).
   - При сборке вне этой специфической среды возникали конфликты версий Nitro beta и зависимости от закрытых бинарников.
2. **Android-сборка:**
   - В исходном архиве отсутствовали конфигурационные файлы Android (Gradle, AndroidManifest, ресурсы, иконки, нативный мост). Присутствовали лишь скриншоты макета мобильного приложения.

---

## 5. Что отсутствовало

1. Полноценная конфигурация Android-проекта с поддержкой Android 5.0+ (API 21) и целевого устройства OPPO A74.
2. Фоновые уведомления через системный `NotificationManagerCompat` и `AlarmManager` для гарантированной доставки сигналов звонков на Android.
3. CI/CD пайплайны GitHub Actions для автоматической сборки Web-версии, Android Debug APK и подписанных Release APK.
4. Документация по процессу подписи, архитектуре данных, API и развертыванию.

---

## 6. Технические риски и анализ решений

| Риск | Влияние | Выбранное решение |
|---|---|---|
| Несовместимость Capacitor с Android 5.0 (API 21) | Высокое | Capacitor 6/7 требует minSdk 22/26. Разработан нативный Android WebView Wrapper с поддержкой API 21..34. |
| Агрессивное энергосбережение OPPO (ColorOS) | Среднее | Использование `AlarmManager.setExactAndAllowWhileIdle()` и `NotificationHelper` с приоритетными каналами. |
| Работа без интернета (Offline First) | Высокое | Сервис-воркер (`sw.js`) + предзагрузка локального бандла в `android_asset/www/` + локальное Zustand-хранилище. |
| Безопасность ключей ИИ | Критическое | Локальное изолированное хранилище ключей на устройстве пользователя, запрет на публикацию ключей в репозиторий. |

---

## 7. План выполненных и предстоящих исправлений

- [x] Полная распаковка и статический анализ исходных файлов.
- [x] Устранение зависимостей от закрытой среды Grok (`nitro beta`, `with-app-env`).
- [x] Перевод приложения на чистый, высокопроизводительный Vite + React 19 + Tailwind v4.
- [x] Реализация универсального AI Gateway с оффлайн-помощником.
- [x] Создание полного Android-проекта (API 21..34, ARM64/ARMv7, OPPO A74).
- [x] Настройка Web Audio синтезатора школьных звонков и Web Notifications.
- [x] Разработка PWA-манифеста (`manifest.json`) и Service Worker (`sw.js`).
- [x] Подготовка GitHub Actions CI/CD (Web CI, Android CI, Automated Releases).
- [x] Подготовка полной документации проекта (13 нормативных документов).

---

## 8. Аудит сбоев GitHub Actions (Коммиты e147d6c и d751956)

### 8.1. Сбой коммита `e147d6c` ("feat(ms): улучшение функций звонков и ИИ")
- **Упавший workflow и job:** `Web CI / test-and-build`, `Android CI / build-apk`.
- **Первопричина 1 (Конфликт Vite 8 и esbuild):**
  - В `package.json` был зафиксирован `vite@8.3.5` и `"esbuild": "^0.25.0"`.
  - При запуске `npm ci` или `npm install` менеджер пакетов npm возвращал фатальную ошибку:
    `npm error ERESOLVE could not resolve: Conflicting peer dependency: esbuild@0.28.2 (required by vite@8.3.5) ... Found: esbuild@0.25.12`.
  - В репозитории отсутствовал официальный `package-lock.json` (присутствовал только `bun.lock`), из-за чего в контейнерах GitHub Actions на шаге `npm ci` сборка завершалась с кодом 1.
- **Первопричина 2 (Ошибка ресурсов Android AAPT2):**
  - Файл `android/app/src/main/AndroidManifest.xml` ссылался на ресурсы иконок `android:icon="@mipmap/ic_launcher"` и `android:roundIcon="@mipmap/ic_launcher_round"`.
  - Папки `mipmap-*` с растровыми иконками отсутствовали в репозитории. Компилятор AAPT2 аварийно прерывал `assembleDebug` с сообщением `AAPT: error: resource mipmap/ic_launcher not found`.
- **Первопричина 3 (Отсутствие Gradle Wrapper в репозитории):**
  - В каталоге `android/` отсутствовали исполняемые файлы `gradlew`, `gradlew.bat` и бинарный архив `gradle/wrapper/gradle-wrapper.jar`.
  - Команда `./gradlew` в workflow `android-ci.yml` падала с `gradlew: command not found` или ошибкой поиска Jar-архива обёртки.

### 8.2. Сбой коммита `d751956` ("функция: инициализация структуры проекта")
- **Упавший workflow и job:** `Pages Deployment`, `Release CI`.
- **Первопричина 1 (Ошибки маршрутизации подпути GitHub Pages / Subpath 404):**
  - В `vite.config.ts` не был настроен `base`, по умолчанию использовался корень `'/'`.
  - GitHub Pages размещает проект по подпути `https://andarer.github.io/MetaShkola/`. Все статические бандлы скриптов и стилей искались по адресу `https://andarer.github.io/assets/...` и возвращали HTTP 404.
  - В `manifest.json` и `index.html` пути были абсолютными (`/favicon.svg`, `/manifest.json`, `/sw.js`), что вызывало сбой PWA при загрузке.
  - В Service Worker `public/sw.js` пути к кэшируемым ресурсам были абсолютными, приводя к бесконечной ошибке кэширования `sw.js` в поддиректории `/MetaShkola/`.
- **Первопричина 2 (Небезопасный fallback на Debug-подпись в Release Workflow):**
  - В конфигурации `android/app/build.gradle` тип сборки `release` при отсутствии переменных окружения подставлял `signingConfig signingConfigs.debug`. В результате в релиз попадали неподписанные или самоподписанные debug-ключом APK, непригодные для распространения и публикации в магазинах приложений.

---

## 9. Выполненные исправления и верификация

1. **Единое управление зависимостями через npm:**
   - Обновлен `package.json`: `"esbuild": "^0.28.0"`, `"version": "2.0.1"`, `engines: { "node": ">=20.0.0" }`.
   - Удален конфликтующий файл `bun.lock`.
   - Сгенерирован детерминированный официальный `package-lock.json` с полным разрешением всех peer-зависимостей.
   - Унифицированы команды: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run build:pwa`, `npm run clean`.
2. **PWA и адаптация для GitHub Pages (`/MetaShkola/`):**
   - В `vite.config.ts` настроена динамическая база: `base: process.env.BASE_PATH || './'`. Бандл теперь одинаково корректно работает и на GitHub Pages (`/MetaShkola/`), и в нативном Android WebView (`file:///android_asset/www/index.html`).
   - В `public/sw.js` добавлен динамический расчет `BASE_PATH` на основе `self.location.pathname`.
   - В `public/manifest.json` заданы относительные пути `start_url: "./index.html"` и `scope: "./"`.
   - В `src/main.tsx` регистрация Service Worker использует `${import.meta.env.BASE_URL}sw.js` и безопасно отключается при работе внутри Android WebView (`MetaSchoolNative`).
3. **Android-инфраструктура и Gradle Wrapper:**
   - Внедрены официальные исполняемые файлы Gradle 8.5 Wrapper (`android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`).
   - Сгенерированы все недостающие ресурсы иконок mipmap (`ic_launcher.png`, `ic_launcher_round.png`) для разрешений `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`.
   - В `android/app/build.gradle` удален небезопасный debug-fallback для `release`.
   - В `MainActivity.kt` включены флаги `allowFileAccessFromFileURLs` и `allowUniversalAccessFromFileURLs` для Android 11+ (API 30+).
4. **GitHub Actions Workflows:**
   - `.github/workflows/web-ci.yml`: строгий `npm ci`, кеширование `~/.npm`, запуск lint, typecheck, tests, сборка и выгрузка артефакта `metashkola-web-dist`.
   - `.github/workflows/deploy-pages.yml`: официальные actions `configure-pages`, `upload-pages-artifact`, `deploy-pages` с передачей правильного `BASE_PATH`.
   - `.github/workflows/android-ci.yml`: сборка Web-ассетов, установка JDK 17, сборка `./gradlew assembleDebug`, вычисление SHA-256, проверка через `apksigner`, выгрузка `MetaSchool-debug.apk` (срок хранения 14 дней).
   - `.github/workflows/release.yml`: триггер по тегам `v*`, строгая валидация наличия всех 4 секретов подписи (с прерыванием сборки при их отсутствии), сборка Release APK, надежное удаление keystore (`shred -u`), генерация контрольной суммы SHA-256 и релизный деплой в GitHub Releases.
5. **Результаты тестовой верификации:**
   - `npm run lint` (`tsc --noEmit`) — 0 ошибок.
   - `npm run typecheck` (`tsc --noEmit`) — 0 ошибок.
   - `npm run test` (`tsx --test src/lib/ms/logic.test.ts`) — 3/3 пройдены.
   - `npm run build` (`vite build`) — сборка успешна (0 предупреждений).
   - `./scripts/build-apk.sh` — бандл скомпилирован и скопирован в `android/app/src/main/assets/www/`.
