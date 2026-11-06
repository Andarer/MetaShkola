# АУДИТ И СТАБИЛИЗАЦИЯ METASHKOLA 2.2
**Stability, Security & Ecosystem Integration**

- **Дата:** 05 ноября 2026 г.
- **Автор и концепция:** Andárer
- **Репозиторий:** https://github.com/Andarer/MetaShkola
- **Целевая версия:** 2.2.0 (versionCode: 220)
- **Платформы:** Web / PWA / Android APK

---

## 1. СТАТУС ВЫЯВЛЕННЫХ ПРОБЛЕМ И РЕАЛИЗАЦИЯ В 2.2.0

| Категория | Выявленный дефект / Риск | Решение в 2.2.0 | Статус |
| :--- | :--- | :--- | :--- |
| **P0: Release Integrity** | В `android-ci.yml` каждый push в `main` мог публиковать Debug APK под видом Stable Release | Удалена авто-публикация из `android-ci.yml`. Debug APK сохраняется исключительно в GitHub Actions Artifacts (`MetaSchool-debug-apk`). Официальный Stable Release собирается и подписывается строго через `release.yml` по Git-тегу `vX.Y.Z`. | **DONE** |
| **P0: WebView Security** | В `MainActivity.kt` не были явно заблокированы файловые протоколы `file://` и `content://` | Включены флаги безопасности: `allowFileAccess = false`, `allowContentAccess = false`, `allowFileAccessFromFileURLs = false`, `allowUniversalAccessFromFileURLs = false`. Исключен риск локального обхода песочницы. | **DONE** |
| **P0: Truthful Offline Sync** | Метод `flushOutbox()` выводил «Синхронизировано с облаком» при отсутствии реального сетевого бэкенда | Внедрен честный офлайн-движок: проверка `navigator.onLine`. При отсутствии сети задачи сохраняются в очереди со статусом `offline_pending`. При локальной работе фиксируется честный статус `local_synced` (сохранено на устройстве). | **DONE** |
| **P0: Privacy & Minor Protection** | Защита персональных данных детей и изоляция контента в MetaCommunity | Реализована фильтрация видимости публикаций (`school`, `class`, `family`, `only_me`), скрытие персональных контактов учащихся и модерация через систему жалоб (`reportContent`). | **DONE** |
| **P0: GitHub Pages & PWA** | В `deploy-pages.yml` собирался и внедрялся Debug APK в состав веб-дистрибутива PWA | Полностью удалена сборка Debug APK из деплоя Pages. Stable PWA содержит 0 сторонних бинарников. Добавлен `id: org.metaschool.pwa`, относительные пути `start_url: ./` и `scope: ./`, `apple-touch-icon.png`. | **DONE** |
| **P0: Service Worker & Updates** | `release.json` мог возвращаться из устаревшего кэша SW при проверке обновлений | В `sw.js` реализована стратегия Network-First для `release.json` и навигационных запросов с офлайн-фоллбэком. Загрузка в Update Center использует `import.meta.env.BASE_URL` с гарантированным разрешением на GitHub Pages. | **DONE** |
| **P0: Automated Smoke Tests** | Отсутствовало автоматическое сквозное тестирование доступности опубликованных ресурсов | Разработан автоматический тестовый раннер `scripts/smoke-test.ts` (`npm run test:smoke`): проверяет синтаксис Manifest, целостность Service Worker, отсутствие APK в веб-бандле, а также поднимает локальный HTTP-сервер и проверяет доступность всех 11 ключевых эндпоинтов (включая работу под префиксом `/MetaShkola/`). | **DONE** |
| **P1: Синхронизация версий** | Рассинхронизация кодов версий между компонентами | Версия **2.2.0** (versionCode: **220**) синхронизирована во всех модулях: `android/app/build.gradle`, `package.json`, `public/release.json`, `public/sw.js`, `updates-screen.tsx`, `settings-screen.tsx`. | **DONE** |
| **P1: Update Center 2.0** | Жестко заданный URL на старый отладочный APK | Кнопка загрузки в Центре обновлений динамически связывается с `updateInfo.apkUrl` из официального манифеста `release.json` с проверкой SHA-256 целостности. | **DONE** |
| **P2: Unit & Regression Tests** | Тесты не покрывали правила приватности и семантическое версионирование | Тестовый набор расширен до 5 комплексных тестов (расписание звонков, RBAC, изоляция сообщества, парсер SemVer). | **DONE** |

---

## 2. АРХИТЕКТУРНЫЕ ПРИНЦИПЫ METASHKOLA 2.2

1. **Secure by Design:**
   - Android WebView изолирован от доступа к файловой системе устройства.
   - Секреты подписи (Android Keystore, пароли) не хранятся в репозитории и передаются только через GitHub Secrets с мгновенным затиранием (`shred -u`) после сборки.
   - Пользовательские ИИ-ключи и настройки хранятся локально на устройстве клиента.

2. **Offline-First & Local-First:**
   - Все ключевые функции (расписание, уроки, звонки, оценки, заметки, сообщество) работают на 100% автономно без интернета.
   - Очередь исходящих операций (`outbox`) не теряет транзакции при обрыве связи.

3. **Release Separation:**
   - Четкое разделение сред: `Debug APK` (для быстрого тестирования в PR/коммитах через Artifacts) и `Release APK` (официальный подписанный релиз по тегу с публикацией в Releases).

---

## 3. ВЕРИФИКАЦИЯ И РЕЗУЛЬТАТЫ ТЕСТОВ

- `npm run test`: **5/5 тестов успешно пройдено** (0 сбоев).
- `tsc --noEmit`: **0 ошибок** (строгая типизация TypeScript соблюдена).
- `npm run build`: **Vite build успешен** (сборка оптимизированного веб-приложения).
- Service Worker: кэш `metaschool-v2.2.0` зарегистрирован.
