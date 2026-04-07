from PIL import Image, ImageDraw, ImageFilter
import os

def make_icon(size, output_path, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * (0.12 if maskable else 0.0))
    r = size // 2

    # Background: deep purple radial gradient via concentric circles
    for i in range(r, -1, -1):
        t = i / r
        ri = int(30 + 60 * t)
        gi = int(10 + 20 * t)
        bi = int(80 + 120 * t)
        draw.ellipse([r - i, r - i, r + i, r + i], fill=(ri, gi, bi, 255))

    s = size - pad * 2
    cx, cy = r, r

    lobe_w = int(s * 0.40)
    lobe_h = int(s * 0.36)
    lobe_y = int(cy - s * 0.05)

    # Left brain lobe
    draw.ellipse(
        [cx - int(s * 0.44), lobe_y - lobe_h, cx - int(s * 0.44) + lobe_w * 2, lobe_y + lobe_h],
        fill=(220, 200, 255, 230), outline=(0, 220, 255, 255), width=max(1, size // 64),
    )
    # Right brain lobe
    draw.ellipse(
        [cx - int(s * 0.06), lobe_y - lobe_h, cx - int(s * 0.06) + lobe_w * 2, lobe_y + lobe_h],
        fill=(200, 180, 255, 230), outline=(0, 220, 255, 255), width=max(1, size // 64),
    )

    # Bottom stem
    stem_w = int(s * 0.14)
    draw.rounded_rectangle(
        [cx - stem_w, lobe_y + int(lobe_h * 0.7), cx + stem_w, lobe_y + int(lobe_h * 1.55)],
        radius=stem_w // 2, fill=(180, 160, 240, 200),
    )

    # Centre fissure
    lw = max(1, size // 48)
    draw.line(
        [(cx, lobe_y - lobe_h + int(s * 0.05)), (cx, lobe_y + lobe_h - int(s * 0.05))],
        fill=(0, 220, 255, 220), width=lw,
    )

    # Neural-spark accent dots
    dot_positions = [
        (cx - int(s * 0.28), lobe_y - int(s * 0.18)),
        (cx + int(s * 0.26), lobe_y - int(s * 0.20)),
        (cx - int(s * 0.10), lobe_y + int(s * 0.12)),
        (cx + int(s * 0.10), lobe_y - int(s * 0.08)),
        (cx - int(s * 0.32), lobe_y + int(s * 0.08)),
        (cx + int(s * 0.30), lobe_y + int(s * 0.06)),
    ]
    dr = max(2, size // 32)
    for dx, dy in dot_positions:
        draw.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=(0, 255, 200, 240))

    # Soft glow composite
    glow = img.filter(ImageFilter.GaussianBlur(radius=max(1, size // 40)))
    img = Image.alpha_composite(glow, img)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"  wrote {output_path} ({size}x{size})")


BASE = r"C:\Users\x-noo\OneDrive\Desktop\lumosity-clone\mobile_app"

# Web PWA icons
make_icon(192, f"{BASE}/web/icons/Icon-192.png")
make_icon(512, f"{BASE}/web/icons/Icon-512.png")
make_icon(192, f"{BASE}/web/icons/Icon-maskable-192.png", maskable=True)
make_icon(512, f"{BASE}/web/icons/Icon-maskable-512.png", maskable=True)
make_icon(32,  f"{BASE}/web/favicon.png")

# Android mipmap densities
for density, sz in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    make_icon(sz, f"{BASE}/android/app/src/main/res/mipmap-{density}/ic_launcher.png")
    make_icon(sz, f"{BASE}/android/app/src/main/res/mipmap-{density}/ic_launcher_round.png")

# iOS AppIcon sizes
ios_sizes = {
    "Icon-App-20x20@1x": 20, "Icon-App-20x20@2x": 40, "Icon-App-20x20@3x": 60,
    "Icon-App-29x29@1x": 29, "Icon-App-29x29@2x": 58, "Icon-App-29x29@3x": 87,
    "Icon-App-40x40@1x": 40, "Icon-App-40x40@2x": 80, "Icon-App-40x40@3x": 120,
    "Icon-App-60x60@2x": 120, "Icon-App-60x60@3x": 180,
    "Icon-App-76x76@1x": 76, "Icon-App-76x76@2x": 152,
    "Icon-App-83.5x83.5@2x": 167,
    "Icon-App-1024x1024@1x": 1024,
}
ios_path = f"{BASE}/ios/Runner/Assets.xcassets/AppIcon.appiconset"
for name, sz in ios_sizes.items():
    make_icon(sz, f"{ios_path}/{name}.png")

# Also update mobile_flutter icons
mf = r"C:\Users\x-noo\OneDrive\Desktop\lumosity-clone\mobile_flutter"
for density, sz in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    p = f"{mf}/android/app/src/main/res/mipmap-{density}"
    if os.path.isdir(p):
        make_icon(sz, f"{p}/ic_launcher.png")

print("All icons written!")
