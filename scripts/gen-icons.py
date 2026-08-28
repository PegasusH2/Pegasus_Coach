"""Genera los iconos PWA de Pegasus Nutrition (marca provisional: fondo negro
redondeado + un pie-chart rojo, mismo lenguaje visual que el logo del Sidebar).
Sustituir por el icono de marca real de Pegasus cuando exista."""
import math
import os
from PIL import Image, ImageDraw

BG = (10, 10, 10, 255)
RED = (232, 56, 61, 255)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def draw_mark(size, padding_ratio, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    corner = size * 0.22
    if maskable:
        draw.rectangle([0, 0, size, size], fill=BG)
    else:
        draw.rounded_rectangle([0, 0, size, size], radius=corner, fill=BG)

    cx, cy = size / 2, size / 2
    r = size * (0.5 - padding_ratio)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED)
    # cuña "pie chart": un triangulo negro desde el centro hacia arriba-derecha
    wedge = [
        (cx, cy),
        (cx, cy - r * 1.4),
        (cx + r * 1.4, cy),
    ]
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.polygon(wedge, fill=255)
    black = Image.new("RGBA", (size, size), BG)
    img.paste(black, (0, 0), mask)
    return img


for size in (64, 180, 192, 512):
    draw_mark(size, 0.14).save(os.path.join(OUT_DIR, f"icon-{size}.png"))

draw_mark(512, 0.22, maskable=True).save(os.path.join(OUT_DIR, "icon-512-maskable.png"))

print("Iconos generados en", OUT_DIR)
