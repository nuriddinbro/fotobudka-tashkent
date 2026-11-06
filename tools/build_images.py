"""
Сжимает фото из папки originals/ в public/img/ (WebP + JPG, два размера)
и собирает картинку для соцсетей (og-image.jpg) и иконки.

Запуск (нужен Python и библиотека Pillow: pip install pillow):
    python tools/build_images.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "originals")
OUT = os.path.join(ROOT, "public", "img")
PUBLIC = os.path.join(ROOT, "public")

# Тексты на картинке для соцсетей (превью ссылки в Telegram, Instagram и т.д.)
HEADLINE = ("Аренда фотобудки", "в Ташкенте")
PRICE_LINE = "от 1 600 000 сум"
PRICE_NOTE = "за 2 часа"
INCLUDED = ("Безлимитная печать фотополосок", "Брендирование под ваш бренд", "Оператор и монтаж включены")
SITE = "fotobudki.uz"
GOLD = (232, 180, 74)
BG = (11, 11, 12)

# папка -> ширины, которые нужно сделать
SIZES = {"gallery": (600, 1200), "strip": (320, 640)}


def save_pair(im, base):
    im.save(base + ".webp", "WEBP", quality=78, method=6)
    im.save(base + ".jpg", "JPEG", quality=80, optimize=True, progressive=True)


def build_photos():
    for folder, widths in SIZES.items():
        src_dir = os.path.join(SRC, folder)
        out_dir = os.path.join(OUT, folder)
        os.makedirs(out_dir, exist_ok=True)
        for name in sorted(os.listdir(src_dir)):
            if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            im = ImageOps.exif_transpose(Image.open(os.path.join(src_dir, name))).convert("RGB")
            stem = os.path.splitext(name)[0]
            for w in widths:
                h = round(im.height * w / im.width)
                save_pair(im.resize((w, h), Image.LANCZOS), os.path.join(out_dir, f"{stem}-{w}"))
                print(f"{folder}/{stem}-{w}  {w}x{h}")


def font(size):
    for f in ("seguibl.ttf", "ariblk.ttf", "arialbd.ttf"):
        p = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", f)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def font_text(size):
    for f in ("seguisb.ttf", "segoeui.ttf", "arial.ttf"):
        p = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", f)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), mask)
    return out


def build_og():
    W, H = 1200, 630
    og = Image.new("RGB", (W, H), BG)
    # мягкое золотое свечение справа
    glow = Image.new("RGB", (W, H), BG)
    ImageDraw.Draw(glow).ellipse((620, 40, 1240, 660), fill=(60, 46, 20))
    og = Image.blend(og, glow.filter(ImageFilter.GaussianBlur(120)), 1.0)

    cards = [("loreal-strips", -8, 640, 120), ("wedding-day", 6, 950, 90), ("evos-buxoro", -3, 800, 210)]
    for stem, angle, x, y in cards:
        p = Image.open(os.path.join(SRC, "gallery", stem + ".jpg")).convert("RGB")
        p = rounded(p.resize((256, 320), Image.LANCZOS), 18)
        shadow = Image.new("RGBA", (p.width + 80, p.height + 80), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((40, 50, p.width + 40, p.height + 50), 18, fill=(0, 0, 0, 170))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18)).rotate(angle, expand=True, resample=Image.BICUBIC)
        og.paste(shadow, (x - 40, y - 40), shadow)
        rp = p.rotate(angle, expand=True, resample=Image.BICUBIC)
        og.paste(rp, (x, y), rp)

    d = ImageDraw.Draw(og)
    WHITE, GREY = (244, 244, 245), (161, 161, 170)
    MAX_W = 540  # левая колонка, правее - фото
    # Заголовок в 2 строки, размер подбирается под ширину колонки
    size = 78
    while size > 40 and d.textlength(HEADLINE[0], font=font(size)) > MAX_W:
        size -= 2
    y = 70
    d.text((76, y), HEADLINE[0], font=font(size), fill=WHITE)
    d.text((76, y + int(size * 1.12)), HEADLINE[1], font=font(size), fill=GOLD)
    # Цена
    y = 285
    d.text((76, y), PRICE_LINE, font=font(50), fill=WHITE)
    d.text((78, y + 66), PRICE_NOTE, font=font_text(30), fill=GREY)
    # Что входит
    y = 440
    for line in INCLUDED:
        d.ellipse((78, y + 13, 90, y + 25), fill=GOLD)
        d.text((104, y), line, font=font_text(28), fill=WHITE)
        y += 44
    d.text((W - 76 - d.textlength(SITE, font=font_text(26)), H - 58), SITE, font=font_text(26), fill=GOLD)
    og.save(os.path.join(PUBLIC, "og-image.jpg"), "JPEG", quality=85, optimize=True, progressive=True)
    print("og-image.jpg")


def build_icons():
    for size, name in ((32, "favicon-32.png"), (180, "apple-touch-icon.png")):
        big = size * 4
        im = Image.new("RGBA", (big, big), (0, 0, 0, 0) if size == 32 else BG + (255,))
        pad = big * (0.22 if size == 32 else 0.3)
        ImageDraw.Draw(im).ellipse((pad, pad, big - pad, big - pad), fill=GOLD + (255,))
        im.resize((size, size), Image.LANCZOS).save(os.path.join(PUBLIC, name))
        print(name)


if __name__ == "__main__":
    # python tools/build_images.py --og  - пересобрать только картинку для соцсетей
    if "--og" in sys.argv:
        build_og()
        sys.exit()
    build_photos()
    build_og()
    build_icons()
