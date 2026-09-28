#!/usr/bin/env python3
"""把图标源图转换成 macOS 26+ 合规的 1024x1024 图标底图。

为什么需要这一步（重要，别删）：
    macOS 26 / 27 收紧了应用图标的形状规则。判定条件是「边缘像素的 alpha」：
        alpha >= 253  -> 正常渲染（系统自己裁圆角）
        alpha <= 252  -> 被判定为「不合规图标」，强制套上一层灰色圆角方框
                         （社区称 gray box / squircle jail）
    而 AI 生成的源图几乎必然是「不透明区 alpha = 253 + 边缘抗锯齿与柔和阴影
    的中间 alpha 值」，正好踩中 <=252 这条线。

    所以这里做两件事：
      1. 裁掉柔和阴影，只保留实心主体，再用边缘像素外推把四角填满
         （得到一张满铺不透明的方图，交给系统裁圆角）；
      2. 把所有像素的 alpha 强制为 255，确保没有任何中间值。

    验证：Apple 开发者论坛 thread/797971（实验者 FB22801803）。

用法：
    /usr/bin/python3 desktop/tools/build-icon.py <源图> <输出1024图>
"""

import sys

from PIL import Image

CANVAS = 1024
SOLID_ALPHA = 128      # 判定「实心主体」的 alpha 阈值，用于裁掉柔和阴影
OPAQUE_ALPHA = 250     # 判定「可外推的实心像素」的阈值


def clamp_fill(image):
    """用最近的实心像素向外外推，填满透明区域（四角）。"""
    pixels = image.load()
    solid = image.split()[-1].point(lambda v: 255 if v >= OPAQUE_ALPHA else 0).load()
    w, h = image.size

    for y in range(h):
        last = None
        for x in range(w):
            if solid[x, y]:
                last = pixels[x, y]
            elif last is not None:
                pixels[x, y] = last
        last = None
        for x in range(w - 1, -1, -1):
            if solid[x, y]:
                last = pixels[x, y]
            elif last is not None:
                pixels[x, y] = last
    for x in range(w):
        last = None
        for y in range(h):
            if solid[x, y]:
                last = pixels[x, y]
            elif last is not None:
                pixels[x, y] = last
        last = None
        for y in range(h - 1, -1, -1):
            if solid[x, y]:
                last = pixels[x, y]
            elif last is not None:
                pixels[x, y] = last
    return image


def main():
    if len(sys.argv) != 3:
        sys.exit("用法: build-icon.py <源图> <输出1024图>")
    source, target = sys.argv[1], sys.argv[2]

    src = Image.open(source).convert("RGBA")
    alpha = src.split()[-1]

    bbox = alpha.point(lambda v: 255 if v >= SOLID_ALPHA else 0).getbbox()
    if not bbox:
        sys.exit("源图没有找到不透明主体，已停止。")

    art = src.crop(bbox).resize((CANVAS, CANVAS), Image.LANCZOS)
    art = clamp_fill(art)
    art.putalpha(255)          # 关键：不留任何中间 alpha
    art.save(target)

    check = art.split()[-1].histogram()
    intermediate = sum(check[1:253])
    print(f"源图主体区域: {bbox}")
    print(f"已写出: {target}")
    print(f"alpha 分布: 0={check[0]:,}  1~252={intermediate:,}  255={check[255]:,}")
    if intermediate:
        sys.exit(f"失败：仍有 {intermediate:,} 个中间 alpha 像素，会被系统套灰框。")


if __name__ == "__main__":
    main()
