#!/usr/bin/env python3
"""Build all Shadecode Student raster icons from the canonical SVG."""
from pathlib import Path
import io
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/icons/shadecode-student.svg"
OUT = ROOT / "public/icons"
BG = (8, 24, 39, 255)

def render(size):
    raw = cairosvg.svg2png(url=str(SOURCE), output_width=size, output_height=size)
    return Image.open(io.BytesIO(raw)).convert("RGBA")

def save(image, name):
    image.save(OUT / name, format="PNG", optimize=True)

# Standard install icons retain the SVG's own rounded-square field.
for size in (192, 512):
    save(render(size), f"shadecode-student-{size}.png")

# Maskable icons use a full-bleed background and keep the artwork inside
# the central 78% safe zone so launcher masks cannot clip the ribbon.
for size in (192, 512):
    source_size = round(size * 0.78)
    artwork = render(source_size)
    canvas = Image.new("RGBA", (size, size), BG)
    canvas.alpha_composite(artwork, ((size - source_size) // 2, (size - source_size) // 2))
    save(canvas, f"shadecode-student-maskable-{size}.png")

save(render(180), "apple-touch-icon.png")
save(render(32), "favicon.png")
print("Generated standard, maskable, Apple touch, and favicon PNGs from", SOURCE)
