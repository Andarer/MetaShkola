# Руководство по сборке Android-приложения MetaШкола (ANDROID_BUILD.md)

**Автор и инициатор:** Andárer

---

## 1. Системные требования

- **Минимальная версия Android:** Android 5.0 (Lollipop, API Level 21)
- **Целевая версия Android:** Android 14 (API Level 34)
- **Целевое эталонное устройство:** OPPO A74 (Qualcomm Snapdragon 662, ColorOS / Android 11/12)
- **Поддерживаемые архитектуры:**
  - `arm64-v8a` (64-битные современные смартфоны, включая OPPO A74)
  - `armeabi-v7a` (32-битные Android-устройства)
  - `x86`, `x86_64` (эмуляторы)

---

## 2. Локальная сборка

### Шаг 1: Подготовка окружения
- Установите JDK 17 (`openjdk-17-jdk`);
- Установите Android SDK (platforms;android-34, build-tools;34.0.0);
- Убедитесь, что переменная `ANDROID_HOME` указывает на директорию SDK.

### Шаг 2: Сборка веб-бандла и ассетов
```bash
# Выполнить автоматический скрипт подготовки ассетов
./scripts/build-apk.sh
```
Скрипт компилирует веб-версию (`npm run build`) и синхронизирует готовые файлы в `android/app/src/main/assets/www/`.

### Шаг 3: Компиляция APK через Gradle
```bash
cd android

# Сборка Debug APK (для тестирования на устройстве)
./gradlew assembleDebug

# Результат:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Установка на OPPO A74

1. Включите **Режим разработчика** на OPPO A74:
   - *Настройки* → *О телефоне* → *Версия* → нажать 7 раз на *Номер сборки*.
2. Включите **Отладку по USB** в разделе *Для разработчиков*.
3. Подключите телефон к компьютеру через USB и выполните:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
4. **Настройки энергосбережения ColorOS для фоновых звонков:**
   - Перейдите в *Настройки* → *Приложения* → *MetaШкола*;
   - Разрешите *Автозапуск*;
   - В разделе *Использование батареи* выберите *Разрешить фоновую активность*;
   - В разделе *Уведомления* включите все каналы («Звонки и Уроки», «Задания»).

---

## 4. Генерация ключа подписи (Keystore)

Для Release-сборки создайте постоянный ключ подписи (сохраните его и пароли в надежном месте!):

```bash
keytool -genkey -v \
  -keystore metaschool-release.keystore \
  -alias metaschool \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Andarer, OU=MetaSchool, O=MetaSchool, C=RU"
```

Для использования в GitHub Actions преобразуйте файл ключа в Base64:
```bash
base64 -w 0 metaschool-release.keystore > keystore_base64.txt
```

---

## 5. Сборка подписанного Release APK
```bash
export KEYSTORE_FILE=/path/to/metaschool-release.keystore
export KEYSTORE_PASSWORD=ВашПарольХранилища
export KEY_ALIAS=metaschool
export KEY_PASSWORD=ВашПарольКлюча

cd android
./gradlew assembleRelease
```
Готовый APK: `android/app/build/outputs/apk/release/app-release.apk`.
Вычисление контрольной суммы:
```bash
sha256sum android/app/build/outputs/apk/release/app-release.apk
```
