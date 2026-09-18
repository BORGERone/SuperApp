#!/usr/bin/env python3
"""Иллюстрации интерфейса SuperApp для README (Pillow).

    python3 docs/images/make-screens.py        # запускать из корня репозитория

Скрипт рисует четыре кадра — «Почта», «Диск», «Задачи», «Вход» — в мягком
пастельном стиле: формы и градиенты вместо текста, но структура и ключевые
подписи узнаются. Содержимое повторяет реальный клиент (packages/client/src):
в почте — панели и звёздочки, диск — плитки с папками и файлами, задачи —
колонки со счётчиками и корзиной, карточки с чипом дедлайна, подзадачами,
пунктирная «Добавить карточку» и панель «Новая колонка».

Это иллюстрации, а не скриншоты: данных на них нет — вместо текста скелетон-
строки. Кадр рисуется в двойном размере и уменьшается, поэтому линии и подписи
получаются гладкими, а тени — мягкими.

Требуется Pillow и шрифты DejaVu (Debian/Ubuntu: fonts-dejavu-core).
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

S = 2                      # суперсэмплинг: рисуем в 2× и уменьшаем
W, H = 1440, 900           # логический размер кадра
SIDEBAR = 300              # ширина сайдбара

# --- палитра приложения -------------------------------------------------------
PRIMARY = (102, 126, 234)         # #667eea
PRIMARY_DARK = (90, 103, 216)     # #5a67d8
VIOLET = (118, 75, 162)           # #764ba2
GRAD_A = (99, 102, 241)           # кнопки: #6366f1 → #a855f7
GRAD_B = (168, 85, 247)
DANGER_A = (255, 107, 107)        # кнопка «Удалить»
DANGER_B = (238, 90, 90)

BG = (247, 249, 254)              # фон рабочей области
CARD = (255, 255, 255)
BORDER = (233, 237, 247)
TEXT = (26, 26, 46)               # #1a1a2e
TEXT_MUTED = (107, 114, 128)
TEXT_SOFT = (154, 163, 178)

# --- пастель для «скелетон»-форм ----------------------------------------------
SK = (224, 229, 240)              # скелетон-строка
SK_SOFT = (236, 240, 247)
SK_DARK = (206, 213, 228)

PASTELS = {
    'indigo': ((99, 102, 241), (147, 197, 253)),
    'violet': ((168, 85, 247), (196, 181, 253)),
    'teal': ((45, 212, 191), (94, 234, 212)),
    'amber': ((251, 191, 36), (252, 211, 77)),
    'rose': ((244, 114, 182), (249, 168, 212)),
    'blue': ((96, 165, 250), (147, 197, 253)),
    'coral': ((251, 113, 133), (253, 164, 175)),
    'slate': ((148, 163, 184), (203, 213, 225)),
    'orange': ((255, 154, 61), (255, 92, 110)),
    'magenta': ((255, 138, 193), (200, 107, 255)),
    'sky': ((111, 199, 255), (63, 195, 255)),
}
PASTEL_KEYS = list(PASTELS)


# --- базовые хелперы ----------------------------------------------------------

def px(v):
    return int(round(v * S))


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, px(size))


def _lw(w):
    return max(1, int(round(w * S)))


def lerp(a, b, k):
    return tuple(int(p + (q - p) * k) for p, q in zip(a, b))


def rounded(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle([px(box[0]), px(box[1]), px(box[2]), px(box[3])],
                        radius=px(r), fill=fill, outline=outline,
                        width=max(1, int(round(width * S))) if outline else 0)


def text(d, xy, s, size, color, bold=False, anchor='la'):
    d.text((px(xy[0]), px(xy[1])), s, font=font(size, bold), fill=color, anchor=anchor)


def text_w(s, size, bold=False):
    f = font(size, bold)
    return (f.getbbox(s)[2] - f.getbbox(s)[0]) / S


def fit(s, size, max_w, bold=False):
    """Обрезает строку с «…», чтобы влезла в max_w логических пикселей."""
    if text_w(s, size, bold) <= max_w:
        return s
    while s and text_w(s + '…', size, bold) > max_w:
        s = s[:-1]
    return s + '…'


def soft_shadow(img, box, r, blur=18, dy=10, color=(60, 70, 120, 60)):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [px(box[0]), px(box[1] + dy), px(box[2]), px(box[3] + dy)],
        radius=px(r), fill=color)
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(px(blur))))


def card(img, box, r=18, fill=CARD, outline=None, width=1, shadow=None):
    """Карточка с мягкой тенью (shadow = (blur, dy, alpha)).

    По умолчанию рамки нет: в прежнем стиле панели «плавали» на фоне за счёт
    одной тени, без обводки.
    """
    if shadow:
        soft_shadow(img, box, r, blur=shadow[0], dy=shadow[1],
                    color=(70, 82, 140, shadow[2]))
    d = ImageDraw.Draw(img, 'RGBA')
    rounded(d, box, r, fill=fill, outline=outline, width=width)


def glass_box(img, box, r, fill, outline=None, width=1):
    """Скруглённый прямоугольник с полупрозрачной заливкой.

    ImageDraw не смешивает альфу, поэтому рисуем на отдельном слое и
    накладываем его через alpha_composite.
    """
    x0, y0, x1, y1 = [px(v) for v in box]
    layer = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=px(r), fill=fill, outline=outline,
        width=max(1, int(round(width * S))) if outline else 0)
    img.alpha_composite(layer, (x0, y0))


def gradient_fill(img, box, r, a, b, diagonal=True):
    x0, y0, x1, y1 = [px(v) for v in box]
    grad = Image.new('RGB', (x1 - x0, y1 - y0))
    gd = ImageDraw.Draw(grad)
    for i in range(grad.width + grad.height):
        k = i / (grad.width + grad.height - 1) if diagonal else i / max(1, grad.width - 1)
        gd.line([(i, 0), (0, i)], fill=lerp(a, b, k))
    mask = Image.new('L', grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.width - 1, grad.height - 1],
                                           radius=px(r), fill=255)
    grad.putalpha(mask)
    img.alpha_composite(grad, (x0, y0))


def gradient_text(img, xy, s, size, a, b, bold=True, anchor='la'):
    f = font(size, bold)
    bb = f.getbbox(s)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    mask = Image.new('L', (w + px(4), h + px(4)), 0)
    ImageDraw.Draw(mask).text((px(2) - bb[0], px(2) - bb[1]), s, font=f, fill=255)
    grad = Image.new('RGB', mask.size)
    gd = ImageDraw.Draw(grad)
    for i in range(grad.width + grad.height):
        k = i / (grad.width + grad.height - 1)
        gd.line([(i, 0), (0, i)], fill=lerp(a, b, k))
    grad.putalpha(mask)
    x = px(xy[0]) if anchor[0] == 'l' else (px(xy[0]) - mask.width if anchor[0] == 'r' else px(xy[0]) - mask.width // 2)
    img.alpha_composite(grad, (x, px(xy[1]) - px(2)))


# --- «скелетон»-формы и пастельные фигуры -------------------------------------

def sk_bar(img, box, fill=SK, r=None):
    """Скелетон-строка: скруглённый прямоугольник вместо текста."""
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img, 'RGBA')
    rounded(d, box, r if r is not None else (y1 - y0) / 2, fill=fill)


def sk_lines(img, x, y, widths, h=10, gap=13, fill=SK):
    for i, w in enumerate(widths):
        sk_bar(img, [x, y + i * (h + gap), x + w, y + i * (h + gap) + h], fill=fill)
    return y + len(widths) * (h + gap) - gap


def pastel_mask(size, kind, r=0.16):
    """Силуэт пастельной фигуры в маске (255 — закрашено)."""
    w, h = size
    mask = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(mask)
    if kind == 'folder':
        tab = h * 0.32
        md.polygon([(0, tab * 0.35), (w * 0.40, tab * 0.35), (w * 0.52, tab), (0, tab)], fill=255)
        md.rounded_rectangle([0, tab * 0.72, w - 1, h - 1], radius=int(h * 0.13), fill=255)
    elif kind == 'doc':
        f = min(w, h) * 0.34
        md.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(min(w, h) * 0.16), fill=255)
        md.polygon([(w - f - 1, -1), (w, -1), (w, f - 1)], fill=0)
    elif kind == 'squircle':
        md.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(min(w, h) * r), fill=255)
    else:                                   # 'disc'
        md.ellipse([0, 0, w - 1, h - 1], fill=255)
    return mask


def pastel_shape(img, box, kind, pair, fold=True):
    """Фигура с пастельным градиентом: папка, страница файла, диск, плашка."""
    x0, y0, x1, y1 = [px(v) for v in box]
    w, h = x1 - x0, y1 - y0
    grad = Image.new('RGB', (w, h))
    gd = ImageDraw.Draw(grad)
    for i in range(w + h):
        gd.line([(i, 0), (0, i)], fill=lerp(pair[0], pair[1], i / max(1, w + h - 1)))
    grad.putalpha(pastel_mask((w, h), kind))
    img.alpha_composite(grad, (x0, y0))
    if kind == 'doc' and fold:
        f = min(w, h) * 0.34
        layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).polygon([(w - f - 1, 0), (w - 1, 0), (w - 1, f - 1)],
                                      fill=(255, 255, 255, 90))
        img.alpha_composite(layer, (x0, y0))


def pastel_glyph(img, cx, cy, s, kind, alpha=160):
    """Белый полупрозрачный значок внутри пастельной фигуры."""
    size = px(s * 2)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer, 'RGBA')
    c = size / 2
    fill = (255, 255, 255, alpha)
    lw = max(1, int(size * 0.07))
    if kind == 'lines':
        for i, k in enumerate((0.62, 0.62, 0.4)):
            y = c - size * 0.2 + i * size * 0.2
            g.rounded_rectangle([c - size * k / 2, y, c + size * k / 2, y + lw], radius=lw / 2, fill=fill)
    elif kind == 'chart':
        for i, k in enumerate((0.3, 0.5, 0.38)):
            x = c - size * 0.22 + i * size * 0.22
            g.rounded_rectangle([x, c + size * 0.24 - size * k, x + size * 0.11, c + size * 0.24],
                                radius=lw / 2, fill=fill)
    elif kind == 'image':
        g.ellipse([c - size * 0.3, c - size * 0.3, c - size * 0.12, c - size * 0.12], fill=fill)
        g.polygon([(c - size * 0.32, c + size * 0.28), (c - size * 0.02, c - size * 0.08),
                   (c + size * 0.32, c + size * 0.28)], fill=fill)
    elif kind == 'code':
        g.line([(c - size * 0.1, c - size * 0.22), (c - size * 0.3, c), (c - size * 0.1, c + size * 0.22)],
               fill=fill, width=lw, joint='curve')
        g.line([(c + size * 0.1, c - size * 0.22), (c + size * 0.3, c), (c + size * 0.1, c + size * 0.22)],
               fill=fill, width=lw, joint='curve')
    elif kind == 'play':
        g.polygon([(c - size * 0.16, c - size * 0.26), (c + size * 0.26, c),
                   (c - size * 0.16, c + size * 0.26)], fill=fill)
    elif kind == 'grid':
        for dx in (-1, 1):
            for dy in (-1, 1):
                g.rounded_rectangle([c + dx * size * 0.26 - size * 0.11,
                                     c + dy * size * 0.26 - size * 0.11,
                                     c + dx * size * 0.26 + size * 0.11,
                                     c + dy * size * 0.26 + size * 0.11],
                                    radius=lw / 2, fill=fill)
    img.alpha_composite(layer, (px(cx - s), px(cy - s)))


def person_glyph(img, cx, cy, r, alpha=170):
    """Фигурка человека внутри пастежного аватара (как в прежних макетах)."""
    size = px(r * 2)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer, 'RGBA')
    c = size / 2
    fill = (255, 255, 255, alpha)
    g.ellipse([c - size * 0.2, c - size * 0.3, c + size * 0.2, c + size * 0.1], fill=fill)
    g.rounded_rectangle([c - size * 0.32, c + size * 0.14, c + size * 0.32, c + size * 0.56],
                        radius=size * 0.2, fill=fill)
    img.alpha_composite(layer, (px(cx - r), px(cy - r)))


def dashed_round_rect(d, box, r, color, dash=8, gap=7, width=1.6):
    """Пунктирная рамка со скруглением (для «Добавить карточку»)."""
    import math
    x0, y0, x1, y1 = [px(v) for v in box]
    r = px(r)

    def seg(p, q):
        length = math.hypot(q[0] - p[0], q[1] - p[1])
        if length == 0:
            return
        t = 0.0
        while t < length:
            t2 = min(t + px(width) + dash, length)
            d.line([p[0] + (q[0] - p[0]) * t / length, p[1] + (q[1] - p[1]) * t / length,
                    p[0] + (q[0] - p[0]) * t2 / length, p[1] + (q[1] - p[1]) * t2 / length],
                   fill=color, width=px(width) * 2)
            t = t2 + gap

    (d.arc([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=color, width=int(px(width) * 2)))
    (d.arc([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=color, width=int(px(width) * 2)))
    (d.arc([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=color, width=int(px(width) * 2)))
    (d.arc([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=color, width=int(px(width) * 2)))
    seg((x0 + r, y0), (x1 - r, y0))
    seg((x1, y0 + r), (x1, y1 - r))
    seg((x1 - r, y1), (x0 + r, y1))
    seg((x0, y1 - r), (x0, y0 + r))


def pill(img, box, label, size=15, fill=CARD, outline=BORDER, color=(55, 65, 81),
         icon=None, icon_color=None, bold=True, shadow=True, radius=12, gap=24):
    if shadow:
        card(img, box, r=radius, fill=fill, outline=outline, shadow=(12, 5, 20))
    else:
        card(img, box, r=radius, fill=fill, outline=outline)
    d = ImageDraw.Draw(img, 'RGBA')
    cy = (box[1] + box[3]) / 2
    tx = box[0] + 18
    if icon:
        icon(d, box[0] + 22, cy, 19, icon_color or color)
        tx = box[0] + 42
    text(d, (tx, cy), label, size, color, bold=bold, anchor='lm')
    return tx + text_w(label, size, bold) + gap


def stat_chip(img, x, cy, label, icon=None):
    """Чип-плашка со статистикой («Колонок: 3», «Карточек: 7»)."""
    d = ImageDraw.Draw(img, 'RGBA')
    w = text_w(label, 13.5, True) + (38 if icon else 26)
    card(img, [x, cy - 13, x + w, cy + 13], r=13, fill=(238, 241, 248), shadow=False)
    if icon:
        icon(d, x + 17, cy, 15, (100, 116, 139))
        text(d, (x + 30, cy), label, 13.5, (100, 116, 139), bold=True, anchor='lm')
    else:
        text(d, (x + 13, cy), label, 13.5, (100, 116, 139), bold=True, anchor='lm')
    return x + w + 8


# --- иконки (контурные, как в lucide-наборе клиента) --------------------------

def _lw(w):
    return max(1, int(round(w * S)))


def ic_envelope(d, cx, cy, s, color, w=1.7):
    rounded(d, [cx - s * 0.46, cy - s * 0.32, cx + s * 0.46, cy + s * 0.32], s * 0.14,
            outline=color, width=w)
    d.line([px(cx - s * 0.4), px(cy - s * 0.24), px(cx), px(cy + s * 0.06)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.4), px(cy - s * 0.24), px(cx), px(cy + s * 0.06)], fill=color, width=_lw(w))


def ic_pencil(d, cx, cy, s, color, w=1.7):
    """Карандаш в квадрате — как «Edit» (square-pen) из lucide в клиенте."""
    rounded(d, [cx - s * 0.46, cy - s * 0.46, cx + s * 0.34, cy + s * 0.46], s * 0.16,
            outline=color, width=w)
    # карандаш поверх правого верхнего угла: корпус, грифель, торец
    d.line([px(cx + s * 0.02), px(cy + s * 0.22), px(cx + s * 0.4), px(cy - s * 0.16)],
           fill=color, width=_lw(w))
    d.line([px(cx + s * 0.24), px(cy + s * 0.42), px(cx + s * 0.62), px(cy + s * 0.04)],
           fill=color, width=_lw(w))
    d.line([px(cx + s * 0.4), px(cy - s * 0.16), px(cx + s * 0.62), px(cy + s * 0.04)],
           fill=color, width=_lw(w))
    d.line([px(cx + s * 0.02), px(cy + s * 0.22), px(cx + s * 0.24), px(cy + s * 0.42)],
           fill=color, width=_lw(w))


def ic_hard_drive(d, cx, cy, s, color, w=1.7):
    """Жёсткий диск — «Диск» в сайдбаре клиента (lucide HardDrive)."""
    pts = [(cx - s * 0.26, cy - s * 0.34), (cx + s * 0.26, cy - s * 0.34),
           (cx + s * 0.5, cy + s * 0.04), (cx + s * 0.5, cy + s * 0.34),
           (cx - s * 0.5, cy + s * 0.34), (cx - s * 0.5, cy + s * 0.04)]
    p = [(px(a), px(b)) for a, b in pts]
    d.line(p + [p[0]], fill=color, width=_lw(w), joint='curve')
    d.line([px(cx - s * 0.5), px(cy + s * 0.04), px(cx + s * 0.5), px(cy + s * 0.04)],
           fill=color, width=_lw(w))
    for dx in (-0.34, -0.14):
        d.line([px(cx + s * dx), px(cy + s * 0.18), px(cx + s * dx), px(cy + s * 0.24)],
               fill=color, width=_lw(w))


def ic_folder_open(d, cx, cy, s, color, w=1.7, fill=None):
    """Открытая папка — кнопка «Назад» в диске (lucide FolderOpen)."""
    back = [(cx - s * 0.48, cy + s * 0.4), (cx - s * 0.48, cy - s * 0.34),
            (cx - s * 0.12, cy - s * 0.34), (cx + s * 0.02, cy - s * 0.16),
            (cx + s * 0.44, cy - s * 0.16)]
    front = [(cx - s * 0.48, cy + s * 0.4), (cx - s * 0.3, cy - s * 0.02),
             (cx + s * 0.52, cy - s * 0.02), (cx + s * 0.44, cy + s * 0.4)]
    if fill:
        d.polygon([(px(a), px(b)) for a, b in back + front[1:]], fill=fill)
    d.line([(px(a), px(b)) for a, b in back], fill=color, width=_lw(w), joint='curve')
    d.line([(px(a), px(b)) for a, b in front] + [(px(front[0][0]), px(front[0][1]))],
           fill=color, width=_lw(w), joint='curve')


def ic_inbox(d, cx, cy, s, color, w=1.7):
    rounded(d, [cx - s * 0.46, cy - s * 0.46, cx + s * 0.46, cy + s * 0.46], s * 0.16,
            outline=color, width=w)
    y = cy + s * 0.04
    d.line([px(cx - s * 0.46), px(y), px(cx - s * 0.2), px(y)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.2), px(y), px(cx - s * 0.06), px(y + s * 0.18)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.06), px(y + s * 0.18), px(cx + s * 0.06), px(y + s * 0.18)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.06), px(y + s * 0.18), px(cx + s * 0.2), px(y)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.2), px(y), px(cx + s * 0.46), px(y)], fill=color, width=_lw(w))


def ic_send(d, cx, cy, s, color, w=1.7):
    """Бумажный самолётик (как lucide «send»): контур с «вырезом» и линией сгиба."""
    tip = (cx + s * 0.48, cy - s * 0.48)
    low = (cx + s * 0.14, cy + s * 0.48)
    notch = (cx - s * 0.06, cy + s * 0.06)
    back = (cx - s * 0.48, cy - s * 0.48)
    d.polygon([(px(tip[0]), px(tip[1])), (px(low[0]), px(low[1])),
               (px(notch[0]), px(notch[1])), (px(back[0]), px(back[1]))],
              outline=color, width=_lw(w))
    d.line([px(notch[0]), px(notch[1]), px(tip[0]), px(tip[1])], fill=color, width=_lw(w))


def ic_trash(d, cx, cy, s, color, w=1.7):
    d.line([px(cx - s * 0.42), px(cy - s * 0.3), px(cx + s * 0.42), px(cy - s * 0.3)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.16), px(cy - s * 0.42), px(cx + s * 0.16), px(cy - s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.32), px(cy - s * 0.3), px(cx - s * 0.26), px(cy + s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.32), px(cy - s * 0.3), px(cx + s * 0.26), px(cy + s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.26), px(cy + s * 0.42), px(cx + s * 0.26), px(cy + s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx), px(cy - s * 0.2), px(cx), px(cy + s * 0.32)], fill=color, width=_lw(w))


def _cloud_shape(d, cx, cy, s, color):
    """Силуэт облака: три круга + общая база."""
    d.ellipse([px(cx - s * 0.48), px(cy - s * 0.14), px(cx - s * 0.02), px(cy + s * 0.32)], fill=color)
    d.ellipse([px(cx - s * 0.24), px(cy - s * 0.46), px(cx + s * 0.26), px(cy + s * 0.32)], fill=color)
    d.ellipse([px(cx + s * 0.06), px(cy - s * 0.2), px(cx + s * 0.5), px(cy + s * 0.32)], fill=color)
    d.rectangle([px(cx - s * 0.46), px(cy + s * 0.04), px(cx + s * 0.48), px(cy + s * 0.32)], fill=color)


def _cloud_shape(d, cx, cy, s, color, inset=0.0):
    """Силуэт облака: три круга + общая база. inset — равномерный отступ внутрь,
    им рисуется белая «сердцевина», чтобы получился контур одинаковой толщины."""
    t = inset
    d.ellipse([px(cx - s * 0.48 + t), px(cy - s * 0.14 + t), px(cx - s * 0.02 - t), px(cy + s * 0.34 - t)],
              fill=color)
    d.ellipse([px(cx - s * 0.24 + t), px(cy - s * 0.46 + t), px(cx + s * 0.26 - t), px(cy + s * 0.34 - t)],
              fill=color)
    d.ellipse([px(cx + s * 0.06 + t), px(cy - s * 0.2 + t), px(cx + s * 0.5 - t), px(cy + s * 0.34 - t)],
              fill=color)
    d.rectangle([px(cx - s * 0.46 + t), px(cy + s * 0.04 + t), px(cx + s * 0.48 - t), px(cy + s * 0.34 - t)],
                fill=color)


def ic_cloud(d, cx, cy, s, color, w=1.7, fill=None):
    if fill is not None:
        _cloud_shape(d, cx, cy, s, fill)
        return
    _cloud_shape(d, cx, cy, s, color)
    _cloud_shape(d, cx, cy, s, (255, 255, 255), inset=w * 1.0)


def ic_check_square(d, cx, cy, s, color, w=1.7):
    rounded(d, [cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2], s * 0.22, outline=color, width=w)
    d.line([px(cx - s * 0.26), px(cy + s * 0.02), px(cx - s * 0.06), px(cy + s * 0.24)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.06), px(cy + s * 0.24), px(cx + s * 0.28), px(cy - s * 0.22)], fill=color, width=_lw(w))


def ic_gear(d, cx, cy, s, color, w=1.7):
    """Шестерёнка: зубчатый силуэт (8 зубцов) с отверстием в центре."""
    import math
    R, r_in, hole = s * 0.5, s * 0.33, s * 0.13
    pts = []
    for i in range(8):
        a0 = math.radians(i * 45)
        for da, rr in ((-11, R), (11, R), (17, r_in), (28, r_in)):
            a = a0 + math.radians(da)
            pts.append((px(cx + math.cos(a) * rr), px(cy + math.sin(a) * rr)))
    d.polygon(pts, outline=color, width=_lw(w))
    d.ellipse([px(cx - hole), px(cy - hole), px(cx + hole), px(cy + hole)],
              outline=color, width=_lw(w))


def ic_search(d, cx, cy, s, color, w=1.7):
    r = s * 0.32
    d.ellipse([px(cx - r), px(cy - r), px(cx + r), px(cy + r)], outline=color, width=_lw(w))
    d.line([px(cx + r * 0.7), px(cy + r * 0.7), px(cx + s * 0.46), px(cy + s * 0.46)], fill=color, width=_lw(w))


def ic_funnel(d, cx, cy, s, color, w=1.7):
    d.line([px(cx - s * 0.42), px(cy - s * 0.34), px(cx + s * 0.42), px(cy - s * 0.34)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.42), px(cy - s * 0.34), px(cx - s * 0.12), px(cy + s * 0.06)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.42), px(cy - s * 0.34), px(cx + s * 0.12), px(cy + s * 0.06)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.12), px(cy + s * 0.06), px(cx - s * 0.12), px(cy + s * 0.4)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.12), px(cy + s * 0.06), px(cx + s * 0.12), px(cy + s * 0.4)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.12), px(cy + s * 0.4), px(cx + s * 0.12), px(cy + s * 0.4)], fill=color, width=_lw(w))


def ic_star(d, cx, cy, s, color, w=1.5, fill=None):
    import math
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        r = s * (0.5 if i % 2 == 0 else 0.21)
        pts.append((px(cx + math.cos(a) * r), px(cy + math.sin(a) * r)))
    d.polygon(pts, fill=fill, outline=color, width=_lw(w))


def ic_list(d, cx, cy, s, color, w=1.7):
    for i in (-1, 0, 1):
        y = cy + i * s * 0.28
        d.line([px(cx - s * 0.42), px(y), px(cx + s * 0.42), px(y)], fill=color, width=_lw(w))
        d.ellipse([px(cx - s * 0.5 - 1), px(y - s * 0.05), px(cx - s * 0.5 + 3), px(y + s * 0.05)], fill=color)


def ic_plus(d, cx, cy, s, color, w=1.8):
    d.line([px(cx - s * 0.42), px(cy), px(cx + s * 0.42), px(cy)], fill=color, width=_lw(w))
    d.line([px(cx), px(cy - s * 0.42), px(cx), px(cy + s * 0.42)], fill=color, width=_lw(w))


def ic_refresh(d, cx, cy, s, color, w=1.7):
    d.arc([px(cx - s * 0.42), px(cy - s * 0.42), px(cx + s * 0.42), px(cy + s * 0.42)],
          start=40, end=330, fill=color, width=_lw(w))
    d.polygon([(px(cx + s * 0.18), px(cy - s * 0.5)), (px(cx + s * 0.56), px(cy - s * 0.3)),
               (px(cx + s * 0.2), px(cy - s * 0.12))], fill=color)


def ic_upload(d, cx, cy, s, color, w=1.8):
    d.line([px(cx), px(cy - s * 0.44), px(cx), px(cy + s * 0.12)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.24), px(cy - s * 0.2), px(cx), px(cy - s * 0.44)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.24), px(cy - s * 0.2), px(cx), px(cy - s * 0.44)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.42), px(cy + s * 0.36), px(cx + s * 0.42), px(cy + s * 0.36)], fill=color, width=_lw(w))


def ic_download(d, cx, cy, s, color, w=1.8):
    d.line([px(cx), px(cy - s * 0.12), px(cx), px(cy + s * 0.44)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.24), px(cy + s * 0.2), px(cx), px(cy + s * 0.44)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.24), px(cy + s * 0.2), px(cx), px(cy + s * 0.44)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.42), px(cy - s * 0.36), px(cx + s * 0.42), px(cy - s * 0.36)], fill=color, width=_lw(w))


def ic_folder(d, cx, cy, s, color, w=1.7, fill=None):
    """Папка с язычком — как «folder» в lucide-наборе клиента."""
    x0, x1 = cx - s * 0.5, cx + s * 0.5
    ytop, ybot = cy - s * 0.32, cy + s * 0.36
    back = [(x0, ybot), (x0, ytop), (x0 + s * 0.34, ytop),
            (x0 + s * 0.46, ytop + s * 0.18), (x1, ytop + s * 0.18), (x1, ybot)]
    pts = [(px(a), px(b)) for a, b in back]
    if fill:
        d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=color, width=_lw(w), joint='curve')


def ic_logout(d, cx, cy, s, color, w=1.7):
    d.line([px(cx - s * 0.14), px(cy - s * 0.42), px(cx - s * 0.44), px(cy - s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.44), px(cy - s * 0.42), px(cx - s * 0.44), px(cy + s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.44), px(cy + s * 0.42), px(cx - s * 0.14), px(cy + s * 0.42)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.06), px(cy), px(cx + s * 0.44), px(cy)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.2), px(cy - s * 0.22), px(cx + s * 0.44), px(cy)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.2), px(cy + s * 0.22), px(cx + s * 0.44), px(cy)], fill=color, width=_lw(w))


def ic_calendar(d, cx, cy, s, color, w=1.6):
    rounded(d, [cx - s * 0.42, cy - s * 0.34, cx + s * 0.42, cy + s * 0.42], s * 0.14,
            outline=color, width=w)
    d.line([px(cx - s * 0.42), px(cy - s * 0.1), px(cx + s * 0.42), px(cy - s * 0.1)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.2), px(cy - s * 0.5), px(cx - s * 0.2), px(cy - s * 0.24)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.2), px(cy - s * 0.5), px(cx + s * 0.2), px(cy - s * 0.24)], fill=color, width=_lw(w))


def ic_users(d, cx, cy, s, color, w=1.6):
    d.ellipse([px(cx - s * 0.34), px(cy - s * 0.44), px(cx - s * 0.02), px(cy - s * 0.12)],
              outline=color, width=_lw(w))
    d.arc([px(cx - s * 0.46), px(cy - s * 0.08), px(cx + s * 0.1), px(cy + s * 0.44)],
          start=180, end=360, fill=color, width=_lw(w))
    d.ellipse([px(cx + s * 0.04), px(cy - s * 0.36), px(cx + s * 0.32), px(cy - s * 0.08)],
              outline=color, width=_lw(w))
    d.arc([px(cx + s * 0.02), px(cy - s * 0.02), px(cx + s * 0.5), px(cy + s * 0.42)],
          start=200, end=340, fill=color, width=_lw(w))


def ic_archive(d, cx, cy, s, color, w=1.6):
    rounded(d, [cx - s * 0.44, cy - s * 0.42, cx + s * 0.44, cy - s * 0.14], s * 0.08,
            outline=color, width=w)
    rounded(d, [cx - s * 0.38, cy - s * 0.14, cx + s * 0.38, cy + s * 0.42], s * 0.08,
            outline=color, width=w)
    d.line([px(cx - s * 0.16), px(cy + s * 0.06), px(cx + s * 0.16), px(cy + s * 0.06)], fill=color, width=_lw(w))


def ic_chevron(d, cx, cy, s, color, w=1.8, down=True):
    k = 1 if down else -1
    d.line([px(cx - s * 0.28), px(cy - k * s * 0.14), px(cx), px(cy + k * s * 0.14)], fill=color, width=_lw(w))
    d.line([px(cx), px(cy + k * s * 0.14), px(cx + s * 0.28), px(cy - k * s * 0.14)], fill=color, width=_lw(w))


def ic_check(d, cx, cy, s, color, w=2.0):
    d.line([px(cx - s * 0.3), px(cy + s * 0.02), px(cx - s * 0.06), px(cy + s * 0.26)], fill=color, width=_lw(w))
    d.line([px(cx - s * 0.06), px(cy + s * 0.26), px(cx + s * 0.32), px(cy - s * 0.26)], fill=color, width=_lw(w))


def ic_circle(d, cx, cy, s, color, w=1.7):
    d.ellipse([px(cx - s * 0.42), px(cy - s * 0.42), px(cx + s * 0.42), px(cy + s * 0.42)],
              outline=color, width=_lw(w))


def stat_chip(img, x, cy, label, icon=None):
    """Чип-плашка со статистикой («Колонок: 3», «Карточек: 7»)."""
    d = ImageDraw.Draw(img, 'RGBA')
    w = text_w(label, 13.5, True) + (38 if icon else 26)
    card(img, [x, cy - 13, x + w, cy + 13], r=13, fill=(238, 241, 248),
         outline=(238, 241, 248), shadow=False)
    if icon:
        icon(d, x + 17, cy, 15, (100, 116, 139))
        text(d, (x + 30, cy), label, 13.5, (100, 116, 139), bold=True, anchor='lm')
    else:
        text(d, (x + 13, cy), label, 13.5, (100, 116, 139), bold=True, anchor='lm')
    return x + w + 8


def ic_dots(d, cx, cy, s, color, w=1.6):
    for i in (-1, 0, 1):
        d.ellipse([px(cx + i * s * 0.24 - 2), px(cy - 2), px(cx + i * s * 0.24 + 2), px(cy + 2)], fill=color)


def ic_hamburger(d, cx, cy, s, color, w=1.8):
    for i in (-1, 0, 1):
        d.line([px(cx - s * 0.5), px(cy + i * s * 0.3), px(cx + s * 0.5), px(cy + i * s * 0.3)],
               fill=color, width=_lw(w))


def ic_cross(d, cx, cy, s, color, w=1.8):
    d.line([px(cx - s * 0.34), px(cy - s * 0.34), px(cx + s * 0.34), px(cy + s * 0.34)], fill=color, width=_lw(w))
    d.line([px(cx + s * 0.34), px(cy - s * 0.34), px(cx - s * 0.34), px(cy + s * 0.34)], fill=color, width=_lw(w))


def ic_image(d, cx, cy, s, color, w=1.6):
    rounded(d, [cx - s * 0.44, cy - s * 0.34, cx + s * 0.44, cy + s * 0.34], s * 0.1,
            outline=color, width=w)
    d.ellipse([px(cx - s * 0.24), px(cy - s * 0.2), px(cx - s * 0.06), px(cy - s * 0.02)], fill=color)
    d.polygon([(px(cx - s * 0.36), px(cy + s * 0.28)), (px(cx - s * 0.04), px(cy - s * 0.06)),
               (px(cx + s * 0.14), px(cy + s * 0.12)), (px(cx + s * 0.28), px(cy - s * 0.02)),
               (px(cx + s * 0.4), px(cy + s * 0.28))], fill=color)


# --- сайдбар ------------------------------------------------------------------

# --- сайдбар и шапка ----------------------------------------------------------

def draw_sidebar(img, active):
    d = ImageDraw.Draw(img, 'RGBA')
    d.rectangle([0, 0, px(SIDEBAR), px(H)], fill=CARD)
    d.line([px(SIDEBAR), 0, px(SIDEBAR), px(H)], fill=BORDER, width=_lw(1))
    text(d, (26, 26), 'SuperApp', 17, TEXT, bold=True)
    ic_hamburger(d, SIDEBAR - 34, 35, 20, (55, 65, 81))

    rows = [
        ('mail', 'Почта', ic_envelope, 2),
        ('drive', 'Диск', ic_hard_drive, 0),
        ('tasks', 'Задачи', ic_check_square, 0),
    ]
    y = 84
    sub_y = None
    for key, label, icon, badge in rows:
        on = (key == active)
        if on:
            gradient_fill(img, [16, y, SIDEBAR - 16, y + 44], 12,
                          (238, 240, 255), (243, 236, 255))
        icon(d, 44, y + 22, 20, PRIMARY_DARK if on else (55, 65, 81))
        text(d, (70, y + 13), label, 15.5, PRIMARY_DARK if on else TEXT, bold=on)
        if badge:
            pastel_shape(img, [SIDEBAR - 58, y + 11, SIDEBAR - 34, y + 35], 'disc',
                         PASTELS['indigo'], fold=False)
            text(d, (SIDEBAR - 46, y + 23), str(badge), 12, (255, 255, 255), bold=True, anchor='mm')
        y += 50

        if key == 'mail':
            sub_y = y                      # карточка подменю сразу под «Почтой»
            break

    # подменю почты — отдельная «стеклянная» карточка
    sub_items = [
        ('Написать письмо', ic_pencil, False, 0),
        ('Входящие', ic_inbox, True, 2),
        ('Отправленные', ic_send, False, 0),
        ('Корзина', ic_trash, False, 0),
    ]
    card_h = 12 + len(sub_items) * 44 + 4
    card(img, [16, sub_y, SIDEBAR - 16, sub_y + card_h], r=16, shadow=(14, 6, 26))
    yy = sub_y + 10
    for label, icon, on, badge in sub_items:
        icon(d, 44, yy + 20, 19, PRIMARY_DARK if on else (75, 85, 99))
        text(d, (70, yy + 11), label, 14.5, PRIMARY_DARK if on else TEXT, bold=on)
        if badge:
            pastel_shape(img, [SIDEBAR - 58, yy + 9, SIDEBAR - 34, yy + 33], 'disc',
                         PASTELS['indigo'], fold=False)
            text(d, (SIDEBAR - 46, yy + 21), str(badge), 12, (255, 255, 255), bold=True, anchor='mm')
        yy += 44

    # «Диск» и «Задачи» — ниже карточки подменю
    y = sub_y + card_h + 10
    for key, label, icon, badge in rows[1:]:
        on = (key == active)
        if on:
            gradient_fill(img, [16, y, SIDEBAR - 16, y + 44], 12,
                          (238, 240, 255), (243, 236, 255))
        icon(d, 44, y + 22, 20, PRIMARY_DARK if on else (55, 65, 81))
        text(d, (70, y + 13), label, 15.5, PRIMARY_DARK if on else TEXT, bold=on)
        y += 50

    # Настройки внизу
    icy = H - 52
    ic_gear(d, 44, icy + 20, 20, TEXT_MUTED)
    text(d, (70, icy + 11), 'Настройки', 15.5, TEXT)


RAIL = 64                  # свёрнутый сайдбар: только иконки


def draw_rail(img, active):
    """Свёрнутый сайдбар — как в приложении при свёрнутом меню."""
    d = ImageDraw.Draw(img, 'RGBA')
    d.rectangle([0, 0, px(RAIL), px(H)], fill=CARD)
    d.line([px(RAIL), 0, px(RAIL), px(H)], fill=BORDER, width=_lw(1))

    # кнопка «развернуть» — там же, где в приложении
    card(img, [14, 22, 50, 58], r=12, shadow=(10, 4, 14))
    ic_chevron(d, 32, 40, 16, (75, 85, 99), w=1.9, down=False)

    groups = [
        [('mail', ic_envelope, 2), ('compose', ic_pencil, 0), ('inbox', ic_inbox, 2),
         ('sent', ic_send, 0), ('trash', ic_trash, 0)],
        [('drive', ic_hard_drive, 0), ('tasks', ic_check_square, 0)],
    ]
    y = 96
    for gi, group in enumerate(groups):
        if gi:
            d.line([px(20), px(y - 20), px(RAIL - 20), px(y - 20)],
                   fill=(240, 243, 250), width=_lw(1))
        for key, icon, badge in group:
            on = (key == active)
            if on:
                gradient_fill(img, [12, y - 6, RAIL - 12, y + 46], 13,
                              (238, 240, 255), (243, 236, 255))
            icon(d, 32, y + 20, 21, PRIMARY_DARK if on else (85, 95, 115))
            if badge:
                pastel_shape(img, [38, y + 1, 60, y + 23], 'disc', PASTELS['indigo'], fold=False)
                text(d, (49, y + 12), str(badge), 11.5, (255, 255, 255), bold=True, anchor='mm')
            y += 50

    ic_gear(d, 32, H - 32, 21, TEXT_MUTED)


def screen_head(img, title, x0=None, cloud=False):
    d = ImageDraw.Draw(img, 'RGBA')
    x = (SIDEBAR + 25) if x0 is None else x0
    if cloud:
        ic_cloud(d, x + 16, 44, 30, (129, 140, 248), w=2.2, fill=(165, 180, 252))
        x += 40
    gradient_text(img, (x, 26), title, 30, PRIMARY, VIOLET)
    card(img, [W - 130, 24, W - 25, 68], r=12, shadow=(10, 4, 18))
    ic_logout(d, W - 108, 46, 18, (55, 65, 81))
    text(d, (W - 94, 37), 'Выйти', 15, (55, 65, 81), bold=True)


def hairline(img, x0, x1, y):
    ImageDraw.Draw(img, 'RGBA').line([px(x0), px(y), px(x1), px(y)],
                                     fill=(238, 241, 248), width=_lw(1))


# --- кадр «Почта» -------------------------------------------------------------

def draw_mail():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_sidebar(img, 'mail')
    screen_head(img, 'Почта')

    x0 = SIDEBAR + 25
    list_w = 640
    # тулбар: поиск, фильтр, избранное
    card(img, [x0, 88, x0 + list_w, 136], r=24, shadow=(14, 6, 22))
    ic_search(d, x0 + 32, 112, 19, (156, 163, 175))
    text(d, (x0 + 56, 112), 'Поиск писем...', 15, TEXT_SOFT, anchor='lm')
    for bx, ic in ((x0 + list_w + 16, ic_funnel), (x0 + list_w + 76, ic_star)):
        card(img, [bx, 88, bx + 48, 136], r=24, shadow=(12, 5, 20))
        ic(d, bx + 24, 112, 20, (107, 114, 128))

    # список писем
    card(img, [x0, 152, x0 + list_w, H - 25], r=18, shadow=(16, 7, 24))
    rows = [
        ('indigo', True, True),
        ('teal', True, False),
        ('amber', False, False),
        ('violet', False, True),
        ('rose', False, False),
        ('blue', False, False),
    ]
    ry = 168
    for i, (key, unread, starred) in enumerate(rows):
        if i:
            hairline(img, x0 + 20, x0 + list_w - 20, ry - 8)
        if unread:
            gradient_fill(img, [x0, ry, x0 + list_w, ry + 96], 0, (250, 251, 255), (253, 250, 255))
        pastel_shape(img, [x0 + 26, ry + 22, x0 + 82, ry + 78], 'disc', PASTELS[key], fold=False)
        person_glyph(img, x0 + 54, ry + 50, 20)
        ic_star(d, x0 + 104, ry + 50, 18,
                (250, 204, 21) if starred else (214, 220, 232),
                fill=(253, 224, 71) if starred else None)
        sk_bar(img, [x0 + 132, ry + 26, x0 + 132 + (270 if unread else 250), ry + 38],
               fill=SK_DARK if unread else SK)
        sk_bar(img, [x0 + 132, ry + 48, x0 + 132 + (330 if unread else 300), ry + 60],
               fill=SK_DARK if unread else SK)
        sk_bar(img, [x0 + 132, ry + 70, x0 + 132 + 200, ry + 78], fill=SK_SOFT, r=4)
        sk_bar(img, [x0 + list_w - 78, ry + 30, x0 + list_w - 28, ry + 38], fill=SK_SOFT, r=4)
        if unread:
            pastel_shape(img, [x0 + list_w - 54, ry + 52, x0 + list_w - 42, ry + 64],
                         'disc', PASTELS['indigo'], fold=False)
        ry += 104

    # панель чтения письма
    rx0 = x0 + list_w + 24
    card(img, [rx0, 152, W - 25, H - 25], r=18, shadow=(16, 7, 24))
    pastel_shape(img, [rx0 + 34, 194, rx0 + 102, 262], 'disc', PASTELS['violet'], fold=False)
    person_glyph(img, rx0 + 68, 228, 28)
    sk_bar(img, [rx0 + 120, 208, rx0 + 214, 222], fill=SK_DARK, r=7)
    sk_bar(img, [rx0 + 120, 232, rx0 + 186, 242], fill=SK, r=5)
    for bx, ic, fill in ((W - 216, ic_send, None), (W - 168, ic_archive, None), (W - 120, ic_dots, None)):
        card(img, [bx, 194, bx + 40, 234], r=12, shadow=(10, 4, 16))
        ic(d, bx + 20, 214, 17, (107, 114, 128))
    hairline(img, rx0 + 34, W - 59, 288)
    yy = 312
    for w in (352, 352, 352, 300, 352, 196):
        sk_bar(img, [rx0 + 34, yy, rx0 + 34 + w, yy + 11])
        yy += 27
    # карточка вложения
    card(img, [rx0 + 34, 512, rx0 + 373, 592], r=16, fill=(250, 251, 255),
         outline=(236, 240, 248), shadow=False)
    pastel_shape(img, [rx0 + 52, 528, rx0 + 108, 576], 'squircle', PASTELS['blue'], fold=False)
    pastel_glyph(img, rx0 + 80, 552, 16, 'lines')
    sk_bar(img, [rx0 + 124, 538, rx0 + 320, 550], fill=SK_DARK)
    sk_bar(img, [rx0 + 124, 558, rx0 + 250, 568], fill=SK)
    return img


# --- кадр «Диск» --------------------------------------------------------------

def folder_graphic(img, cx, cy, w, h, key):
    """Папка с язычком и насыщенным градиентом — как в прежних макетах диска."""
    pair = PASTELS[key]
    x0, y0 = cx - w / 2, cy - h / 2
    tab_h, tab_w = h * 0.26, w * 0.46
    body_top = y0 + h * 0.2
    # язычок
    layer = Image.new('RGBA', (px(w), px(tab_h + 2)), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer)
    g.rounded_rectangle([0, 0, px(tab_w), px(tab_h)], radius=px(tab_h * 0.35),
                        fill=lerp(pair[0], (255, 255, 255), 0.05))
    img.alpha_composite(layer, (px(x0), px(y0)))
    # корпус с градиентом
    bx0, by0, bx1, by1 = px(x0), px(body_top), px(x0 + w), px(y0 + h)
    gg = Image.new('RGB', (bx1 - bx0, by1 - by0))
    gd = ImageDraw.Draw(gg)
    for i in range(gg.width + gg.height):
        gd.line([(i, 0), (0, i)],
                fill=lerp(pair[0], pair[1], i / max(1, gg.width + gg.height - 1)))
    mask = Image.new('L', gg.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, gg.width - 1, gg.height - 1],
                                           radius=px(h * 0.13), fill=255)
    gg.putalpha(mask)
    img.alpha_composite(gg, (bx0, by0))
    # блик сверху и мягкий «карман» снизу
    hl = Image.new('RGBA', (bx1 - bx0, by1 - by0), (0, 0, 0, 0))
    ImageDraw.Draw(hl).polygon([(0, 0), (bx1 - bx0, 0),
                                (bx1 - bx0, (by1 - by0) * 0.24), (0, (by1 - by0) * 0.14)],
                               fill=(255, 255, 255, 46))
    hl.putalpha(Image.composite(hl.getchannel('A'), Image.new('L', hl.size, 0), mask))
    img.alpha_composite(hl, (bx0, by0))


def page_graphic(img, cx, cy, w, h, key, glyph, alpha=205):
    """Страница файла с загнутым углом и белым значком типа."""
    pair = PASTELS[key]
    x0, y0 = cx - w / 2, cy - h / 2
    fold = min(w, h) * 0.34
    x0p, y0p, x1p, y1p = px(x0), px(y0), px(x0 + w), px(y0 + h)
    gg = Image.new('RGB', (x1p - x0p, y1p - y0p))
    gd = ImageDraw.Draw(gg)
    for i in range(gg.width + gg.height):
        gd.line([(i, 0), (0, i)],
                fill=lerp(pair[0], pair[1], i / max(1, gg.width + gg.height - 1)))
    mask = Image.new('L', gg.size, 0)
    md = ImageDraw.Draw(mask)
    fd = px(fold)
    md.rounded_rectangle([0, 0, gg.width - 1, gg.height - 1], radius=px(w * 0.16), fill=255)
    md.polygon([(gg.width - fd - 1, -1), (gg.width, -1), (gg.width, fd - 1)], fill=0)
    gg.putalpha(mask)
    img.alpha_composite(gg, (x0p, y0p))
    # загнутый уголок
    fl = Image.new('RGBA', (fd + 2, fd + 2), (0, 0, 0, 0))
    ImageDraw.Draw(fl).polygon([(0, 0), (fd, fd), (0, fd)], fill=(255, 255, 255, 110))
    img.alpha_composite(fl, (x1p - fd, y0p))
    if glyph == 'pdf':
        text(ImageDraw.Draw(img, 'RGBA'), (cx, cy + h * 0.05), 'PDF', max(11, w * 0.2),
             (255, 255, 255), bold=True, anchor='mm')
    else:
        doc_glyph(img, cx, cy + h * 0.04, w * 0.34, glyph, alpha)


def doc_glyph(img, cx, cy, s, kind, alpha=205):
    """Белый значок типа файла (как в прежних макетах диска)."""
    size = px(s * 2)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(layer, 'RGBA')
    c = size / 2
    fill = (255, 255, 255, alpha)
    lw = max(1, int(size * 0.075))
    if kind == 'image':
        g.ellipse([c - size * 0.3, c - size * 0.3, c - size * 0.12, c - size * 0.12], fill=fill)
        g.polygon([(c - size * 0.34, c + size * 0.28), (c - size * 0.02, c - size * 0.1),
                   (c + size * 0.34, c + size * 0.28)], fill=fill)
    elif kind == 'grid':
        for dx in (-1, 1):
            for dy in (-1, 1):
                g.rounded_rectangle([c + dx * size * 0.26 - size * 0.1,
                                     c + dy * size * 0.26 - size * 0.1,
                                     c + dx * size * 0.26 + size * 0.1,
                                     c + dy * size * 0.26 + size * 0.1],
                                    radius=lw / 2, fill=fill)
    elif kind == 'pie':
        g.pieslice([c - size * 0.32, c - size * 0.32, c + size * 0.32, c + size * 0.32],
                   120, 60, fill=fill)
        g.pieslice([c - size * 0.32, c - size * 0.32, c + size * 0.32, c + size * 0.32],
                   300, 420, fill=fill)
    elif kind == 'lines':
        for i, k in enumerate((0.62, 0.62, 0.42)):
            y = c - size * 0.2 + i * size * 0.2
            g.rounded_rectangle([c - size * k / 2, y, c + size * k / 2, y + lw],
                                radius=lw / 2, fill=fill)
    elif kind == 'music':
        g.ellipse([c - size * 0.3, c + size * 0.14, c - size * 0.08, c + size * 0.32], fill=fill)
        g.ellipse([c + size * 0.06, c + size * 0.02, c + size * 0.28, c + size * 0.2], fill=fill)
        g.line([(c - size * 0.1, c + size * 0.22), (c - size * 0.1, c - size * 0.3)], fill=fill, width=lw)
        g.line([(c + size * 0.26, c + size * 0.1), (c + size * 0.26, c - size * 0.34)], fill=fill, width=lw)
        g.line([(c - size * 0.1, c - size * 0.3), (c + size * 0.26, c - size * 0.34)], fill=fill, width=lw)
    elif kind == 'play':
        g.polygon([(c - size * 0.18, c - size * 0.3), (c + size * 0.3, c),
                   (c - size * 0.18, c + size * 0.3)], fill=fill)
    elif kind == 'pdf':
        g.text((c, c), 'PDF', font=font(size * 0.4, True), fill=fill, anchor='mm')
    elif kind == 'code':
        g.line([(c - size * 0.08, c - size * 0.24), (c - size * 0.3, c), (c - size * 0.08, c + size * 0.24)],
               fill=fill, width=lw, joint='curve')
        g.line([(c + size * 0.08, c - size * 0.24), (c + size * 0.3, c), (c + size * 0.08, c + size * 0.24)],
               fill=fill, width=lw, joint='curve')
    elif kind == 'diamond':
        g.polygon([(c, c - size * 0.34), (c + size * 0.32, c), (c, c + size * 0.34),
                   (c - size * 0.32, c)], outline=fill, width=lw)
        g.polygon([(c, c - size * 0.16), (c + size * 0.15, c), (c, c + size * 0.16),
                   (c - size * 0.15, c)], fill=fill)
    elif kind == 'network':
        pts = [(c - size * 0.28, c + size * 0.24), (c, c - size * 0.3), (c + size * 0.3, c + size * 0.18)]
        for a, b in ((0, 1), (1, 2), (0, 2)):
            g.line([pts[a], pts[b]], fill=fill, width=lw)
        for x, y in pts:
            g.ellipse([x - size * 0.09, y - size * 0.09, x + size * 0.09, y + size * 0.09],
                      fill=(255, 255, 255, alpha))
    elif kind == 'pen':
        g.polygon([(c, c - size * 0.34), (c + size * 0.22, c + size * 0.28),
                   (c - size * 0.22, c + size * 0.28)], fill=fill)
        g.ellipse([c - size * 0.07, c + size * 0.02, c + size * 0.07, c + size * 0.16],
                  fill=(255, 255, 255, alpha))
        g.line([(c, c + size * 0.16), (c, c + size * 0.32)], fill=fill, width=lw)
    img.alpha_composite(layer, (px(cx - s), px(cy - s)))


def draw_drive():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_rail(img, 'drive')
    x0 = RAIL + 24
    screen_head(img, 'Сетевой диск', x0=x0, cloud=True)

    # поиск — светлая «пилюля», как на прежних макетах
    gradient_fill(img, [x0, 88, x0 + 560, 136], 24, (246, 248, 253), (255, 255, 255))
    rounded(d, [x0, 88, x0 + 560, 136], 24, outline=(238, 241, 248), width=1)
    ic_search(d, x0 + 34, 112, 19, (156, 163, 175))
    text(d, (x0 + 58, 112), 'Поиск файлов...', 15, TEXT_SOFT, anchor='lm')

    # кнопки прижаты вправо, как на прежних макетах
    rx = W - 25
    card(img, [rx - 48, 88, rx, 136], r=24, shadow=(9, 3, 14))
    ic_list(d, rx - 24, 112, 20, (107, 114, 128))
    rx -= 64
    w_obn = pill(img, [rx - 152, 88, rx, 136], 'Обновить', icon=ic_refresh, size=14.5)
    rx -= 168
    w_pap = pill(img, [rx - 194, 88, rx, 136], 'Создать папку', icon=ic_plus, size=14.5)
    rx -= 210
    gradient_fill(img, [rx - 214, 88, rx, 136], 12, GRAD_A, GRAD_B)
    ic_upload(d, rx - 182, 112, 20, (255, 255, 255))
    text(d, (rx - 162, 112), 'Загрузить файл', 15, (255, 255, 255), bold=True, anchor='lm')

    # хлебные крошки
    card(img, [x0, 148, x0 + 136, 182], r=12, shadow=(8, 3, 12))
    ic_folder_open(d, x0 + 26, 165, 17, (107, 114, 128))
    text(d, (x0 + 44, 165), 'Назад', 14.5, (55, 65, 81), bold=True, anchor='lm')
    text(d, (x0 + 154, 165), '/', 16, (156, 163, 175), anchor='lm')
    sk_bar(img, [x0 + 172, 160, x0 + 286, 170], fill=SK)

    # папки: 5 × 2 крупных плиток, общая ширина сетки — как у файлов
    gap, cols = 18, 5
    fw = 186
    fh = 156
    folders = ['violet', 'teal', 'orange', 'magenta', 'sky',
               'orange', 'magenta', 'indigo', 'teal', 'coral']
    for i, key in enumerate(folders):
        col, row = i % cols, i // cols
        x, y = x0 + col * (fw + gap), 190 + row * (fh + gap)
        card(img, [x, y, x + fw, y + fh], r=20, outline=(238, 241, 248), shadow=(9, 3, 12))
        folder_graphic(img, x + fw / 2, y + fh / 2 + 4, 138, 118, key)

    # файлы: 6 × 2 плиток поменьше, той же сеткой по ширине
    fgap = 18
    fw2 = 152
    fh2 = 125
    files = [('blue', 'image'), ('teal', 'grid'), ('coral', 'pie'), ('violet', 'lines'),
             ('magenta', 'music'), ('sky', 'play'),
             ('coral', 'pdf'), ('violet', 'lines'), ('blue', 'code'), ('amber', 'diamond'),
             ('teal', 'network'), ('indigo', 'pen')]
    for i, (key, glyph) in enumerate(files):
        col, row = i % 6, i // 6
        x, y = x0 + col * (fw2 + fgap), 546 + row * (fh2 + fgap)
        card(img, [x, y, x + fw2, y + fh2], r=18, outline=(238, 241, 248), shadow=(9, 3, 12))
        page_graphic(img, x + fw2 / 2, y + fh2 / 2, 84, 96, key, glyph)

    # панель выбранного
    px0, py0 = W - 325, H - 156
    card(img, [px0, py0, W - 25, py0 + 96], r=18, shadow=(12, 5, 18))
    text(d, (px0 + 150, py0 + 26), 'Выбрано: 1', 15, (31, 41, 55), bold=True, anchor='mm')
    pill(img, [px0 + 18, py0 + 48, px0 + 150, py0 + 88], 'Скачать',
         icon=ic_download, size=14, shadow=False)
    gradient_fill(img, [px0 + 162, py0 + 48, px0 + 280, py0 + 88], 12, DANGER_A, DANGER_B)
    ic_trash(d, px0 + 186, py0 + 68, 17, (255, 255, 255))
    text(d, (px0 + 202, py0 + 68), 'Удалить', 14, (255, 255, 255), bold=True, anchor='lm')
    return img


# --- кадр «Задачи» ------------------------------------------------------------

def soft_pair(key, k=0.55):
    """Мягкая пастель: цвет подмешивается к белому."""
    return (lerp(PASTELS[key][0], (255, 255, 255), k),
            lerp(PASTELS[key][1], (255, 255, 255), k))


def chip_fg(key):
    """Цвет текста и значка для мягкого чипа."""
    return lerp(PASTELS[key][0], (34, 40, 74), 0.45)


def task_chip(img, x, cy, label=None, glyph=None, pair='amber', size=13):
    """Мягкий пастельный чип: значок и/или короткая подпись."""
    d = ImageDraw.Draw(img, 'RGBA')
    bw = text_w(label, size, True) + (42 if glyph and label else (30 if glyph else 22))
    box = [x, cy - 13, x + bw, cy + 13]
    a, b = soft_pair(pair)
    gradient_fill(img, box, 13, a, b)
    fg = chip_fg(pair)
    if glyph:
        glyph(d, x + 16, cy, 14, fg)
        tx = x + 28
    else:
        tx = x + 11
    if label:
        text(d, (tx, cy), label, size, fg, bold=True, anchor='lm')
    return x + bw + 8


def task_card(img, box, chips, title_w, items, done=False, key='indigo', tint=None, tilt=None):
    """Карточка задачи в старом мягком стиле: чипы, строки-скелетон, подзадачи,
    полоска прогресса и кружки исполнителей."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0

    def draw(target, bx0, by0):
        b = [bx0, by0, bx0 + w, by0 + h]
        card(target, b, r=16, fill=tint or CARD,
             shadow=None if tilt is not None else (14, 6, 22))
        d = ImageDraw.Draw(target, 'RGBA')
        cx, cy = bx0 + 14, by0 + 29
        if done:
            task_chip(target, cx, cy, 'Выполнено', glyph=ic_check, pair='teal')
        else:
            for label, glyph, pair in chips:
                cx = task_chip(target, cx, cy, label, glyph=glyph, pair=pair)

        ty = by0 + 48
        sk_bar(target, [bx0 + 14, ty, bx0 + 14 + title_w, ty + 11], fill=SK_DARK)
        sk_bar(target, [bx0 + 14, ty + 18, bx0 + 14 + title_w * 0.6, ty + 27], fill=SK, r=5)

        sy = by0 + 88
        for label_w, ok in items:
            pastel_shape(target, [bx0 + 14, sy, bx0 + 30, sy + 16], 'disc',
                         PASTELS['teal' if ok else 'slate'], fold=False)
            if ok:
                ic_check(d, bx0 + 22, sy + 8, 11, (255, 255, 255), w=2.0)
            sk_bar(target, [bx0 + 38, sy + 3, bx0 + 38 + label_w, sy + 13],
                   fill=SK_SOFT if ok else SK)
            sy += 24

        py = sy + 6
        bar_w = (bx0 + w - 24) - (bx0 + 14) - 74
        sk_bar(target, [bx0 + 14, py, bx0 + 14 + bar_w, py + 7], fill=(238, 241, 248), r=3)
        a, b2 = PASTELS['teal' if done else key]
        gradient_fill(target, [bx0 + 14, py, bx0 + 14 + bar_w * (1.0 if done else 0.7), py + 7],
                      3, lerp(a, (255, 255, 255), 0.15), lerp(b2, (255, 255, 255), 0.15))
        for i in range(1 if done else 2):
            ax = bx0 + w - 22 - i * 20
            pastel_shape(target, [ax - 16, py - 10, ax + 16, py + 22], 'disc',
                         PASTELS['rose' if i == 0 else 'blue'], fold=False)
            person_glyph(target, ax, py + 6, 11)
        return py + 22

    if tilt is None:
        draw(img, x0, y0)
        return y0 + h

    # карточку «в движении» рисуем на отдельном слое и наклоняем
    m = 26
    tmp = Image.new('RGBA', (px(w + 2 * m), px(h + 2 * m)), (0, 0, 0, 0))
    draw(tmp, m, m)
    rot = tmp.rotate(tilt, resample=Image.BICUBIC, expand=False)
    img.alpha_composite(rot, (px(x0 - m), px(y0 - m)))
    return y0 + h


