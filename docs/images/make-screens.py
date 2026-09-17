#!/usr/bin/env python3
"""Иллюстрации интерфейса SuperApp для README (Pillow).

    python3 docs/images/make-screens.py        # запускать из корня репозитория

Скрипт рисует четыре кадра — «Почта», «Диск», «Задачи», «Вход» — по мотивам
настоящего интерфейса приложения: те же модули, подписи, кнопки и цвета, что и
в клиенте (структура сайдбара — packages/client/src/components/Sidebar.tsx,
акцентный цвет #667eea — tailwind.config.js, подписи — тексты модулей).

Это макеты, а не скриншоты: данные вымышленные («Сергей Кузнецов», «Смета по
объекту на ул. Северной»), но интерфейс повторяет реальный. Кадры рисуются с
двукратным запасом и уменьшаются — так получается гладкий текст и тени.

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

BG = (247, 248, 253)              # фон рабочей области
CARD = (255, 255, 255)
BORDER = (233, 237, 247)
TEXT = (26, 26, 46)               # #1a1a2e
TEXT_MUTED = (107, 114, 128)
TEXT_SOFT = (154, 163, 178)

INDIGO_BG = (238, 240, 255)
INDIGO_FG = (79, 70, 229)
AMBER_BG = (254, 243, 199)
AMBER_FG = (180, 83, 9)
RED_BG = (254, 226, 226)
RED_FG = (185, 28, 28)
GREEN_BG = (209, 250, 229)
GREEN_FG = (4, 120, 87)

FILTER_PLANE = [(0, 0), (1, 0), (0.5, 0.62)]   # скругление углов фильтра


def px(v):
    return int(round(v * S))


def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, px(size))


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


def card(img, box, r=18, fill=CARD, outline=BORDER, width=1, shadow=None):
    """Карточка с мягкой тенью (shadow = (blur, dy, alpha))."""
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
        gd.line([(i, 0), (0, i)], fill=tuple(int(p + (q - p) * k) for p, q in zip(a, b)))
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
        gd.line([(i, 0), (0, i)], fill=tuple(int(p + (q - p) * k) for p, q in zip(a, b)))
    grad.putalpha(mask)
    x = px(xy[0]) if anchor[0] == 'l' else (px(xy[0]) - mask.width if anchor[0] == 'r' else px(xy[0]) - mask.width // 2)
    img.alpha_composite(grad, (x, px(xy[1]) - px(2)))


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
            rounded(d, [16, y, SIDEBAR - 16, y + 44], 12, fill=(102, 126, 234, 26))
        icon(d, 44, y + 22, 20, PRIMARY_DARK if on else (55, 65, 81))
        text(d, (70, y + 13), label, 15.5, PRIMARY_DARK if on else TEXT, bold=on)
        if badge:
            d.ellipse([px(SIDEBAR - 58), px(y + 11), px(SIDEBAR - 36), px(y + 33)], fill=(71, 85, 105))
            text(d, (SIDEBAR - 47, y + 22), str(badge), 12, (255, 255, 255), bold=True, anchor='mm')
        y += 50

        if key == 'mail':
            sub_y = y                      # карточка подменю сразу под «Почтой»
            break

    # подменю почты — отдельная «стеклянная» карточка
    sub_items = [
        ('Написать письмо', ic_pencil, False, 0, 0),
        ('Входящие', ic_inbox, True, 2, 0),
        ('Отправленные', ic_send, False, 0, 0),
        ('Корзина', ic_trash, False, 0, 0),
    ]
    card_h = 12 + len(sub_items) * 44 + 4
    card(img, [16, sub_y, SIDEBAR - 16, sub_y + card_h], r=16, shadow=(14, 6, 26))
    yy = sub_y + 10
    for label, icon, on, badge, _ in sub_items:
        icon(d, 44, yy + 20, 19, PRIMARY_DARK if on else (75, 85, 99))
        text(d, (70, yy + 11), label, 14.5, PRIMARY_DARK if on else TEXT, bold=on)
        if badge:
            d.ellipse([px(SIDEBAR - 58), px(yy + 9), px(SIDEBAR - 36), px(yy + 31)], fill=(71, 85, 105))
            text(d, (SIDEBAR - 47, yy + 20), str(badge), 12, (255, 255, 255), bold=True, anchor='mm')
        yy += 44

    # «Диск» и «Задачи» — ниже карточки подменю
    y2 = sub_y + card_h + 12
    for key, label, icon, _ in rows[1:]:
        on = (key == active)
        if on:
            rounded(d, [16, y2, SIDEBAR - 16, y2 + 44], 12, fill=(102, 126, 234, 26))
        icon(d, 44, y2 + 22, 20, PRIMARY_DARK if on else (55, 65, 81))
        text(d, (70, y2 + 13), label, 15.5, PRIMARY_DARK if on else TEXT, bold=on)
        y2 += 50

    # Настройки внизу
    icy = H - 52
    ic_gear(d, 44, icy + 20, 20, TEXT_MUTED)
    text(d, (70, icy + 11), 'Настройки', 15.5, TEXT)


def screen_header(img, title, gradient=True, user='Алексей Морозов', cloud=False):
    d = ImageDraw.Draw(img, 'RGBA')
    x = SIDEBAR + 25
    if cloud:
        ic_cloud(d, x + 16, 44, 32, (90, 120, 235), w=2.4, fill=(120, 150, 245))
    if gradient:
        gradient_text(img, (x if not cloud else x + 40, 26), title, 30, PRIMARY, VIOLET)
    else:
        text(d, (x, 30), title, 30, PRIMARY_DARK, bold=True)
    text(d, (W - 175, 36), user, 15, (75, 85, 99))
    card(img, [W - 130, 24, W - 25, 68], r=12, shadow=(10, 4, 18))
    ic_logout(d, W - 108, 46, 18, (55, 65, 81))
    text(d, (W - 94, 37), 'Выйти', 15, (55, 65, 81), bold=True)


def pill(img, box, label, size=15, fill=CARD, outline=BORDER, color=(55, 65, 81),
         icon=None, icon_color=None, bold=True, shadow=True, radius=12):
    if shadow:
        card(img, box, r=radius, fill=fill, outline=outline, shadow=(12, 5, 20))
    else:
        card(img, box, r=radius, fill=fill, outline=outline)
    d = ImageDraw.Draw(img, 'RGBA')
    h = box[3] - box[1]
    cy = (box[1] + box[3]) / 2
    tx = box[0] + 18
    if icon:
        icon(d, box[0] + 22, cy, 19, icon_color or color)
        tx = box[0] + 42
    text(d, (tx, cy), label, size, color, bold=bold, anchor='lm')
    return tx + text_w(label, size, bold) + 18


# --- кадр «Почта» -------------------------------------------------------------

def draw_mail():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_sidebar(img, 'mail')

    x0 = SIDEBAR + 25
    # кнопка «отметить всё прочитанным» (Circle)
    card(img, [x0, 24, x0 + 48, 72], r=14, shadow=(12, 5, 20))
    ic_circle(d, x0 + 24, 48, 20, (107, 114, 128))
    # строка поиска
    card(img, [x0 + 64, 24, x0 + 855, 72], r=24, shadow=(14, 6, 22))
    ic_search(d, x0 + 94, 48, 19, (156, 163, 175))
    text(d, (x0 + 116, 48), 'Поиск писем...', 15, TEXT_SOFT, anchor='lm')
    # круглые кнопки: фильтр и избранное
    for bx, ic in ((x0 + 876, ic_funnel), (W - 92, ic_star)):
        card(img, [bx, 24, bx + 48, 72], r=14, shadow=(12, 5, 20))
        ic(d, bx + 24, 48, 20, (107, 114, 128))

    emails = [
        ('Сергей Кузнецов', 'СК', 'чт', 'Смета по объекту на ул. Северной',
         'Приложил обновлённую смету — нужно согласование до обеда.', True, True),
        ('Марина Соколова', 'МС', 'чт', 'Фотоотчёт за сентябрь',
         '12 фотографий и акт выполненных работ во вложении.', True, False),
        ('ООО «Крымстрой»', 'КС', 'ср', 'Счёт на оплату № 217 от 16.09',
         'Прошу оплатить до конца недели, работы по объекту закрыты.', False, False),
        ('Бухгалтерия', 'БУ', 'вт', 'Закрывающие документы за август',
         'Подписала УПД, оригиналы передам курьером в пятницу.', False, True),
    ]
    y = 96
    for sender, initials, when, subject, snippet, unread, starred in emails:
        box = [x0, y, W - 25, y + 92]
        card(img, box, r=18, shadow=(16, 7, 24))
        rounded(d, [x0, y + 10, x0 + 5, y + 82], 3,
                fill=(122, 162, 247) if unread else (203, 213, 225))
        # аватар с инициалами
        d.ellipse([px(x0 + 26), px(y + 26), px(x0 + 66), px(y + 66)], fill=(233, 236, 244))
        text(d, (x0 + 46, y + 46), initials, 13, (107, 114, 128), bold=True, anchor='mm')
        ic_star(d, x0 + 92, y + 46, 19, (250, 204, 21) if starred else (203, 213, 225),
                fill=(253, 224, 71) if starred else None)
        text(d, (x0 + 122, y + 22), sender, 15.5, TEXT if unread else (55, 65, 81),
             bold=unread)
        text(d, (W - 45, y + 22), when, 13, TEXT_SOFT, anchor='ra')
        subject_text = fit(subject, 14.5, 700, unread)
        text(d, (x0 + 122, y + 44), subject_text, 14.5,
             (17, 24, 39) if unread else (75, 85, 99), bold=unread)
        if unread:
            dot_x = x0 + 122 + text_w(subject_text, 14.5, True) + 12
            d.ellipse([px(dot_x), px(y + 49), px(dot_x + 8), px(y + 57)], fill=PRIMARY)
        text(d, (x0 + 122, y + 64), fit(snippet, 13.5, 900), 13.5, TEXT_MUTED)
        y += 104
    return img


# --- кадр «Диск» --------------------------------------------------------------

def file_icon(d, cx, cy, s, kind):
    """Плитка-иконка файла: папка или цветной квадрат с буквой типа."""
    if kind == 'folder':
        ic_folder(d, cx, cy, s, (245, 158, 11), w=2, fill=(251, 191, 36))
        return
    colors = {
        'xls': (34, 197, 94), 'ppt': (168, 85, 247), 'pdf': (239, 68, 68),
        'zip': (245, 158, 11), 'img': (16, 185, 129), 'doc': (59, 130, 246),
    }
    letters = {'xls': 'X', 'ppt': 'P', 'pdf': 'PDF', 'zip': 'Z', 'doc': 'W'}
    rounded(d, [cx - s * 0.42, cy - s * 0.48, cx + s * 0.42, cy + s * 0.48], s * 0.16,
            fill=colors[kind])
    label = letters.get(kind)
    if label:
        text(d, (cx, cy), label, s * 0.42, (255, 255, 255), bold=True, anchor='mm')
    else:
        ic_image(d, cx, cy, s * 0.7, (255, 255, 255), w=1.6)


def draw_drive():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_sidebar(img, 'drive')
    screen_header(img, 'Сетевой диск', cloud=True)

    # панель действий
    gradient_fill(img, [SIDEBAR + 25, 96, SIDEBAR + 244, 144], 12, GRAD_A, GRAD_B)
    ic_upload(d, SIDEBAR + 60, 120, 20, (255, 255, 255))
    text(d, (SIDEBAR + 80, 120), 'Загрузить файл', 15, (255, 255, 255), bold=True, anchor='lm')
    pill(img, [SIDEBAR + 260, 96, SIDEBAR + 470, 144], 'Создать папку', icon=ic_plus)
    pill(img, [SIDEBAR + 486, 96, SIDEBAR + 658, 144], 'Обновить', icon=ic_refresh)
    card(img, [SIDEBAR + 674, 96, SIDEBAR + 720, 144], r=12, shadow=(12, 5, 20))
    ic_list(d, SIDEBAR + 697, 120, 20, (107, 114, 128))

    # хлебные крошки
    card(img, [SIDEBAR + 25, 164, SIDEBAR + 170, 208], r=12, shadow=(10, 4, 16))
    ic_folder_open(d, SIDEBAR + 52, 186, 18, (107, 114, 128))
    text(d, (SIDEBAR + 70, 186), 'Назад', 15, (55, 65, 81), bold=True, anchor='lm')
    text(d, (SIDEBAR + 190, 186), '/', 16, (156, 163, 175), anchor='lm')

    # плитки файлов
    files = [
        ('Договоры', 'folder', True), ('Смета_Северная.xlsx', 'xls', False),
        ('Проект_КП.pptx', 'ppt', False), ('Акт_выполненных_работ.pdf', 'pdf', False),
        ('Фотоотчёт_сентябрь.zip', 'zip', False), ('Снимок экрана 2026-09-12.png', 'img', False),
    ]
    tw, th, gap = 258, 96, 18
    for i, (name, kind, selected) in enumerate(files):
        col, row = i % 4, i // 4
        x = SIDEBAR + 25 + col * (tw + gap)
        y = 232 + row * (th + gap)
        box = [x, y, x + tw, y + th]
        card(img, box, r=16, shadow=(14, 6, 22),
             outline=(129, 140, 248) if selected else BORDER, width=1.6 if selected else 1)
        file_icon(d, x + 44, y + th / 2, 42, kind)
        text(d, (x + 84, y + th / 2), fit(name, 14.5, tw - 110, True), 14.5,
             (17, 24, 39), bold=True, anchor='lm')
        if selected:
            d.ellipse([px(x + 10), px(y + 10), px(x + 32), px(y + 32)], fill=(51, 65, 85))
            ic_check(d, x + 21, y + 21, 14, (255, 255, 255), w=2.0)

    # панель выбранного
    px0, py0 = W - 325, H - 156
    card(img, [px0, py0, W - 25, py0 + 96], r=18, shadow=(20, 9, 34))
    text(d, (px0 + 150, py0 + 26), 'Выбрано: 1', 15, (31, 41, 55), bold=True, anchor='mm')
    pill(img, [px0 + 18, py0 + 48, px0 + 150, py0 + 88], 'Скачать',
         icon=ic_download, size=14, shadow=False)
    gradient_fill(img, [px0 + 162, py0 + 48, px0 + 280, py0 + 88], 12, DANGER_A, DANGER_B)
    ic_trash(d, px0 + 186, py0 + 68, 17, (255, 255, 255))
    text(d, (px0 + 202, py0 + 68), 'Удалить', 14, (255, 255, 255), bold=True, anchor='lm')
    return img


# --- кадр «Задачи» ------------------------------------------------------------

def deadline_chip(img, x, y, label, kind='amber'):
    bg, fg = {'amber': (AMBER_BG, AMBER_FG), 'red': (RED_BG, RED_FG),
              'indigo': (INDIGO_BG, INDIGO_FG), 'green': (GREEN_BG, GREEN_FG)}[kind]
    w = 34 + text_w(label, 12.5, True)
    card(img, [x, y, x + w, y + 26], r=13, fill=bg, outline=bg, shadow=False)
    d = ImageDraw.Draw(img, 'RGBA')
    ic_calendar(d, x + 14, y + 13, 13, fg)
    text(d, (x + 26, y + 13), label, 12.5, fg, bold=True, anchor='lm')
    return x + w + 8


def progress_chip(img, x, y, label, done=0):
    w = 34 + text_w(label, 12.5, True)
    card(img, [x, y, x + w, y + 26], r=13, fill=INDIGO_BG, outline=INDIGO_BG, shadow=False)
    d = ImageDraw.Draw(img, 'RGBA')
    ic_list(d, x + 14, y + 13, 13, INDIGO_FG)
    text(d, (x + 26, y + 13), label, 12.5, INDIGO_FG, bold=True, anchor='lm')
    return x + w + 8


def task_card(img, box, title, chips, items, fill=CARD, outline=BORDER,
              done_chip=False, icons=False):
    card(img, box, r=16, fill=fill, outline=outline, shadow=(14, 6, 20))
    d = ImageDraw.Draw(img, 'RGBA')
    x, y = box[0] + 16, box[1] + 16
    text(d, (x, y), fit(title, 14.5, box[2] - box[0] - 100, True), 14.5, (17, 24, 39), bold=True)
    if icons:
        ic_pencil(d, box[2] - 52, y + 8, 15, (16, 185, 129))
        ic_trash(d, box[2] - 24, y + 8, 15, (148, 163, 184))
    y += 28
    if done_chip:
        w = 92
        card(img, [x, y, x + w, y + 26], r=13, fill=GREEN_BG, outline=GREEN_BG, shadow=False)
        ic_check(d, x + 16, y + 13, 13, GREEN_FG, w=2.2)
        text(d, (x + 30, y + 13), 'Выполнено', 12.5, GREEN_FG, bold=True, anchor='lm')
        y += 34
    if chips:
        cx = x
        for label, kind in chips:
            cx = deadline_chip(img, cx, y, label, kind) if kind in ('amber', 'red') \
                else progress_chip(img, cx, y, label, 0)
        y += 34
    for label, checked in items:
        color = (156, 163, 175) if checked else (75, 85, 99)
        if checked:
            d.ellipse([px(x), px(y + 1), px(x + 16), px(y + 17)], fill=(16, 185, 129))
            ic_check(d, x + 8, y + 9, 11, (255, 255, 255), w=2.2)
        else:
            d.ellipse([px(x), px(y + 1), px(x + 16), px(y + 17)], outline=(203, 213, 225), width=_lw(1.5))
        text(d, (x + 24, y + 9), label, 13.5, color, anchor='lm')
        if checked:
            d.line([px(x + 22), px(y + 10), px(x + 24 + text_w(label, 13.5)), px(y + 10)],
                   fill=(156, 163, 175), width=_lw(1.2))
        y += 24
    return y


def draw_tasks():
    img = Image.new('RGBA', (W * S, H * S), BG + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    draw_sidebar(img, 'tasks')
    screen_header(img, 'Задачи')

    # панель инструментов
    card(img, [SIDEBAR + 25, 88, SIDEBAR + 330, 136], r=14, shadow=(12, 5, 18))
    ic_search(d, SIDEBAR + 52, 112, 18, (156, 163, 175))
    text(d, (SIDEBAR + 72, 112), 'Поиск карточек', 14.5, TEXT_SOFT, anchor='lm')
    pill(img, [SIDEBAR + 346, 88, SIDEBAR + 600, 136], 'Все ответственные',
         icon=ic_funnel, size=14.5)
    ic_chevron(d, SIDEBAR + 578, 112, 14, (107, 114, 128))
    pill(img, [SIDEBAR + 616, 88, SIDEBAR + 776, 136], 'Обновить', icon=ic_refresh, size=14.5)
    pill(img, [SIDEBAR + 792, 88, SIDEBAR + 936, 136], 'Архив', icon=ic_archive, size=14.5)

    # статистика — чипами, как в клиенте
    sx = stat_chip(img, SIDEBAR + 25, 162, 'Колонок: 3', icon=ic_users)
    stat_chip(img, sx, 162, 'Карточек: 7')

    columns = [
        ('В работе', [
            dict(title='Согласовать смету с заказчиком',
                 chips=[('17.09, 16:17', 'amber'), ('1/2', 'indigo')],
                 items=[('Отправить смету', True), ('Получить подпись', False)]),
            dict(title='Заказать материалы на объект', fill=(255, 251, 235),
                 outline=(253, 230, 138),
                 chips=[('19.09, 10:00', 'amber'), ('0/3', 'indigo')],
                 items=[('Кровля', False), ('Утеплитель', False), ('Крепёж', False)]),
            dict(title='Обновить план-график',
                 chips=[('22.09, 09:00', 'indigo'), ('0/2', 'indigo')],
                 items=[('Свести сроки', False), ('Согласовать с прорабом', False)]),
        ]),
        ('На проверке', [
            dict(title='Проверить акты выполненных работ', fill=(254, 242, 242),
                 outline=(254, 202, 202),
                 chips=[('17.09.2026, 15:19', 'red'), ('0/3', 'indigo')],
                 items=[('Акты КС-2', False), ('Справки КС-3', False), ('Сверить объёмы', False)]),
            dict(title='Фотоотчёт за сентябрь',
                 chips=[('20.09, 12:00', 'amber'), ('2/2', 'indigo')],
                 items=[('Собрать фотографии', True), ('Подписать у заказчика', True)]),
        ]),
        ('Выполнено', [
            dict(title='Закупка инструмента', fill=(236, 253, 245),
                 outline=(167, 243, 208), done_chip=True, icons=True,
                 chips=[('15.09, 18:00', 'green')],
                 items=[('Накладные в бухгалтерию', True)]),
        ]),
    ]

    cw, gap = 305, 18
    for ci, (title, cards) in enumerate(columns):
        x = SIDEBAR + 25 + ci * (cw + gap)
        col_h = 640
        card(img, [x, 188, x + cw, 188 + col_h], r=18, fill=(251, 251, 254),
             outline=BORDER, shadow=(14, 6, 20))
        text(d, (x + 18, 206), title, 15.5, (31, 41, 55), bold=True)
        # счётчик карточек
        cw_ = 26
        card(img, [x + 18 + text_w(title, 15.5, True) + 10, 202,
                   x + 18 + text_w(title, 15.5, True) + 10 + cw_, 230],
             r=8, fill=(238, 241, 248), outline=(238, 241, 248), shadow=False)
        text(d, (x + 18 + text_w(title, 15.5, True) + 10 + cw_ / 2, 216), str(len(cards)),
             13, (100, 116, 139), bold=True, anchor='mm')
        ic_trash(d, x + cw - 26, 216, 16, (148, 163, 184))

        y = 244
        for c in cards:
            box = [x + 14, y, x + cw - 14, y + 10]      # высота досчитается ниже
            end = task_card(img, [x + 14, y, x + cw - 14, y + 128],
                            c['title'], c.get('chips', []), c.get('items', []),
                            fill=c.get('fill', CARD), outline=c.get('outline', BORDER),
                            done_chip=c.get('done_chip', False), icons=c.get('icons', False))
            y += (end - y) + 14

        # «Добавить карточку» — пунктирная кнопка
        dash_box = [x + 14, 188 + col_h - 62, x + cw - 14, 188 + col_h - 18]
        _DASH = ImageDraw.Draw(img, 'RGBA')
        dashed_round_rect(_DASH, dash_box, 14, (203, 213, 225))
        ic_plus(_DASH, dash_box[0] + 88, dash_box[1] + 22, 15, (107, 114, 128))
        text(_DASH, (dash_box[0] + 104, dash_box[1] + 22), 'Добавить карточку', 14,
             (107, 114, 128), bold=True, anchor='lm')

    # панель «Новая колонка» (уходит за правый край — как в приложении)
    nx = SIDEBAR + 25 + 3 * (cw + gap)
    card(img, [nx, 188, nx + cw, 188 + 320], r=18, shadow=(16, 7, 24))
    text(d, (nx + 18, 206), 'Новая колонка', 15.5, TEXT, bold=True)
    card(img, [nx + 18, 240, nx + cw - 18, 288], r=12, shadow=False)
    text(d, (nx + 34, 264), fit('Например: Согласование', 14, cw - 60), 14,
         TEXT_SOFT, anchor='lm')
    card(img, [nx + 18, 300, nx + cw - 18, 348], r=12, shadow=False)
    text(d, (nx + 34, 324), 'дд . мм . гггг , -- : --', 14, TEXT_SOFT, anchor='lm')
    gradient_fill(img, [nx + 18, 360, nx + cw - 18, 408], 12, GRAD_A, GRAD_B)
    ic_plus(d, nx + 60, 384, 17, (255, 255, 255))
    text(d, (nx + 78, 384), 'Создать колонку', 14.5, (255, 255, 255), bold=True, anchor='lm')
    return img


def dashed_round_rect(d, box, r, color, dash=8, gap=7, width=1.6):
    """Пунктирная рамка со скруглением (для «Добавить карточку»)."""
    import math
    x0, y0, x1, y1 = box

    def seg(p, q):
        length = math.hypot(q[0] - p[0], q[1] - p[1])
        if length == 0:
            return
        steps = max(1, int(length // (dash + gap)))
        for i in range(steps + 1):
            t0 = (i * (dash + gap)) / length
            t1 = min(1, (i * (dash + gap) + dash) / length)
            if t0 >= 1:
                break
            d.line([px(p[0] + (q[0] - p[0]) * t0), px(p[1] + (q[1] - p[1]) * t0),
                    px(p[0] + (q[0] - p[0]) * t1), px(p[1] + (q[1] - p[1]) * t1)],
                   fill=color, width=_lw(width))

    seg((x0 + r, y0), (x1 - r, y0))
    seg((x1, y0 + r), (x1, y1 - r))
    seg((x1 - r, y1), (x0 + r, y1))
    seg((x0, y1 - r), (x0, y0 + r))
    d.arc([px(x0), px(y0), px(x0 + 2 * r), px(y0 + 2 * r)], start=180, end=270, fill=color, width=_lw(width))
    d.arc([px(x1 - 2 * r), px(y0), px(x1), px(y0 + 2 * r)], start=270, end=360, fill=color, width=_lw(width))
    d.arc([px(x1 - 2 * r), px(y1 - 2 * r), px(x1), px(y1)], start=0, end=90, fill=color, width=_lw(width))
    d.arc([px(x0), px(y1 - 2 * r), px(x0 + 2 * r), px(y1)], start=90, end=180, fill=color, width=_lw(width))


# --- кадр «Вход» --------------------------------------------------------------

def draw_login():
    img = Image.new('RGBA', (W * S, H * S), (255, 255, 255, 255))
    # фон: глубокий градиент + мягкие световые пятна
    gradient_fill(img, [0, 0, W, H], 0, (84, 96, 200), (126, 80, 176))
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, 'RGBA')
    gd.ellipse([px(-120), px(-260), px(620), px(420)], fill=(150, 170, 255, 60))
    gd.ellipse([px(900), px(520), px(1660), px(1160)], fill=(190, 140, 255, 45))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(px(90))))

    # кнопка закрытия окна — как в клиенте (только в Electron)
    d = ImageDraw.Draw(img, 'RGBA')
    glass_box(img, [W - 52, 12, W - 12, 52], 10, (255, 255, 255, 26),
              outline=(255, 255, 255, 70))
    ic_cross(d, W - 32, 32, 15, (255, 255, 255, 210))

    cw, ch = 460, 608
    cx, cy = (W - cw) / 2, (H - ch) / 2
    card(img, [cx, cy, cx + cw, cy + ch], r=24, shadow=(26, 14, 90))
    d = ImageDraw.Draw(img, 'RGBA')
    gradient_text(img, (W / 2, cy + 46), 'SuperApp', 40, PRIMARY, VIOLET, anchor='ma')
    text(d, (W / 2, cy + 100), 'Авторизация', 14.5, TEXT_MUTED, anchor='ma')

    y = cy + 140
    for label, ph, dots in (('Логин', 'Введите логин', False), ('Пароль', 'Введите пароль', True)):
        text(d, (cx + 40, y), label, 13.5, TEXT_MUTED)
        card(img, [cx + 40, y + 24, cx + cw - 40, y + 74], r=10, fill=(248, 250, 253))
        if dots:
            for i in range(9):
                d.ellipse([px(cx + 60 + i * 12), px(y + 45), px(cx + 66 + i * 12), px(y + 51)],
                          fill=(107, 114, 128))
        else:
            text(d, (cx + 58, y + 49), ph, 14.5, TEXT_SOFT, anchor='lm')
        y += 94

    # «Запомнить пароль» — галочка-чекбокс, как в клиенте
    d.rounded_rectangle([px(cx + 40), px(y + 2), px(cx + 58), px(y + 20)], radius=px(5),
                        fill=(102, 126, 234))
    ic_check(d, cx + 49, y + 11, 12, (255, 255, 255), w=2.2)
    text(d, (cx + 68, y + 11), 'Запомнить пароль', 14, TEXT_MUTED, anchor='lm')
    y += 42

    # PIN-код — в отдельном светлом контейнере (glass-mid rounded-xl p-6)
    text(d, (cx + 40, y), 'PIN-код', 13.5, TEXT_MUTED)
    y += 22
    pin_box = [cx + 40, y, cx + cw - 40, y + 102]
    card(img, pin_box, r=12, fill=(246, 248, 252), outline=(233, 237, 247))
    bw, bgap = 52, 18
    bx0 = cx + cw / 2 - (bw * 4 + bgap * 3) / 2
    for i in range(4):
        bx = bx0 + i * (bw + bgap)
        card(img, [bx, y + 25, bx + bw, y + 77], r=12, fill=(255, 255, 255))
        if i < 2:
            d.ellipse([px(bx + bw / 2 - 6), px(y + 51 - 6),
                       px(bx + bw / 2 + 6), px(y + 51 + 6)], fill=(26, 26, 46))
    y += 126

    gradient_fill(img, [cx + 40, y, cx + cw - 40, y + 50], 12, GRAD_A, GRAD_B)
    text(d, (W / 2, y + 25), 'Войти', 16, (255, 255, 255), bold=True, anchor='mm')
    return img


# --- оформление кадра (скругление + тень + фон) -------------------------------

def present(screen, out_name, pad=38, radius=22):
    win = screen.resize((W, H), Image.LANCZOS)          # уменьшаем 2× → 1×
    # Полупрозрачные заливки внутри кадра нужно один раз «спечь» на белом фоне,
    # иначе при обрезке по скруглению альфа теряется и, например, активный
    # пункт меню становится непрозрачно-синим.
    flat = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    flat.alpha_composite(win)
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=radius, fill=255)

    CW, CH = W + pad * 2, H + pad * 2
    canvas = Image.new('RGBA', (CW, CH), (255, 255, 255, 255))
    bg = ImageDraw.Draw(canvas)
    for y in range(CH):                                  # мягкий фон
        k = y / (CH - 1)
        bg.line([(0, y), (CW, y)], fill=(int(247 - 6 * k), int(249 - 4 * k), int(254 - 2 * k)))

    # Тени и рамку рисуем в пикселях кадра — helpers rounded()/soft_shadow()
    # умножают координаты на S и здесь, после уменьшения, не подходят.
    box = [pad, pad, pad + W, pad + H]
    for blur, dy, alpha in ((34, 16, 70), (10, 4, 46)):
        layer = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [box[0], box[1] + dy, box[2], box[3] + dy], radius=radius,
            fill=(64, 76, 130, alpha))
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))
    canvas.paste(flat.convert('RGB'), (pad, pad), mask)

    ImageDraw.Draw(canvas, 'RGBA').rounded_rectangle(
        box, radius=radius, outline=(230, 234, 246), width=1)

    canvas.convert('RGB').save(os.path.join(HERE, out_name), optimize=True)
    return os.path.join(HERE, out_name)


if __name__ == '__main__':
    for build, name in ((draw_mail, 'screen-mail.png'), (draw_drive, 'screen-drive.png'),
                        (draw_tasks, 'screen-tasks.png'), (draw_login, 'screen-login.png')):
        path = present(build(), name)
        print('готово:', os.path.basename(path))
