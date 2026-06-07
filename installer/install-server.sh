#!/usr/bin/env bash
# Установщик СЕРВЕРА SuperApp (Linux/macOS).
#
#   ./installer/install-server.sh            # интерактивная настройка
#   ./installer/install-server.sh --defaults # без вопросов (обновление)
#   ./installer/install-server.sh --systemd  # дополнительно создать unit systemd
#
# Шаги: проверка Bun → установка зависимостей → интерактивная конфигурация
# (.env + генерация JWT_SECRET) → подсказки по запуску.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$REPO_ROOT/packages/server"

WANT_SYSTEMD=0
PASS_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --systemd) WANT_SYSTEMD=1 ;;
    *) PASS_ARGS+=("$arg") ;;
  esac
done

echo "=== SuperApp: установка сервера ==="

# 1) Проверяем рантайм Bun.
if ! command -v bun >/dev/null 2>&1; then
  echo "✗ Не найден Bun (рантайм сервера)."
  echo "  Установите: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
echo "✓ Bun: $(bun --version)"

# Чем запускать конфигуратор (.mjs): node, иначе bun.
if command -v node >/dev/null 2>&1; then
  RUNNER="node"
else
  RUNNER="bun"
fi

# 2) Устанавливаем зависимости (на уровне монорепозитория).
echo "→ Установка зависимостей (bun install)..."
(cd "$REPO_ROOT" && bun install)

# 3) Интерактивная конфигурация: пишет packages/server/.env.
echo "→ Конфигурация сервера..."
"$RUNNER" "$SCRIPT_DIR/configure-server.mjs" "${PASS_ARGS[@]:-}"

# 4) Опционально — unit systemd.
if [ "$WANT_SYSTEMD" -eq 1 ]; then
  UNIT_PATH="$REPO_ROOT/installer/superapp-server.service"
  BUN_BIN="$(command -v bun)"
  cat > "$UNIT_PATH" <<UNIT
[Unit]
Description=SuperApp Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$SERVER_DIR
EnvironmentFile=$SERVER_DIR/.env
ExecStart=$BUN_BIN run src/server.ts
Restart=on-failure
RestartSec=3
# Базовое усиление безопасности процесса.
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
  echo "✓ Шаблон systemd создан: $UNIT_PATH"
  echo "  Установить службу:"
  echo "    sudo cp \"$UNIT_PATH\" /etc/systemd/system/superapp-server.service"
  echo "    sudo systemctl daemon-reload && sudo systemctl enable --now superapp-server"
fi

echo
echo "=== Готово. Сервер настроен. ==="
echo "Запуск вручную:"
echo "    cd \"$SERVER_DIR\" && bun run src/server.ts"
echo "Рекомендация безопасности: публикуйте сервер за reverse-proxy (nginx/Caddy)"
echo "с TLS и откройте только нужный порт в firewall."