def draw_tasks():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_rail(img, 'tasks')
    x0 = RAIL + 24
    screen_head(img, 'Задачи', x0=x0)

    # панель инструментов
    card(img, [x0, 88, x0 + 250, 136], r=14, shadow=(12, 5, 18))
    ic_search(d, x0 + 28, 112, 18, (156, 163, 175))
    text(d, (x0 + 48, 112), 'Поиск карточек', 14.5, TEXT_SOFT, anchor='lm')
    gx = x0 + 276
    for icon, label, wide in ((ic_funnel, 'Все ответственные', True),
                              (ic_refresh, 'Обновить', False),
                              (ic_archive, 'Архив', False)):
        icon(d, gx, 112, 18, (124, 134, 154))
        text(d, (gx + 19, 112), label, 14.5, (88, 98, 120), bold=True, anchor='lm')
        gx += 19 + text_w(label, 14.5, True) + 12
        if wide:
            ic_chevron(d, gx + 7, 112, 14, (152, 162, 180))
            gx += 28
        gx += 26

    # статистика — чипами, как в клиенте
    sx = stat_chip(img, x0, 162, 'Колонок: 3', icon=ic_users)
    stat_chip(img, sx, 162, 'Карточек: 9')

    columns = [
        ('В работе', 'indigo', [
            dict(chips=[('17.09', ic_calendar, 'amber'), ('1/2', None, 'indigo')], title=178,
                 items=[(150, True), (120, False)], key='indigo'),
            dict(chips=[('19.09', ic_calendar, 'amber'), ('0/3', None, 'indigo')], title=196,
                 items=[(120, False), (135, False)], key='amber', tint=(255, 253, 247)),
            dict(chips=[('22.09', ic_calendar, 'rose'), ('0/2', None, 'violet')], title=156,
                 items=[(135, False), (105, False)], key='rose'),
        ]),
        ('На проверке', 'rose', [
            dict(chips=[('17.09', ic_calendar, 'coral'), ('0/3', None, 'indigo')], title=188,
                 items=[(115, False), (130, False)], key='coral', tint=(255, 251, 251)),
            dict(chips=[('20.09', ic_calendar, 'amber'), ('2/2', None, 'teal')], title=166,
                 items=[(140, True), (118, True)], key='teal', tilt=-6),
            dict(chips=[('23.09', ic_calendar, 'amber'), ('0/1', None, 'violet')], title=172,
                 items=[(128, False), (112, False)], key='violet'),
        ]),
        ('Выполнено', 'teal', [
            dict(done=True, title=176, items=[(170, True), (140, True)]),
            dict(done=True, title=150, items=[(132, True)]),
            dict(done=True, title=182, items=[(160, True), (124, True)]),
        ]),
    ]

    gap, col_top, col_h = 16, 188, 680
    cw = ((W - 25) - x0 - gap * 3) // 4
    for ci, (title, accent, cards) in enumerate(columns):
        x = x0 + ci * (cw + gap)
        card(img, [x, col_top, x + cw, col_top + col_h], r=22, fill=(251, 251, 254),
             shadow=(18, 8, 26))
        # заголовок колонки: точка-акцент, название, счётчик, корзина
        pastel_shape(img, [x + 18, col_top + 16, x + 32, col_top + 30], 'disc',
                     PASTELS[accent], fold=False)
        text(d, (x + 40, col_top + 16), title, 15, (31, 41, 55), bold=True)
        tx = x + 40 + text_w(title, 15, True) + 8
        card(img, [tx, col_top + 12, tx + 26, col_top + 40], r=10, fill=(238, 241, 248),
             shadow=False)
        text(d, (tx + 13, col_top + 26), str(len(cards)), 13, (100, 116, 139), bold=True, anchor='mm')
        ic_trash(d, x + cw - 24, col_top + 26, 16, (176, 186, 202))

        y = col_top + 48
        for c in cards:
            h = 128 + 24 * len(c['items'])
            end = task_card(img, [x + 12, y, x + cw - 12, y + h], c.get('chips', []),
                            c['title'], c['items'], done=c.get('done', False),
                            key=c.get('key', 'indigo'), tint=c.get('tint'), tilt=c.get('tilt'))
            y = end + 10

        # «Добавить карточку» — пунктирная кнопка
        dash_box = [x + 12, col_top + col_h - 62, x + cw - 12, col_top + col_h - 18]
        dashed_round_rect(ImageDraw.Draw(img, 'RGBA'), dash_box, 14, (206, 214, 228))
        ic_plus(d, dash_box[0] + (cw - 150) / 2, dash_box[1] + 22, 15, (107, 114, 128))
        text(d, (dash_box[0] + (cw - 150) / 2 + 16, dash_box[1] + 22), 'Добавить карточку', 14,
             (107, 114, 128), bold=True, anchor='lm')

    # панель «Новая колонка» — четвёртая колонка доски
    nx = x0 + 3 * (cw + gap)
    card(img, [nx, col_top, nx + cw, col_top + 320], r=22, shadow=(18, 8, 26))
    text(d, (nx + 18, col_top + 18), 'Новая колонка', 15.5, TEXT, bold=True)
    sk_bar(img, [nx + 18, col_top + 56, nx + cw - 18, col_top + 104], fill=(246, 248, 252), r=12)
    sk_bar(img, [nx + 34, col_top + 76, nx + 150, col_top + 86], fill=SK)
    sk_bar(img, [nx + 18, col_top + 116, nx + cw - 18, col_top + 164], fill=(246, 248, 252), r=12)
    sk_bar(img, [nx + 34, col_top + 136, nx + 180, col_top + 146], fill=SK)
    gradient_fill(img, [nx + 18, col_top + 176, nx + cw - 18, col_top + 224], 12, GRAD_A, GRAD_B)
    ic_plus(d, nx + 46, col_top + 200, 17, (255, 255, 255))
    text(d, (nx + 64, col_top + 200), 'Создать колонку', 14.5, (255, 255, 255), bold=True, anchor='lm')
    return img


