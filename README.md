# MetaШкола 2.2

**Автор и инициатор проекта:** Andárer  
**Версия:** 2.2.0 (Stable Release)  
**Лицензия:** Apache-2.0 / Proprietary Educational Platform

MetaШкола 2.2 — это кроссплатформенная модульная образовательная экосистема, объединяющая веб-платформу (PWA) и защищенное нативное Android-приложение в единую систему управления обучением для семей, школ и индивидуальных пользователей. Включает школьную социальную сеть MetaCommunity, Update Center 2.0 с контролем SHA-256 и честный Offline-First движок.

---

## 🌟 Ключевые возможности

1. **Три режима работы (Multi-tenant):**
   - **Семейный:** родители, дети, семейное расписание, контроль уроков и домашних заданий, семейный календарь.
   - **Школьный:** образовательные учреждения, классы, группы, администраторы, учителя, классные руководители, ученики, расписание звонков, оценки.
   - **Персональный:** персональные задачи, личный календарь, заметки, учебные материалы, ИИ-репетитор.
2. **Offline First & Mobile First:**
   - 100% автономная работа без подключения к сети;
   - Локальное хранение состояния на устройстве (`localStorage` / Room / SQLite);
   - Автоматическая синхронизация при восстановлении интернет-соединения;
   - Оптимизированный адаптивный интерфейс с мобильным доком и поддержкой экранов от 320px до 4K.
3. **Расписание и Звонки:**
   - Начало первого урока: **08:00**, продолжительность урока: **45 минут**, обычная перемена: **10 минут**, большая перемена: **20 минут**;
   - Звуковые сигналы звонков (Web Audio API / системный динамик Android);
   - Уведомления за 5 и 15 минут до начала урока, оповещения о начале и конце перемен.
4. **Универсальный ИИ-центр (MetaAI Gateway):**
   - Подключение Google Gemini, OpenAI, xAI Grok, Anthropic Claude, DeepSeek, Mistral, OpenRouter, пользовательских endpoints;
   - Специализированные роли: ИИ-репетитор, помощник по математике, языковой консультант, помощник учителя и родителя;
   - Режим сравнения ответов двух моделей;
   - Защита данных несовершеннолетних: блокировка внешних ИИ для учеников без прямого согласия.
5. **Android-приложение:**
   - Поддержка **Android 5.0 (API 21)** и новее (вплоть до Android 14+ / API 34);
   - Оптимизировано для **OPPO A74** и ColorOS с учетом фонового энергосбережения;
   - Фоновые уведомления через `NotificationManagerCompat` и `AlarmManager`;
   - Архитектуры: ARM64-v8a, armeabi-v7a, x86, x86_64.
6. **Автоматизированный CI/CD и GitHub Releases:**
   - Автоматическая сборка веб-версии;
   - Сборка Debug APK и подписанных Release APK;
   - Вычисление контрольных сумм SHA-256;
   - Публикация релизов по Git-тегам (`v*`).

---

## 🚀 Быстрый старт (Web)

```bash
# Установка зависимостей
npm install

# Запуск локального dev-сервера
npm run dev

# Проверка типов и линтинг
npm run lint

# Сборка production-бандла
npm run build
```

---

## 📱 Сборка Android APK

```bash
# Подготовка ассетов и сборка APK
./scripts/build-apk.sh

# Сборка через Gradle
cd android
./gradlew assembleDebug
```

---

## ⚙️ Непрерывная интеграция и доставка (GitHub Actions CI/CD)

В репозитории настроены 4 автоматизированных workflow:

1. **Web CI (`.github/workflows/web-ci.yml`):**
   - **Триггеры:** `push` и `pull_request` в ветки `main` и `develop` (изменения в `src/**`, `public/**`, `package.json`, `vite.config.ts`, `tsconfig.json`).
   - **Действия:** `npm ci`, проверка типов `npm run typecheck`, линтинг `npm run lint`, юнит-тесты `npm run test`, сборка `npm run build`, валидация `index.html` и выгрузка артефакта `metashkola-web-dist`.
