#!/bin/bash
# 从图标源图重新生成 desktop/assets/Paperroom.icns
#
# 背景：macOS 26+ 会把「边缘 alpha <= 252」的图标强制套上灰色圆角方框。
# 详见 desktop/tools/build-icon.py 顶部说明。
# 改图标时请一律走本脚本，不要直接拿源图去 sips + iconutil。
set -euo pipefail

cd "$(dirname "$0")/.."
assets=desktop/assets
source_png="$assets/paperroom-icon-source.png"
flat_png="$assets/paperroom-icon-1024.png"
iconset="$assets/Paperroom.iconset"
icns="$assets/Paperroom.icns"

[ -f "$source_png" ] || { echo "缺少源图：$source_png"; exit 1; }

echo "==> 1/4 生成合规底图（满铺不透明 + alpha 全 255）"
/usr/bin/python3 desktop/tools/build-icon.py "$source_png" "$flat_png"

echo "==> 2/4 生成标准尺寸图标集"
rm -rf "$iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$flat_png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  sips -z "$((size * 2))" "$((size * 2))" "$flat_png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done

echo "==> 3/4 打包 icns"
iconutil -c icns "$iconset" -o "$icns"

echo "==> 4/4 校验所有尺寸都不含中间 alpha"
/usr/bin/python3 - "$icns" <<'PY'
import glob
import subprocess
import sys
import tempfile

from PIL import Image

icns = sys.argv[1]
with tempfile.TemporaryDirectory() as tmp:
    iconset = f"{tmp}/check.iconset"
    subprocess.run(["iconutil", "-c", "iconset", icns, "-o", iconset], check=True)
    failed = False
    for path in sorted(glob.glob(f"{iconset}/*.png")):
        hist = Image.open(path).convert("RGBA").split()[-1].histogram()
        bad = sum(hist[1:253])
        name = path.rsplit("/", 1)[-1]
        print(f"    {name:24s} 中间 alpha 像素 = {bad}")
        if bad:
            failed = True
    if failed:
        sys.exit("校验失败：图标仍会被 macOS 套灰框。")
print("校验通过：图标在 macOS 26/27 上不会再出现灰色方框。")
PY

echo
echo "完成：$icns"
echo "下一步：跑 desktop/build-release.sh 重新出包，并把新应用装到 /Applications。"
