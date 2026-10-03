#!/usr/bin/env python3
"""Generate the sharper 60-second Runmio v3 promo as high-quality JPEG frames."""

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
FRAMES = OUT / "frames-v3"
WIDTH, HEIGHT = 1080, 1920
FPS = 30
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


def draw_chip(layer: Image.Image, text: str, x: int, y: int, accent=False, scale=1.0):
    d = ImageDraw.Draw(layer)
    fnt = font(max(18, int(23 * scale)), True)
    bb = d.textbbox((0, 0), text, font=fnt)
    w = int(bb[2] - bb[0] + 50 * scale)
    h = int(60 * scale)
    fill = (60, 235, 175, 238) if accent else (255, 255, 255, 226)
    color = (3, 55, 46, 255) if accent else (18, 55, 48, 255)
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=fill,
                        outline=(255, 255, 255, 90), width=2)
    d.text((x + int(25 * scale), y + int(15 * scale)), text, font=fnt, fill=color)


def draw_screen_scene(base: Image.Image, screen: Image.Image, title: str, subtitle: str, kicker: str,
                      local_t: float, length: float, side: int, chips=None):
    alpha = fade_for(local_t, length)
    scene = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(scene)

    d.rounded_rectangle((70, 64, 390, 126), radius=31, fill=(255, 255, 255, 30), outline=(255, 255, 255, 48), width=2)
    d.text((98, 80), kicker, font=font(24, True), fill=(161, 255, 225, 255))

    tf = fit_multiline(d, title, 930, 66, 48, True)
    d.multiline_text((72, 150), title, font=tf, fill=(255, 255, 255, 255), spacing=8)
    d.multiline_text((74, 254), subtitle, font=font(30), fill=(218, 235, 239, 230), spacing=7)

    p = ease(local_t / length)
    enter = ease(local_t / 0.75)
    # Keep the app UI large enough to remain readable on a phone after social
    # platforms recompress the video.
    target_w = int(710 + 18 * p + 6 * math.sin(local_t * 1.7))
    phone = rounded_screen(screen, target_w)
    target_x = (WIDTH - phone.width) // 2
    x = int(lerp(target_x + side * 330, target_x + side * 10 * math.sin(local_t), enter))
    y = 352 + int(10 * math.sin(local_t * 0.8))

    shadow = Image.new("RGBA", (phone.width + 100, phone.height + 100), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((50, 42, 50 + phone.width, 42 + phone.height), radius=60, fill=(0, 0, 0, 135))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    scene.alpha_composite(shadow, (x - 50, y - 42))
    scene.alpha_composite(phone, (x, y))

    # Two compact callouts are enough; more would cover the enlarged UI.
    for i, text in enumerate((chips or [])[:2]):
        show = ease((local_t - 0.45 - i * 0.20) / 0.5)
        if show <= 0:
            continue
        cx = 72 if i == 0 else 560
        cy = 286 + int((1 - show) * 32)
        draw_chip(scene, text, cx, cy, accent=(i == 0), scale=0.72 + 0.08 * show)

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


def mock_screen(kind: str) -> Image.Image:
    w, h = 1320, 2868
    img = Image.new("RGB", (w, h), (242, 249, 245))
    d = ImageDraw.Draw(img)
    d.text((72, 65), "9:41", font=font(38, True), fill=(22, 48, 37))
    d.text((1085, 66), "●  ◒  ▰", font=font(28, True), fill=(22, 48, 37))

    def title(head, sub):
        d.text((70, 180), "‹", font=font(72, True), fill=(18, 60, 45))
        d.text((150, 193), head, font=font(52, True), fill=(20, 48, 37))
        d.text((72, 300), sub, font=font(28), fill=(92, 116, 104))

    def card(y1, y2):
        d.rounded_rectangle((58, y1, w - 58, y2), radius=40, fill=(255, 255, 255),
                            outline=(215, 232, 223), width=3)

    def label(x, y, text):
        d.text((x, y), text, font=font(24, True), fill=(92, 116, 104))

    def field(x, y, fw, text, fh=100):
        d.rounded_rectangle((x, y, x + fw, y + fh), radius=25, fill=(247, 251, 249),
                            outline=(210, 227, 219), width=3)
        d.text((x + 28, y + 29), text, font=font(29, True), fill=(26, 58, 45))

    if kind == "edit-workout":
        title("Chỉnh sửa buổi tập", "Điều chỉnh một ngày mà không ảnh hưởng phần còn lại.")
        card(395, 2110)
        y = 455
        label(98, y, "NGÀY")
        field(98, y + 48, 1124, "Thứ Bảy, 24/10/2026")
        y += 190
        label(98, y, "LOẠI BUỔI TẬP")
        cx = 98
        for text, active, cw in [("EASY", False, 210), ("TEMPO", True, 230),
                                 ("INTERVAL", False, 250), ("LONG RUN", False, 270)]:
            fill = (18, 48, 38) if active else (239, 248, 243)
            tc = (255, 255, 255) if active else (40, 75, 61)
            d.rounded_rectangle((cx, y + 48, cx + cw, y + 130), radius=41, fill=fill)
            d.text((cx + 25, y + 75), text, font=font(23, True), fill=tc)
            cx += cw + 15
        y += 190
        label(98, y, "QUÃNG ĐƯỜNG")
        field(98, y + 48, 1124, "8.0 km")
        y += 190
        label(98, y, "PACE TỪ                                  PACE ĐẾN")
        field(98, y + 48, 540, "6:50 /km")
        field(682, y + 48, 540, "7:20 /km")
        y += 190
        label(98, y, "GHI CHÚ")
        field(98, y + 48, 1124, "Tempo có kiểm soát, giữ nhịp đều.", 180)
        d.rounded_rectangle((98, 1870, 1222, 1985), radius=30, fill=(17, 46, 37))
        d.text((445, 1905), "LƯU THAY ĐỔI", font=font(30, True), fill=(255, 255, 255))
    elif kind == "edit-result":
        title("Sửa kết quả", "TEMPO · kế hoạch 8.0 km · 2026-10-24")
        card(395, 2050)
        y = 455
        label(98, y, "QUÃNG ĐƯỜNG THỰC TẾ")
        field(98, y + 48, 1124, "8.12 km")
        y += 190
        label(98, y, "THỜI GIAN")
        field(98, y + 48, 1124, "00 : 57 : 54")
        y += 190
        d.rounded_rectangle((98, y, 1222, y + 150), radius=30, fill=(220, 248, 234))
        d.text((128, y + 28), "PACE TÍNH TOÁN", font=font(23, True), fill=(76, 112, 94))
        d.text((128, y + 72), "7:08 /km", font=font(43, True), fill=(10, 118, 72))
        y += 190
        label(98, y, "AVG HR                                      MAX HR")
        field(98, y + 48, 540, "158 bpm")
        field(682, y + 48, 540, "171 bpm")
        y += 190
        label(98, y, "CẢM NHẬN")
        cx = 98
        for i, text in enumerate(["Rất tốt", "Tốt", "Bình thường", "Khó"]):
            active = i == 1
            cw = 245
            d.rounded_rectangle((cx, y + 48, cx + cw, y + 133), radius=42,
                                fill=(210, 246, 228) if active else (244, 249, 246),
                                outline=(37, 181, 111) if active else (216, 230, 223), width=3)
            d.text((cx + 25, y + 76), text, font=font(22, True),
                   fill=(18, 110, 69) if active else (66, 88, 78))
            cx += cw + 18
        y += 195
        label(98, y, "GHI CHÚ")
        field(98, y + 48, 1124, "Cảm giác tốt, giữ pace ổn định.", 160)
        d.rounded_rectangle((98, 1810, 1222, 1925), radius=30, fill=(17, 46, 37))
        d.text((475, 1845), "LƯU KẾT QUẢ", font=font(30, True), fill=(255, 255, 255))
    elif kind == "restore":
        title("Cài đặt", "Sao lưu & khôi phục dữ liệu Runmio")
        card(395, 1810)
        d.text((100, 455), "SAO LƯU & KHÔI PHỤC", font=font(31, True), fill=(15, 124, 76))
        rows = [
            ("☁", "Sao lưu vào iCloud Drive", "Bảo vệ bằng mật khẩu tùy chọn"),
            ("⇩", "Khôi phục / nhập giáo án", "Chọn file .rrbackup từ iCloud Drive"),
            ("▣", "Dữ liệu được giữ local", "Giáo án, workout, kết quả và cài đặt"),
        ]
        y = 545
        for ico, head, sub in rows:
            d.rounded_rectangle((92, y, 1228, y + 290), radius=32, fill=(243, 250, 246),
                                outline=(218, 234, 226), width=2)
            d.ellipse((130, y + 70, 238, y + 178), fill=(214, 246, 229))
            d.text((162, y + 92), ico, font=font(36, True), fill=(16, 136, 82))
            d.text((275, y + 60), head, font=font(34, True), fill=(23, 54, 42))
            d.text((275, y + 120), sub, font=font(26), fill=(91, 116, 104))
            if "Khôi phục" in head:
                d.rounded_rectangle((275, y + 185, 1110, y + 244), radius=29, fill=(255, 255, 255),
                                    outline=(201, 223, 212), width=2)
                d.text((300, y + 201), "Runmio-backup-2026-10-01.rrbackup",
                       font=font(22, True), fill=(57, 83, 70))
            y += 330
    else:
        raise ValueError(kind)
    return img


def settings_full_content() -> Image.Image:
    """Build a source-faithful tall Settings screen so every group can be shown."""
    w, h = 1320, 3820
    img = Image.new("RGB", (w, h), (241, 248, 244))
    d = ImageDraw.Draw(img)
    text = (22, 49, 38)
    muted = (103, 124, 113)
    green = (18, 133, 81)
    border = (214, 230, 221)
    card = (255, 255, 255)
    soft = (229, 247, 238)

    d.text((72, 64), "9:41", font=font(38, True), fill=text)
    d.text((1080, 66), "●  ◒  ▰", font=font(28, True), fill=text)
    d.text((72, 170), "Cài đặt", font=font(58, True), fill=text)

    icon = Image.open(ROOT / "assets/images/icon.png").convert("RGBA").resize((146, 146), Image.Resampling.LANCZOS)
    d.rounded_rectangle((58, 270, 1262, 520), radius=42, fill=card, outline=border, width=3)
    img.paste(icon, (92, 322), icon)
    d.text((278, 325), "Runmio", font=font(43, True), fill=text)
    d.text((278, 390), "Phiên bản 1.0.0", font=font(28), fill=muted)

    def group_title(y: int, label: str):
        d.text((76, y), label.upper(), font=font(27, True), fill=green)

    def row(y: int, title: str, value: str = "", icon_text: str = "●", switch: bool = False):
        d.ellipse((96, y + 31, 160, y + 95), fill=soft)
        d.text((116, y + 47), icon_text, font=font(20, True), fill=green)
        d.text((194, y + 27), title, font=font(31, True), fill=text)
        if value:
            bb = d.textbbox((0, 0), value, font=font(27))
            d.text((1134 - (bb[2] - bb[0]), y + 31), value, font=font(27), fill=muted)
        if switch:
            d.rounded_rectangle((1080, y + 34, 1185, y + 88), radius=27, fill=(41, 194, 113))
            d.ellipse((1133, y + 39, 1179, y + 84), fill=(255, 255, 255))
        elif not value:
            d.text((1140, y + 30), "›", font=font(44, True), fill=(152, 171, 161))

    # General
    group_title(590, "Chung")
    d.rounded_rectangle((58, 645, 1262, 1085), radius=42, fill=card, outline=border, width=3)
    row(665, "Ngôn ngữ", "Tiếng Việt", "G")
    d.line((194, 795, 1215, 795), fill=border, width=2)
    row(805, "Giao diện", "Theo hệ thống", "A")
    d.line((194, 935, 1215, 935), fill=border, width=2)
    row(945, "Thông báo nhắc workout", icon_text="N", switch=True)

    # Backup & sync
    group_title(1150, "Sao lưu & đồng bộ")
    d.rounded_rectangle((58, 1205, 1262, 1515), radius=42, fill=card, outline=border, width=3)
    row(1225, "Sao lưu vào iCloud Drive", icon_text="↑")
    d.line((194, 1355, 1215, 1355), fill=border, width=2)
    row(1365, "Khôi phục từ iCloud Drive", icon_text="↓")

    # Data stats
    group_title(1580, "Dữ liệu")
    d.rounded_rectangle((58, 1635, 1262, 2155), radius=42, fill=card, outline=border, width=3)
    d.text((98, 1688), "Hoàn thành giáo án", font=font(31, True), fill=text)
    d.text((1025, 1682), "76%", font=font(42, True), fill=green)
    d.rounded_rectangle((98, 1760, 1222, 1790), radius=15, fill=(224, 236, 230))
    d.rounded_rectangle((98, 1760, 952, 1790), radius=15, fill=(39, 183, 109))
    stats = [("18 / 24", "Workout hoàn thành"), ("126.4 km", "Tổng quãng đường"), ("4", "Buổi tuần này")]
    x = 98
    for value, label in stats:
        d.rounded_rectangle((x, 1845, x + 342, 2070), radius=30, fill=(245, 250, 247), outline=border, width=2)
        d.text((x + 28, 1888), value, font=font(34, True), fill=text)
        d.multiline_text((x + 28, 1950), label, font=font(23), fill=muted, spacing=4)
        x += 372

    # Other
    group_title(2225, "Khác")
    d.rounded_rectangle((58, 2280, 1262, 2860), radius=42, fill=card, outline=border, width=3)
    other_rows = [
        (2300, "Chính sách quyền riêng tư", "P"),
        (2440, "Điều khoản sử dụng", "T"),
        (2580, "Xem lại hướng dẫn ban đầu", "R"),
        (2720, "Góp ý & báo lỗi", "F"),
    ]
    for i, (y, title, ico) in enumerate(other_rows):
        row(y, title, icon_text=ico)
        if i < len(other_rows) - 1:
            d.line((194, y + 130, 1215, y + 130), fill=border, width=2)

    # Small privacy/local-first explanation seen when the user scrolls to the bottom.
    d.rounded_rectangle((58, 2950, 1262, 3290), radius=42, fill=(235, 249, 242), outline=(194, 229, 210), width=3)
    d.text((98, 3000), "Dữ liệu của bạn", font=font(34, True), fill=text)
    d.multiline_text(
        (98, 3065),
        "Giáo án, workout và kết quả được lưu trên thiết bị.\nBạn có thể chủ động sao lưu / khôi phục qua iCloud Drive.",
        font=font(27), fill=muted, spacing=10,
    )
    d.text((98, 3210), "Không cần tài khoản để bắt đầu.", font=font(28, True), fill=green)
    d.text((72, 3490), "RUNMIO", font=font(28, True), fill=(148, 170, 159))
    d.text((72, 3540), "Lập kế hoạch. Chạy. Tiến bộ.", font=font(25), fill=(148, 170, 159))
    return img


def draw_settings_scene(base: Image.Image, full_screen: Image.Image, title: str, subtitle: str,
                        kicker: str, local_t: float, length: float):
    alpha = fade_for(local_t, length)
    scene = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(scene)
    d.rounded_rectangle((70, 64, 390, 126), radius=31, fill=(255, 255, 255, 30), outline=(255, 255, 255, 48), width=2)
    d.text((98, 80), kicker, font=font(24, True), fill=(161, 255, 225, 255))
    tf = fit_multiline(d, title, 930, 62, 46, True)
    d.multiline_text((72, 148), title, font=tf, fill=(255, 255, 255, 255), spacing=8)
    d.multiline_text((74, 248), subtitle, font=font(27), fill=(218, 235, 239, 235), spacing=6)

    # Hold the top, scroll through Backup/Data/Other, then hold the bottom.
    if local_t < 1.15:
        progress = 0.0
    elif local_t > length - 1.1:
        progress = 1.0
    else:
        progress = ease((local_t - 1.15) / max(0.1, length - 2.25))
    viewport_h = 2868
    max_scroll = max(0, full_screen.height - viewport_h)
    scroll_y = int(max_scroll * progress)
    viewport = full_screen.crop((0, scroll_y, full_screen.width, scroll_y + viewport_h))
    phone = rounded_screen(viewport, 720)
    x = (WIDTH - phone.width) // 2
    y = 350

    shadow = Image.new("RGBA", (phone.width + 100, phone.height + 100), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((50, 42, 50 + phone.width, 42 + phone.height), radius=60, fill=(0, 0, 0, 145))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    scene.alpha_composite(shadow, (x - 50, y - 42))
    scene.alpha_composite(phone, (x, y))

    # A small progress strip makes the Settings coverage obvious without
    # covering any app text.
    labels = ["Chung", "Backup", "Dữ liệu", "Khác"]
    for i, label in enumerate(labels):
        px = 74 + i * 235
        active = progress >= i / 4.0 - 0.03
        fill = (62, 235, 177, 245) if active else (255, 255, 255, 130)
        d.rounded_rectangle((px, 305, px + 190, 338), radius=16, fill=fill)
        bb = d.textbbox((0, 0), label, font=font(19, True))
        d.text((px + (190 - (bb[2] - bb[0])) // 2, 311), label, font=font(19, True),
               fill=(8, 55, 45, 255) if active else (230, 242, 240, 240))

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
    shots["restore"] = mock_screen("restore")
    shots["edit-workout"] = mock_screen("edit-workout")
    shots["edit-result"] = mock_screen("edit-result")
    shots["settings-full"] = settings_full_content()
    icon = Image.open(ROOT / "assets/images/icon.png").convert("RGBA")

    segments = [
        (0, 3.0, "intro", None, None, None, []),
        (3.0, 8.0, "01-dashboard", "Tiến độ ngay khi mở app",
         "Kế hoạch và số km thực tế trong tuần\nhiển thị rõ trên Dashboard.",
         "01  •  DASHBOARD", ["22 km / tuần", "Kế hoạch vs thực tế"]),
        (8.0, 13.0, "02-plan", "Toàn bộ giáo án trong tầm tay",
         "Xem buổi sắp tới, từng tuần và\ntiến độ của cả giáo án.",
         "02  •  GIÁO ÁN", ["4 buổi / tuần", "Long run rõ ràng"]),
        (13.0, 18.5, "03-create-plan", "Tạo giáo án theo mục tiêu",
         "Chọn 5K, 10K, 21K hoặc 42K, ngày race,\npace hiện tại và ngày chạy.",
         "03  •  TẠO GIÁO ÁN", ["Race date", "Pace", "Ngày chạy", "Long run"]),
        (18.5, 24.0, "restore", "Nhập giáo án khi đổi máy",
         "Khôi phục giáo án, workout và kết quả\ntừ file Runmio backup trên iCloud Drive.",
         "04  •  NHẬP / KHÔI PHỤC", [".rrbackup", "iCloud Drive", "Có mật khẩu"]),
        (24.0, 30.0, "edit-workout", "Giáo án luôn có thể chỉnh",
         "Đổi ngày, loại bài, quãng đường, pace\nvà ghi chú cho từng buổi chạy.",
         "05  •  CHỈNH GIÁO ÁN", ["Đổi ngày", "Đổi pace", "Đổi loại bài"]),
        (30.0, 36.5, "04-record", "Nhấn Start và chạy",
         "GPS ghi quãng đường, thời gian và pace.\nTiếp tục ghi khi màn hình khóa.",
         "06  •  GPS WORKOUT", ["GPS live", "Pace", "Quãng đường"]),
        (36.5, 43.0, "edit-result", "Kết quả vẫn chỉnh lại được",
         "Cập nhật distance, duration, nhịp tim,\ncảm nhận và ghi chú sau buổi chạy.",
         "07  •  CHỈNH KẾT QUẢ", ["Distance", "Duration", "Feeling", "Heart rate"]),
        (43.0, 48.5, "05-calendar", "Nhìn lại hành trình",
         "Calendar cho biết lịch tập, buổi hoàn thành,\nbỏ lỡ và tiến độ theo thời gian.",
         "08  •  CALENDAR", ["Completed", "Skipped", "Missed"]),
        (48.5, 56.5, "settings-full", "Cài đặt đầy đủ, dễ kiểm soát",
         "Ngôn ngữ • Giao diện • Nhắc chạy • Backup\nDữ liệu • Quyền riêng tư • Điều khoản • Góp ý",
         "09  •  CÀI ĐẶT", []),
        (56.5, 60.0, "outro", None, None, None, []),
    ]

    total_frames = int(DURATION * FPS)
    for idx in range(total_frames):
        t = idx / FPS
        frame = BASE.copy().convert("RGBA")
        add_background_shapes(frame, t)

        for si, (start, end, key, title, subtitle, kicker, chips) in enumerate(segments):
            if start <= t < end or (idx == total_frames - 1 and key == "outro"):
                local = t - start
                length = end - start
                if key == "intro":
                    draw_intro(frame, icon, local, length, False)
                elif key == "outro":
                    draw_intro(frame, icon, local, length, True)
                elif key == "settings-full":
                    draw_settings_scene(frame, shots[key], title, subtitle, kicker, local, length)
                else:
                    draw_screen_scene(frame, shots[key], title, subtitle, kicker, local, length,
                                      -1 if si % 2 else 1, chips)
                break

        out = FRAMES / f"frame_{idx:04d}.jpg"
        frame.convert("RGB").save(out, quality=96, optimize=False, subsampling=0)
        if idx % (FPS * 5) == 0:
            print(f"frames: {idx}/{total_frames}")

    generate_music(OUT / "Runmio_Promo_Music_60s_v3.wav")
    print(f"Generated {total_frames} frames at {FPS} fps in {FRAMES}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
