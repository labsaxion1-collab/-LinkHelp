#!/usr/bin/env python3
"""Optimize public/brand assets: resize, WebP conversion, in-place PNG compression."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"


def resize_max(image: Image.Image, max_dim: int) -> Image.Image:
    width, height = image.size
    if max(width, height) <= max_dim:
        return image
    ratio = max_dim / max(width, height)
    return image.resize((int(width * ratio), int(height * ratio)), Image.Resampling.LANCZOS)


def prepare_mode(image: Image.Image) -> Image.Image:
    if image.mode in ("RGB", "RGBA"):
        return image
    if "A" in image.getbands():
        return image.convert("RGBA")
    return image.convert("RGB")


def bytes_kb(path: Path) -> float:
    return path.stat().st_size / 1024


def optimize_to_webp(src: Path, dst: Path, max_dim: int, quality: int = 82) -> tuple[int, int]:
    image = prepare_mode(Image.open(src))
    image = resize_max(image, max_dim)
    dst.parent.mkdir(parents=True, exist_ok=True)
    image.save(dst, "WEBP", quality=quality, method=6)
    return image.size


def optimize_png_inplace(src: Path, max_dim: int) -> tuple[int, int]:
    image = prepare_mode(Image.open(src))
    image = resize_max(image, max_dim)
    image.save(src, "PNG", optimize=True)
    return image.size


def main() -> None:
    results: list[tuple[str, float, float, str]] = []

    webp_jobs: list[tuple[str, str, int, int]] = [
        ("registrarconta.png", "registrarconta.webp", 1024, 84),
        ("cadeado.png", "cadeado.webp", 600, 84),
        ("auth-blue-orbits.png", "auth-blue-orbits.webp", 768, 78),
        ("logo icon.png", "logo-icon.webp", 256, 86),
        ("hero-tools.png", "hero-tools.webp", 820, 82),
        ("wallet-illustration.png", "wallet-illustration.webp", 512, 84),
        ("linkcredit-coin-icon.png", "linkcredit-coin-icon.webp", 256, 88),
        ("client-home-hero-trust.jpg", "client-home-hero-trust.webp", 960, 82),
        ("helper-hero-bg.jpg", "helper-hero-bg.webp", 768, 80),
        ("helper-hero-blue-ribbon.jpg", "helper-hero-blue-ribbon.webp", 960, 80),
        ("linkcredits-store-background.jpg", "linkcredits-store-background.webp", 960, 78),
        ("linkcredit-popular-stack.jpg", "linkcredit-popular-stack.webp", 640, 84),
        ("linkcredit-pro-stack.jpg", "linkcredit-pro-stack.webp", 640, 84),
        ("linkcredit-power-stack.jpg", "linkcredit-power-stack.webp", 640, 84),
    ]

    for src_name, dst_name, max_dim, quality in webp_jobs:
        src = BRAND / src_name
        dst = BRAND / dst_name
        if not src.exists():
            print(f"SKIP missing {src_name}")
            continue
        before = bytes_kb(src)
        size = optimize_to_webp(src, dst, max_dim, quality)
        after = bytes_kb(dst)
        results.append((dst_name, before, after, f"{size[0]}x{size[1]}"))
        print(f"WEBP {src_name} -> {dst_name}: {before:.0f}KB -> {after:.0f}KB ({size[0]}x{size[1]})")

    png_inplace_jobs: list[tuple[str, int]] = [
        ("linkhelp-handshake-icon.png", 192),
        ("linkhelp-logo.png", 400),
        ("linkhelp-app-source.png", 400),
    ]

    for src_name, max_dim in png_inplace_jobs:
        src = BRAND / src_name
        if not src.exists():
            print(f"SKIP missing {src_name}")
            continue
        backup = src.with_suffix(src.suffix + ".bak")
        shutil.copy2(src, backup)
        before = bytes_kb(src)
        size = optimize_png_inplace(src, max_dim)
        after = bytes_kb(src)
        backup.unlink(missing_ok=True)
        results.append((src_name, before, after, f"{size[0]}x{size[1]} (png)"))
        print(f"PNG  {src_name}: {before:.0f}KB -> {after:.0f}KB ({size[0]}x{size[1]})")

    total_before = sum(r[1] for r in results)
    total_after = sum(r[2] for r in results)
    print(f"\nOptimized {len(results)} assets")
    print(f"Batch total: {total_before:.0f}KB -> {total_after:.0f}KB (-{100 * (1 - total_after / total_before):.1f}%)")


if __name__ == "__main__":
    main()
