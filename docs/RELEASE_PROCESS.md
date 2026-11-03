# Релизный процесс и CI/CD (RELEASE_PROCESS.md)

**Автор и инициатор:** Andárer

---

## 1. Структура веток репозитория

- `main` — стабильная production-ветка. Каждый коммит готов к релизу.
- `develop` — основная интеграционная ветка разработки.
- `feature/*` — ветки для реализации новых модулей и функций.
- `fix/*` — ветки оперативных исправлений.
- `release/*` — ветки стабилизации перед публикацией версии.

---

## 2. Необходимые секреты GitHub (Repository Secrets)

Для автоматической сборки и публикации подписанных APK в настройках GitHub-репозитория (*Settings* → *Secrets and variables* → *Actions*) добавьте:

| Имя секрета | Описание | Пример значения |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Keystore-файл в кодировке Base64 | `MIIKvgIBAzCC...` |
| `KEYSTORE_PASSWORD` | Пароль от файла хранилища | Секретный пароль |
| `KEY_ALIAS` | Псевдоним ключа подписи | `metaschool` |
| `KEY_PASSWORD` | Пароль конкретного ключа | Секретный пароль |

> **Внимание по безопасности:** Никогда не добавляйте файл `.keystore` и пароли в git-коммиты!

---

## 3. Публикация нового релиза

1. Убедитесь, что все тесты и линтинг проходят:
   ```bash
   npm run lint
   node --test src/lib/ms/logic.test.ts
   npm run build
   ```
2. Создайте подписанный Git-тег:
   ```bash
   git tag -a v2.0.0 -m "MetaШкола 2.0: Official Cross-Platform Release"
   git push origin v2.0.0
   ```
3. GitHub Actions автоматически запустит воркфлоу `.github/workflows/release.yml`:
   - Выполнит сборку веб-бандла;
   - Распакует секретный keystore;
   - Соберет `MetaSchool-release.apk`;
   - Вычислит SHA-256 чексумму;
   - Сформирует страницу релиза в GitHub Releases с прикрепленным APK и Release Notes.
