#!/usr/bin/env python3
"""Render the reusable CyberDroid v2 SVG mark and wordmark derivatives."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets" / "cyberdroid"


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    mark = PACK / "cybercore-fdroid-mark-v2.svg"
    wordmark = PACK / "cyberdroid-wordmark-v2.svg"
    mark_png = PACK / "cybercore-fdroid-mark-v2.png"
    wordmark_png = PACK / "cyberdroid-wordmark-v2.png"

    run("rsvg-convert", "-w", "512", "-h", "512", str(mark), "-o", str(mark_png))
    run("rsvg-convert", "-w", "1000", "-h", "270", str(wordmark), "-o", str(wordmark_png))
    run("magick", str(PACK / "cyberdroid-hero-v2.png"), "-quality", "88", str(PACK / "cyberdroid-hero-v2.webp"))

    icon_dir = PACK / "icons-v2"
    icon_dir.mkdir(exist_ok=True)
    for size in (16, 24, 32, 48, 64, 128, 256):
        run("magick", str(mark_png), "-resize", f"{size}x{size}", str(icon_dir / f"{size}x{size}.png"))
    run("magick", str(mark_png), "-define", "icon:auto-resize=256,128,64,48,32,16", str(PACK / "favicon-v2.ico"))
    print("Rendered CyberDroid v2 mark, wordmark, size variants, and favicon in", PACK)


if __name__ == "__main__":
    main()
