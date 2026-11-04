# Release Notes: MetaШкола 2.0.1 (v2.0.1)

**Дата:** 4 ноября 2026 г.  
**Автор и инициатор проекта:** Andárer  
**Git Tag:** `v2.0.1`  
**Целевой коммит:** `7eb108f`  
**Платформы:** Web (PWA), Android (5.0 Lollipop — 14+, API 21..34, ARM64/ARMv7, OPPO A74)

---

## 🌟 Что нового в релизе v2.0.1

### 1. Устранение блокирующих сбоев CI/CD
- **Vite 8 & esbuild:** Разрешен конфликт версий `esbuild` (`^0.28.0`), удален `bun.lock`, сформирован официальный детерминированный `package-lock.json`. Все этапы CI переведены на детерминированный `npm ci`.
- **AAPT2 компиляция Android:** Сгенерированы все недостающие растровые ресурсы иконок `ic_launcher.png` и `ic_launcher_round.png` для всех плотностей экранов (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
- **Gradle 8.5 Wrapper:** В репозиторий добавлены официальные исполняемые файлы обёртки Gradle 8.5 (`gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`).

### 2. GitHub Pages & PWA Деплой
- **Устранение 404 подпути:** Настроен динамический `base: process.env.BASE_PATH || './'`, гарантирующий бесшовную работу приложения как на GitHub Pages (`https://andarer.github.io/MetaShkola/`), так и локально или внутри нативного WebView (`file:///android_asset/www/index.html`).
- **PWA Service Worker:** `public/sw.js` теперь динамически распознает префикс размещения и кэширует ресурсы без ошибок 404.

### 3. Комплексная автоматизация GitHub Actions
- **Web CI (`.github/workflows/web-ci.yml`):** Тесты, линтинг, проверка типов и выгрузка бандла `metashkola-web-dist`.
- **Pages Deployment (`.github/workflows/deploy-pages.yml`):** Автоматическая публикация PWA на GitHub Pages при пуше в `main`.
- **Android Debug CI (`.github/workflows/android-ci.yml`):** Сборка `MetaSchool-debug.apk` с вычислением SHA-256 и проверкой `apksigner`.
- **Automated Release (`.github/workflows/release.yml`):** Триггер по тегам `v*`, строгая проверка 4 секретов подписи (без debug fallback), сборка подписанного `MetaSchool-release.apk` и публикация в GitHub Releases.

---

## 📦 Сборка и контрольные суммы

| Файл | Описание | SHA-256 |
|---|---|---|
| `MetaShkola-v2.0.1-web.tar.gz` | Production Web PWA бандл | `a4a5b9b01640ae9fd09bebfc827f6d8218c8fe86f6510dfef09f2351ddf7e1e6` |
| `MetaSchool-debug.apk` | Сборка через GitHub Actions (`android-ci.yml`) | Вычисляется динамически в CI при пуше |
| `MetaSchool-release.apk` | Официальный подписанный релизный APK | Генерируется GitHub Actions по тегу `v2.0.1` |