2. **GitHub Pages Deployment (`.github/workflows/deploy-pages.yml`):**
   - **Триггеры:** `push` в ветку `main` (при наличии веб-изменений).
   - **Действия:** Сборка PWA с `BASE_PATH: /MetaShkola/` и деплой на GitHub Pages по адресу:  
     `https://andarer.github.io/MetaShkola/`
   - *Примечание:* Для первой активации перейдите в **Settings -> Pages -> Build and deployment -> Source** и выберите **GitHub Actions**.
3. **Android Debug CI (`.github/workflows/android-ci.yml`):**
   - **Триггеры:** `push` и `pull_request` в `main` и `develop` (изменения в `android/**` или веб-части).
   - **Действия:** Сборка веб-бандла, синхронизация с `android/app/src/main/assets/www/`, компиляция `./gradlew assembleDebug`, вычисление контрольной суммы SHA-256, проверка через `apksigner` и выгрузка артефакта `MetaSchool-debug.apk` (срок хранения 14 дней).
4. **Automated Release (`.github/workflows/release.yml`):**
   - **Триггеры:** Создание Git-тега версий `v*` (например, `v2.0.1`).
   - **Безопасность:** Сборка Release APK производится **только при наличии всех 4 обязательных секретов**. Fallback на debug-ключ исключен.
   - **Действия:** Проверка тега, декодирование Keystore, сборка `./gradlew assembleRelease`, гарантированное удаление keystore с диска (`shred -u`), валидация подписи `apksigner`, вычисление SHA-256 и создание официального релиза в GitHub Releases с прикрепленным `MetaSchool-release.apk` и контрольными суммами.

---

## 🔐 Настройка секретов для Android Release (GitHub Secrets)

Для сборки и публикации подписанного Release APK необходимо настроить 4 секрета в репозитории:  
**Settings -> Secrets and variables -> Actions -> New repository secret**

| Имя секрета | Описание | Пример значения |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Keystore в формате base64 | Результат команды `base64 -w 0 release.keystore` |
| `KEYSTORE_PASSWORD` | Пароль от файла хранилища ключей | `YourStrongKeystorePassword` |
| `KEY_ALIAS` | Алиас ключа приложения | `metashkola` |
| `KEY_PASSWORD` | Пароль конкретного ключа | `YourStrongKeyPassword` |

Подробное пошаговое руководство по генерации ключа: [docs/ANDROID_SIGNING.md](docs/ANDROID_SIGNING.md).

---

## 🏷️ Как выпустить новую версию приложения

```bash
# 1. Убедитесь, что изменения закоммичены в main
git checkout main
git pull origin main

# 2. Создайте подписанный тег версии
git tag -a v2.0.1 -m "Релиз MetaШкола 2.0.1: Автоматизация CI/CD и PWA деплой"

# 3. Отправьте тег в репозиторий
git push origin v2.0.1
```
После отправки тега автоматически запустится workflow `release.yml`, который создаст релиз и прикрепит готовый Android APK.

---

## 📚 Документация проекта

- [AUDIT.md](AUDIT.md) — Результаты аудита исходного архива и причин сбоев CI/CD
- [ARCHITECTURE.md](ARCHITECTURE.md) — Системная архитектура и стек
- [ROADMAP.md](ROADMAP.md) — Дорожная карта развития
- [CHANGELOG.md](CHANGELOG.md) — История версий и изменений
- [SECURITY.md](SECURITY.md) — Политика безопасности и защита данных
- [docs/ANDROID_SIGNING.md](docs/ANDROID_SIGNING.md) — Инструкция по генерации ключей и настройке GitHub Secrets
- [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) — Модели данных и синхронизация
- [docs/API.md](docs/API.md) — Спецификация API и нативного моста
- [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md) — Руководство по локальной сборке Android APK
- [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) — Релизный процесс и GitHub Actions
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — Подключение внешних сервисов
- [docs/AI_GATEWAY.md](docs/AI_GATEWAY.md) — Архитектура MetaAI Gateway
