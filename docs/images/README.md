# Картинки для README

| Файл | Что это |
|---|---|
| `banner.png` | Шапка корневого `README.md`: фон + заголовок «SuperApp», слоган и логотип |
| `logo.png` | Логотип: двойной шеврон, градиент `#667eea → #8b5cf6` (256×256, прозрачный фон) |
| `screen-drive.png`, `screen-mail.png`, `screen-tasks.png`, `screen-login.png` | Иллюстрации модулей: «Диск», «Почта», «Задачи», экран входа |
| `qr-server.png` | QR-код на `https://prostroykrym.ru` (для быстрого открытия приложения с телефона) |
| `raw-*.jpg` | Исходные иллюстрации (сжатые, 1600 px). Из них собираются `banner.png` и `screen-*.png` |

> Иллюстрации интерфейса — **макеты**, а не скриншоты живого приложения: текст на
> них не читается, чтобы не вводить в заблуждение. В подписи под README это указано.

## Заменить макеты настоящими скриншотами

1. Сделайте скриншот окна приложения (удобно на Windows: `Win + Shift + S`).
2. Обрежьте до рабочей области окна и сохраните в PNG **1280×800** (можно другой
   размер — скрипт сам масштабирует) под тем же именем, например
   `docs/images/screen-mail.png`.
3. Закоммитьте файл — README подхватит его автоматически, править текст не нужно.
4. По желанию: положите «сырой» скриншот рядом как `raw-mail.jpg` и прогоните
   `python3 docs/images/make-images.py` — получится кадр со скруглением, тенью и
   фоном, как у остальных.

## Перегенерировать картинки из исходников

```bash
pip install Pillow
python3 docs/images/make-images.py      # нужен доступ к шрифтам DejaVu
```

Скрипт собирает `logo.png`, `banner.png` и `screen-*.png` из `raw-*.jpg`.
Текст баннера («Ваш сервер — ваши данные», «Почта · Диск · Задачи», слоган)
редактируется прямо в `make-images.py`.

## QR-код

`qr-server.png` сделан пакетом [`qrcode`](https://www.npmjs.com/package/qrcode) для ссылки
`https://prostroykrym.ru`. Если домен изменится:

```bash
npm i qrcode
node -e "require('qrcode').toFile('docs/images/qr-server.png', 'https://новый-домен.ру', \
  {color:{dark:'#3730a3', light:'#ffffff'}, margin:2, width:512}, e => { if (e) throw e; })"
python3 - <<'EOF'
from PIL import Image
qr = Image.open('docs/images/qr-server.png').convert('RGB')
bg = Image.new('RGB', (qr.width + 64, qr.height + 64), (255, 255, 255))
bg.paste(qr, (32, 32)); bg.save('docs/images/qr-server.png', optimize=True)
EOF
```
