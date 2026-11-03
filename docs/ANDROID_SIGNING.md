# Руководство по постоянной криптографической подписи Android APK (Release Signing)

**Проект:** MetaШкола 2.0  
**Автор и владелец:** Andárer  
**Целевая безопасность:** Защищенное подписание релизов через GitHub Actions Secrets без публикации закрытых ключей в Git.

---

## ⚠️ ВАЖНО: Правило единственного ключа подписи

В операционной системе Android обновление ранее установленного приложения возможно **только в том случае, если новая версия подписана точно тем же цифровым сертификатом (keystore)**, что и первая версия.

- **Если ключ утрачен:** пользователи не смогут обновить MetaШкола через APK без полного удаления приложения и потери локальных данных.
- **Никогда не публикуйте keystore в публичный Git-репозиторий.**
- **Сделайте резервную копию файла keystore** (на зашифрованную флешку или в защищенное хранилище паролей).

---

## 1. Однократное создание постоянного Keystore

Выполните команду на вашем локальном компьютере (Linux, macOS или Windows в PowerShell/Git Bash):

```bash
keytool -genkeypair -v \
  -keystore metaschool-release.keystore \
  -alias metaschool \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

### Параметры:
- `metaschool-release.keystore` — имя файла хранилища ключей.
- `-alias metaschool` — алиас (имя) ключа внутри хранилища.
- `-validity 10000` — срок действия сертификата (~27 лет).
- В процессе генерации утилита запросит **пароль хранилища** и **пароль ключа** (рекомендуется использовать надежный пароль от 16 символов).

---

## 2. Кодирование Keystore в формат Base64 для GitHub Secrets

Чтобы безопасно передать бинарный файл keystore в GitHub Actions, переведите его в текстовую строку Base64:

### На Linux / macOS:
```bash
base64 -w 0 metaschool-release.keystore > keystore_base64.txt
# или на macOS (BSD base64):
base64 -i metaschool-release.keystore -o keystore_base64.txt
```

### На Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("metaschool-release.keystore")) | Out-File -Encoding utf8 keystore_base64.txt
```

Скопируйте содержимое файла `keystore_base64.txt` в буфер обмена. После добавления в секреты удалите текстовый файл `keystore_base64.txt`.

---

## 3. Добавление секретов в GitHub Repository

1. Перейдите в ваш репозиторий:  
   `https://github.com/Andarer/MetaShkola`
2. Откройте **Settings** → в левом меню выберите **Secrets and variables** → **Actions**.
3. Нажмите кнопку **New repository secret** и создайте 4 обязательных секрета:

| Название секрета | Что вставить в значение | Описание |
| :--- | :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | Содержимое `keystore_base64.txt` | Весь keystore в кодировке Base64 (одной строкой) |
| `KEYSTORE_PASSWORD` | Ваш пароль от keystore | Пароль хранилища ключей |
| `KEY_ALIAS` | `metaschool` | Алиас ключа (указанный при `keytool`) |
| `KEY_PASSWORD` | Ваш пароль от ключа | Пароль самого ключа (часто совпадает с паролем keystore) |

---

## 4. Как работает автоматическая подпись в CI/CD

В файле `.github/workflows/release.yml`:
1. Пайплайн запускается **только при создании Git-тега** формата `v*` (например, `v2.0.1`).
2. Проверяется наличие всех 4 секретов. Если хотя бы один отсутствует, **сборка прерывается с понятной ошибкой до компиляции**, предотвращая создание неподписанных или поврежденных релизов.
3. Keystore временно декодируется в память раннера (`/tmp/release.keystore`).
4. Gradle собирает релиз: `./gradlew assembleRelease`.
5. Сразу после сборки временный файл keystore удаляется с помощью утилиты `shred -u`.
6. Готовый APK проверяется официальной утилитой Android SDK:  
   `apksigner verify --verbose release-dist/MetaSchool-release.apk`
7. Вычисляется контрольная сумма SHA-256 (`MetaSchool-release.apk.sha256`).
8. Релиз и артефакты автоматически публикуются в **GitHub Releases**.

---

## 5. Проверка подписи выпущенного APK

Вы всегда можете самостоятельно проверить подпись скачанного APK:

```bash
apksigner verify --verbose MetaSchool-release.apk
```

Вывод должен содержать:
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1
Signer #1 certificate DN: ...
```
