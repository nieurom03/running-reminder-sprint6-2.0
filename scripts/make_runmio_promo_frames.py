#!/usr/bin/env python3
"""Generate a 60-second vertical Runmio promo as JPEG frames + original music."""

from __future__ import annotations

import math
import shutil
import struct
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "promo"
FRAMES = OUT / "frames"
WIDTH, HEIGHT = 1080, 1920
FPS = 20
DURATION = 60.0

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def fade_for(local_t: float, length: float, edge: float = 0.6) -> float:
    return min(1.0, local_t / edge, (length - local_t) / edge)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def gradient_background() -> Image.Image:
    top = (5, 18, 34)
    bottom = (7, 89, 87)
    img = Image.new("RGB", (WIDTH, HEIGHT))
    px = img.load()
    for y in range(HEIGHT):
        t = y / max(1, HEIGHT - 1)
        r = int(lerp(top[0], bottom[0], t))
        g = int(lerp(top[1], bottom[1], t))
        b = int(lerp(top[2], bottom[2], t))
        for x in range(WIDTH):
            px[x, y] = (r, g, b)
    return img


BASE = gradient_background()


def rounded_screen(screen: Image.Image, width: int) -> Image.Image:
    ratio = screen.height / screen.width
    h = int(width * ratio)
    sc = screen.resize((width, h), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (width, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, h - 1), radius=54, fill=255)
    sc.putalpha(mask)
    return sc


def add_background_shapes(img: Image.Image, t: float):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shift = int(20 * math.sin(t * 0.35))
    d.ellipse((-220 + shift, 1150, 540 + shift, 1910), fill=(66, 230, 182, 24))
    d.ellipse((720 - shift, -190, 1250 - shift, 340), fill=(89, 153, 255, 28))
    layer = layer.filter(ImageFilter.GaussianBlur(55))
    img.alpha_composite(layer)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill, width=940, spacing=12):
    box = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=spacing, align="center")
    tw = box[2] - box[0]
    x = (WIDTH - tw) // 2
    draw.multiline_text((x, y), text, font=fnt, fill=fill, spacing=spacing, align="center")


def fit_multiline(draw, text, box_width, max_size, min_size=36, bold=True):
    size = max_size
    while size >= min_size:
        f = font(size, bold)
        bb = draw.multiline_textbbox((0, 0), text, font=f, spacing=10)
        if bb[2] - bb[0] <= box_width:
            return f
        size -= 2
    return font(min_size, bold)


