"""Deriva favicon.ico e icon-64.png a partir del logo oficial de Pegasus
(icon-512.png en public/icons/, el mismo que usa Pegasus Tracker — no un
mark propio). Ejecutar solo si ese fichero cambia."""
import os
from PIL import Image

ICONS_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")

source = Image.open(os.path.join(ICONS_DIR, "icon-512.png")).convert("RGBA")

source.resize((64, 64), Image.LANCZOS).save(os.path.join(ICONS_DIR, "icon-64.png"))
source.save(os.path.join(PUBLIC_DIR, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

print("icon-64.png y favicon.ico regenerados a partir del logo de Pegasus")