# --- кадр «Вход» --------------------------------------------------------------

def draw_login():
    """Экран входа — прежняя иллюстрация (raw-login.jpg), как была в README."""
    return Image.open(os.path.join(HERE, 'raw-login.jpg')).convert('RGBA')


# --- оформление кадра (скругление + тень + фон) -------------------------------

def present(screen, out_name, pad=64, radius=22):
    win = screen.resize((W, H), Image.LANCZOS)          # уменьшаем 2× → 1×
    # Полупрозрачные заливки внутри кадра нужно один раз «печь» на белом фоне,
    # иначе при обрезке по скруглению альфа теряется и, например, активный
    # пункт меню становится непрозрачно-синим.
    flat = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    flat.alpha_composite(win)
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=radius, fill=255)

    CW, CH = W + pad * 2, H + pad * 2
    # фон — как фон GitHub в тёмной теме: #0d1117, с лёгким затемнением книзу
    canvas = Image.new('RGBA', (CW, CH), (13, 17, 23, 255))
    bg = ImageDraw.Draw(canvas)
    for y in range(CH):
        k = y / (CH - 1)
        bg.line([(0, y), (CW, y)], fill=(int(13 - 4 * k), int(17 - 5 * k), int(23 - 6 * k)))

    # Тени и рамку рисуем в пикселях кадра — helpers rounded()/soft_shadow()
    # умножают координаты на S и здесь, после уменьшения, не подходят.
    box = [pad, pad, pad + W, pad + H]
    for blur, dy, alpha in ((30, 12, 58), (6, 2, 34)):
        layer = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [box[0], box[1] + dy, box[2], box[3] + dy], radius=radius,
            fill=(0, 0, 0, alpha))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))
    canvas.paste(flat.convert('RGB'), (pad, pad), mask)

    # тонкая рамка в цвет границ тёмной темы GitHub (#21262d)
    ImageDraw.Draw(canvas, 'RGBA').rounded_rectangle(
        box, radius=radius, outline=(33, 38, 45), width=1)

    canvas.convert('RGB').save(os.path.join(HERE, out_name), optimize=True)
    return os.path.join(HERE, out_name)


if __name__ == '__main__':
    for build, name in ((draw_mail, 'screen-mail.png'), (draw_drive, 'screen-drive.png'),
                        (draw_tasks, 'screen-tasks.png'), (draw_login, 'screen-login.png')):
        path = present(build(), name)
        print('готово:', os.path.basename(path))