def draw_screen_scene(base: Image.Image, screen: Image.Image, title: str, subtitle: str, kicker: str,
                      local_t: float, length: float, side: int):
    alpha = fade_for(local_t, length)
    scene = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(scene)

    d.rounded_rectangle((70, 64, 390, 126), radius=31, fill=(255, 255, 255, 30), outline=(255, 255, 255, 48), width=2)
    d.text((98, 80), kicker, font=font(24, True), fill=(161, 255, 225, 255))

    tf = fit_multiline(d, title, 930, 66, 48, True)
    d.multiline_text((72, 150), title, font=tf, fill=(255, 255, 255, 255), spacing=8)
    d.multiline_text((74, 254), subtitle, font=font(30), fill=(218, 235, 239, 230), spacing=7)

    p = ease(local_t / length)
    target_w = int(668 + 18 * p)
    phone = rounded_screen(screen, target_w)
    x = (WIDTH - phone.width) // 2 + int(side * 14 * math.sin(p * math.pi))
    y = 380 + int(9 * math.sin(p * math.pi))

    shadow = Image.new("RGBA", (phone.width + 100, phone.height + 100), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((50, 42, 50 + phone.width, 42 + phone.height), radius=60, fill=(0, 0, 0, 135))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    scene.alpha_composite(shadow, (x - 50, y - 42))
    scene.alpha_composite(phone, (x, y))

    if alpha < 1:
        a = scene.getchannel("A").point(lambda v: int(v * alpha))
        scene.putalpha(a)
    base.alpha_composite(scene)


def draw_intro(base: Image.Image, icon: Image.Image, local_t: float, length: float, outro=False):
    scene = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(scene)
    alpha = fade_for(local_t, length, 0.7)
    p = ease(local_t / length)

    icon_w = int(264 + 18 * math.sin(p * math.pi))
    ic = icon.resize((icon_w, icon_w), Image.Resampling.LANCZOS)
    x = (WIDTH - icon_w) // 2
    y = 405 if not outro else 360

    glow = Image.new("RGBA", (430, 430), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((40, 40, 390, 390), fill=(54, 232, 179, 95))
    glow = glow.filter(ImageFilter.GaussianBlur(48))
    scene.alpha_composite(glow, ((WIDTH - 430) // 2, y - 80))
    scene.alpha_composite(ic, (x, y))

    if not outro:
        draw_centered(d, "RUNMIO", 720, font(92, True), (255, 255, 255, 255))
        draw_centered(d, "Chạy đúng kế hoạch.\nTiến bộ mỗi tuần.", 865, font(58, True), (255, 255, 255, 255), spacing=15)
        draw_centered(d, "Running Planner  •  GPS  •  Reminder", 1095, font(30), (190, 239, 225, 235))
        d.rounded_rectangle((250, 1230, 830, 1316), radius=43, fill=(255, 255, 255, 28), outline=(255, 255, 255, 45), width=2)
        draw_centered(d, "Tập trung vào điều quan trọng: chạy đều.", 1253, font(29, True), (255, 255, 255, 245))
    else:
        draw_centered(d, "RUNMIO", 690, font(92, True), (255, 255, 255, 255))
        draw_centered(d, "Lập kế hoạch. Chạy. Tiến bộ.", 855, font(54, True), (255, 255, 255, 255))
        draw_centered(d, "Dành cho người chạy muốn duy trì sự đều đặn.", 980, font(31), (206, 238, 232, 240))
        d.rounded_rectangle((275, 1120, 805, 1224), radius=52, fill=(46, 226, 168, 255))
        draw_centered(d, "SẮP CÓ TRÊN APP STORE", 1150, font(30, True), (3, 38, 38, 255))
        draw_centered(d, "runmio", 1350, font(28, True), (174, 232, 218, 220))

    if alpha < 1:
        a = scene.getchannel("A").point(lambda v: int(v * alpha))
        scene.putalpha(a)
    base.alpha_composite(scene)


def generate_music(path: Path, duration: float = 60.0):
    sr = 44100
    chords = [
        (130.81, 164.81, 196.00),
        (110.00, 138.59, 164.81),
        (146.83, 174.61, 220.00),
        (98.00, 123.47, 146.83),
    ]
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        total = int(duration * sr)
        chunk = bytearray()
        for i in range(total):
            t = i / sr
            chord = chords[int(t // 4) % len(chords)]
            local = t % 4.0
            env = min(1.0, local / 0.8, (4.0 - local) / 0.8)
            pad = sum(math.sin(2 * math.pi * f * t) for f in chord) / len(chord)
            shimmer = math.sin(2 * math.pi * chord[1] * 2 * t) * 0.14
            pulse_phase = t % 0.5
            pulse_env = math.exp(-pulse_phase * 12.0)
            pulse = math.sin(2 * math.pi * (55 + 8 * math.exp(-pulse_phase * 10)) * t) * pulse_env * 0.28
            master = min(1.0, t / 1.5, (duration - t) / 2.0)
            sample = (pad * 0.13 * env + shimmer * 0.04 + pulse * 0.05) * master
            v = int(max(-1, min(1, sample)) * 32767)
            chunk += struct.pack("<hh", v, v)
            if len(chunk) >= 65536:
                wf.writeframesraw(chunk)
                chunk.clear()
        if chunk:
            wf.writeframesraw(chunk)


def main():
    OUT.mkdir(exist_ok=True)
    if FRAMES.exists():
        shutil.rmtree(FRAMES)
    FRAMES.mkdir(parents=True)

    shots_dir = ROOT / "screenshots/app-store/iphone-6.9/en"
    shots = {p.stem: Image.open(p).convert("RGB") for p in sorted(shots_dir.glob("*.png"))}
    icon = Image.open(ROOT / "assets/images/icon.png").convert("RGBA")

    segments = [
        (0, 4, "intro", None, None, None),
        (4, 12, "01-dashboard", "Mỗi tuần rõ ràng hơn", "Theo dõi quãng đường kế hoạch và thực tế\ntrong một màn hình.", "01  •  DASHBOARD"),
        (12, 20, "02-plan", "Giáo án luôn trong tầm tay", "Biết hôm nay chạy gì và cả tuần\nđang tiến triển ra sao.", "02  •  TRAINING PLAN"),
        (20, 28, "03-create-plan", "Tạo kế hoạch theo mục tiêu", "Chọn ngày đích, ngày chạy và long run.\nRunmio sắp lịch giúp bạn.", "03  •  PERSONAL PLAN"),
        (28, 38, "04-record", "Nhấn Start. Runmio ghi lại.", "GPS, quãng đường, thời gian và pace —\nkể cả khi màn hình khóa.", "04  •  GPS WORKOUT"),
        (38, 46, "05-calendar", "Nhìn lại từng buổi chạy", "Calendar giúp bạn thấy lịch tập, kết quả\nvà sự đều đặn theo thời gian.", "05  •  CALENDAR"),
        (46, 54, "06-settings", "Dữ liệu của bạn, bạn kiểm soát", "Backup có mật khẩu. Lưu local.\nKhông cần tài khoản để bắt đầu.", "06  •  BACKUP & PRIVACY"),
        (54, 60, "outro", None, None, None),
    ]

    total_frames = int(DURATION * FPS)
    for idx in range(total_frames):
        t = idx / FPS
        frame = BASE.copy().convert("RGBA")
        add_background_shapes(frame, t)

        for si, (start, end, key, title, subtitle, kicker) in enumerate(segments):
            if start <= t < end or (idx == total_frames - 1 and key == "outro"):
                local = t - start
                length = end - start
                if key == "intro":
                    draw_intro(frame, icon, local, length, False)
                elif key == "outro":
                    draw_intro(frame, icon, local, length, True)
                else:
                    draw_screen_scene(frame, shots[key], title, subtitle, kicker, local, length, -1 if si % 2 else 1)
                break

        out = FRAMES / f"frame_{idx:04d}.jpg"
        frame.convert("RGB").save(out, quality=88, optimize=False, subsampling=1)
        if idx % (FPS * 5) == 0:
            print(f"frames: {idx}/{total_frames}")

    generate_music(OUT / "Runmio_Promo_Music_60s.wav")
    print(f"Generated {total_frames} frames at {FPS} fps in {FRAMES}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
