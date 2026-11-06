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

BRAND = "Fotobudka Tashkent"  # название на картинке для соцсетей
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
    # Название: по словам в строки, размер шрифта подбирается под ширину
    words = BRAND.split()
    lines = [" ".join(words[: (len(words) + 1) // 2]), " ".join(words[(len(words) + 1) // 2:])] if len(words) > 1 else [BRAND]
    size = 120
    while size > 40 and max(d.textlength(l, font=font(size)) for l in lines) > 470:
        size -= 4
    y = 250 - size * len(lines) // 2 - 20
    d.ellipse((76, y + size * 0.42, 76 + size * 0.3, y + size * 0.72), fill=GOLD)
    for l in lines:
        d.text((76 + size * 0.45, y), l, font=font(size), fill=(244, 244, 245))
        y += int(size * 1.1)
    d.text((76, 360), "Аренда фотобудки", font=font(52), fill=(244, 244, 245))
    d.text((76, 425), "в Ташкенте", font=font(52), fill=GOLD)
    d.text((78, 520), "Безлимитная печать · брендирование · оператор", font=font_text(26), fill=(161, 161, 170))
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
    build_photos()
    build_og()
    build_icons()
