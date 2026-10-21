# CyberDroid identity assets

Original Cybercore F-Droid identity artwork. Version 2 is the current direction: a cinematic Cybercore Universal Defense sentinel with a compact human-proportioned endoskeleton head, paired cyan optics, articulated mechanics, dark graphite-titanium armor, and restrained battle wear. The UI uses graphite surfaces, cool titanium typography, and cyan details. The background remains a static illustration. Version 1 files remain for reference; the page uses the `-v2` assets.

| Asset | Use | Format and size |
|---|---|---|
| `cybercore-fdroid-mark.svg` | Header emblem and vector favicon | SVG, scalable |
| `cybercore-fdroid-mark.png` | Apple touch icon and raster mark | PNG, 512 × 512 |
| `icons/*.png` | Raster mark sizes for app chrome and small contexts | PNG, 16, 24, 32, 48, 64, 128, and 256 px |
| `favicon.ico` | Browser favicon | ICO, 16–256 px entries |
| `cyberdroid-mascot.svg` | Full mascot artwork | SVG, 640 × 720 viewBox |
| `cyberdroid-mascot.png` | Full mascot artwork | PNG, 1024 × 1152, transparent |
| `cyberdroid.ico` | Mascot icon | ICO, 16–256 px entries |
| `cyberdroid-wordmark.svg` | Hero logotype | SVG, outlined letter paths |
| `cyberdroid-wordmark.png` | Hero logotype | PNG, 980 × 340, transparent |
| `cyberdroid-hero.svg` | Static technical background with integrated mascot | SVG, 1920 × 1120 |
| `cyberdroid-hero.png` | Site-ready static background | PNG, 1920 × 1120 |
| `cybercore-fdroid-mark-v2.svg/.png` | Current compact optical-core brand mark | SVG; PNG, 512 × 512 |
| `icons-v2/*.png` | Current mark at app and browser sizes | PNG, 16, 24, 32, 48, 64, 128, and 256 px |
| `favicon-v2.ico` | Current multi-resolution browser favicon | ICO, 16–256 px entries |
| `cyberdroid-mascot-v2.svg/.png` | Current transparent mechanical droid mascot | SVG wrapper and transparent PNG, 1386 × 1135 |
| `cyberdroid-wordmark-v2.svg/.png` | Clean titanium-and-cyan wordmark artwork | SVG; PNG, 1000 × 270 |
| `cyberdroid-hero-v2.svg/.png` | Current cinematic static droid background | SVG wrapper; PNG master, 1672 × 941 |
| `cyberdroid-hero-v2.webp` | Optimized web delivery for the same background | WebP, 1672 × 941 |

The site uses the v2 optical-core SVG in the header, boot panel, and favicon; clean display typography for the hero title; and the optimized v2 WebP background as a static backdrop. The transparent mascot PNG is available for cards, app imagery, and other site uses. The existing `repo/icons/icon.png` remains the F-Droid client repository icon.

To regenerate the v2 mark, wordmark, raster sizes, and ICO after editing the SVG masters:

```sh
python3 tools/build-cyberdroid-assets.py
```

The script uses `rsvg-convert` and ImageMagick. The hero and transparent mascot are authored raster illustrations; the PNG masters stay intact while the script creates an optimized WebP delivery file for the hero.
