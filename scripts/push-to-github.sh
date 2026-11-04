#!/usr/bin/env bash
set -e

echo "=== MetaШкола 2.0: Синхронизация и запуск релиза на GitHub ==="

if [ -z "$1" ]; then
  echo "Использование: $0 <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>"
  echo "Или выполните напрямую стандартную команду git push:"
  echo "  git push origin main"
  echo "  git push origin v2.0.1 --force"
  exit 1
fi

TOKEN="$1"
REMOTE_URL="https://x-access-token:${TOKEN}@github.com/Andarer/MetaShkola.git"

echo "==> Отправка исправлений в ветку main..."
git push "$REMOTE_URL" main

echo "==> Отправка ветки develop..."
git push "$REMOTE_URL" develop || true

echo "==> Отправка релизного тега v2.0.1..."
git push "$REMOTE_URL" v2.0.1 --force

echo "=== Успешно! Сборка и релиз запущены в GitHub Actions ==="
