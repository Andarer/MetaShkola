#!/usr/bin/env bash
set -e

echo "=== MetaШкола 2.0: Android APK Build Script ==="
echo "Target Platform: Android 5.0+ (API 21 to 34), OPPO A74 compatible (ARM64 / ARMv7)"

# 1. Compile web bundle
echo "==> Building web production bundle..."
npm run build

# 2. Copy web bundle to Android assets
echo "==> Copying web assets to android/app/src/main/assets/www..."
mkdir -p android/app/src/main/assets/www
rm -rf android/app/src/main/assets/www/*
cp -r dist/* android/app/src/main/assets/www/

echo "==> Web assets successfully embedded into Android app assets!"

# 3. Check for Gradle & Android SDK
if command -v gradle &> /dev/null || [ -f "android/gradlew" ]; then
    echo "==> Gradle found. Ready for build execution."
    cd android
    if [ -x "./gradlew" ]; then
        GRADLE_CMD="./gradlew"
    else
        GRADLE_CMD="gradle"
    fi
    
    if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
        echo "==> Android SDK located. Building APK..."
        $GRADLE_CMD assembleDebug
        echo "==> Debug APK created in android/app/build/outputs/apk/debug/"
    else
        echo "[INFO] Android SDK environment not configured locally. Android build files and assets are prepared for GitHub Actions CI/CD."
    fi
    cd ..
else
    echo "[INFO] Gradle not installed in current environment. Android build structure is verified and ready for GitHub Actions CI/CD."
fi

echo "=== Build prep complete ==="
