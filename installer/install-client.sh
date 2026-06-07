#!/usr/bin/env bash
# Установщик КЛИЕНТА SuperApp (Linux/macOS, в т.ч. для разработки).
#
#   ./installer/install-client.sh            # интерактивная настройка + сборка
#   ./installer/install-client.sh --defaults # без вопросов (обновление)
#   ./installer/install-client.sh --no-build # только записать config.json
#
# Шаги: проверка Bun → установка зависимостей → интерактивная конфигурация
# (config.json с адресом сервера) → сборка веб-бандла.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLIENT_DIR="$REPO_ROOT/packages/client"

DO_BUILD=1
PASS_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --no-build) DO_BUILD=0 ;;
    *) PASS_ARGS+=("$arg") ;;
  esac
done

echo "=== SuperApp: установка клиента ==="

if ! command -v bun >/dev/null 2>&1; then
  echo "✗ Не найден Bun. Установите: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo "✓ Bun: $(bun --version)"

if command -v node >/dev/null 2>&1; then
  RUNNER="node"
else
  RUNNER="bun"
fi

echo "→ Установка зависимостей (bun install)..."
(cd "$REPO_ROOT" && bun install)

echo "→ Конфигурация клиента (адрес сервера)..."
"$RUNNER" "$SCRIPT_DIR/configure-client.mjs" "${PASS_ARGS[@]:-}"

if [ "$DO_BUILD" -eq 1 ]; then
  echo "→ Сборка веб-бандла (vite build)..."
  (cd "$CLIENT_DIR" && bun run build)
  echo "✓ Сборка готова: $CLIENT_DIR/dist"
  echo "  Десктоп-установщик (Electron, NSIS) собирается на Windows: installer/install-client.ps1"
fi

echo
echo "=== Готово. Клиент настроен на подключение к серверу из config.json. ==="
