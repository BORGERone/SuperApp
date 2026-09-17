#!/usr/bin/env python3
# Генерация картинок для корневого README.md.
#
#   python3 docs/images/make-images.py            (запускать из корня репозитория)
#   python3 docs/images/make-images.py --shots    + обернуть raw-*.jpg в рамку
#
# Что делает:
#   logo.png          — логотип: двойной шеврон, градиент #667eea → #8b5cf6
#   banner.png        — баннер для шапки README: raw-banner.jpg + заголовок и слоган
#   screen-*.png      — НЕ здесь: макеты интерфейса рисует make-screens.py
#
# Кадры интерфейса (screen-mail/drive/tasks/login.png) с этой версии рисуются
# «с нуля» скриптом make-screens.py — по реальным подписям и цветам клиента.
# Функция make_shot() осталась для другого случая: когда макет заменяют
# настоящим скриншотом. Положите снимок рядом как raw-mail.jpg и запустите
# скрипт с ключом --shots — он добавит скругление, тень и светлый фон.
#
# Требуется Pillow:  pip install Pillow
# Шрифты — DejaVu Sans (в Debian/Ubuntu лежат в /usr/share/fonts/truetype/dejavu).
#
# QR-код (qr-server.png) генерируется отдельно, см. docs/images/README.md.

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

INDIGO = (102, 126, 234)      # #667eea — основной цвет приложения
VIOLET = (139, 92, 246)       # #8b5cf6
DARK = (20, 16, 62)


def font(path, size):
    return ImageFont.truetype(path, size)


def chevron(cx, y0, w, t):
    """Толстая полоса, согнутая вверх углом (один шеврон логотипа)."""
    return [(cx, y0), (cx + w, y0 + w), (cx + w, y0 + w + t),
            (cx, y0 + t), (cx - w, y0 + w + t), (cx - w, y0 + w)]


def make_logo(size=256):
    S = size * 4                      # рисуем крупно и уменьшаем — сглаживание
    mask = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(mask)
    cx, w, t = S / 2, S * 0.30, S * 0.105
    d.polygon(chevron(cx, S * 0.14, w, t), fill=255)
    d.polygon(chevron(cx, S * 0.46, w, t), fill=255)

    grad = Image.new('RGBA', (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        k = y / (S - 1)
        gd.line([(0, y), (S, y)],
                fill=tuple(int(a + (b - a) * k) for a, b in zip(INDIGO, VIOLET)) + (255,))
    grad.putalpha(mask)
    logo = grad.resize((size, size), Image.LANCZOS)
    logo.save(os.path.join(HERE, 'logo.png'))
    return logo


def make_banner():
    img = Image.open(os.path.join(HERE, 'raw-banner.jpg')).convert('RGB')
    W, H = 1560, 520
    img = img.resize((W, H), Image.LANCZOS).convert('RGBA')

    # мягкое затемнение левой половины, чтобы читался текст
    shade = Image.new('L', (W, H), 0)
    sd = ImageDraw.Draw(shade)
    for x in range(int(W * 0.62)):
        sd.line([(x, 0), (x, H)], fill=int(170 * (1 - x / (W * 0.62)) ** 1.15))
    img = Image.composite(Image.new('RGBA', (W, H), DARK + (255,)), img, shade)

    d = ImageDraw.Draw(img)
    x0, ty = 92, 118

    # «пилюля» сверху (полупрозрачность — отдельным слоем)
    pill_text = 'Ваш сервер — ваши данные'
    pf = font(REG, 21)
    pw = d.textlength(pill_text, font=pf)
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rounded_rectangle(
        [x0, ty - 64, x0 + pw + 56, ty - 14], radius=25,
        fill=(255, 255, 255, 30), outline=(255, 255, 255, 110), width=2)
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img)
    d.text((x0 + 28, ty - 53), pill_text, font=pf, fill=(255, 255, 255, 255))

    # логотип + название + слоган
    logo = Image.open(os.path.join(HERE, 'logo.png')).resize((78, 78), Image.LANCZOS)
    img.alpha_composite(logo, (x0 - 2, ty))
    d = ImageDraw.Draw(img)
    d.text((x0 + 96, ty - 8), 'SuperApp', font=font(BOLD, 78), fill=(255, 255, 255, 255))
    d.text((x0 + 4, ty + 100), 'Почта  ·  Диск  ·  Задачи',
           font=font(BOLD, 31), fill=(232, 235, 255, 255))
    d.text((x0 + 4, ty + 154), 'Всё в одном приложении, развёрнутом на вашем сервере',
           font=font(REG, 22), fill=(214, 220, 250, 255))

    img.convert('RGB').save(os.path.join(HERE, 'banner.png'), quality=95)


def make_shot(out_name, raw_name, size=(1280, 800), bg=(241, 243, 250), pad=34):
    im = Image.open(os.path.join(HERE, raw_name)).convert('RGB').resize(size, Image.LANCZOS)

    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=26, fill=255)
    card = im.convert('RGBA')
    card.putalpha(mask)

    W, H = size[0] + pad * 2, size[1] + pad * 2
    canvas = Image.new('RGBA', (W, H), bg + (255,))

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shadow.paste(Image.new('RGBA', size, (60, 70, 120, 90)), (pad, pad + 10))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    canvas.alpha_composite(card, (pad, pad))
    canvas.convert('RGB').save(os.path.join(HERE, out_name), quality=95)


if __name__ == '__main__':
    import sys

    make_logo()
    make_banner()
    print('Готово: logo.png, banner.png')

    # Кадры интерфейса рисует make-screens.py; сюда они попадают только по
    # --shots — когда макеты заменяют настоящими скриншотами raw-*.jpg.
    if '--shots' in sys.argv:
        for shot, raw in (('screen-drive.png', 'raw-drive.jpg'),
                          ('screen-mail.png', 'raw-mail.jpg'),
                          ('screen-tasks.png', 'raw-tasks.jpg'),
                          ('screen-login.png', 'raw-login.jpg')):
            make_shot(shot, raw)
        print('Готово: screen-*.png (из raw-*.jpg)')
