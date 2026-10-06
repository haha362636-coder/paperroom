# Windows 图标：从 Mac 版的满铺 1024 图标生成带圆角透明边的多尺寸 icon.ico。
# Windows 不会替应用裁圆角，所以这里自己裁，并在四周留一点呼吸空间。
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent.parent / 'desktop' / 'assets' / 'paperroom-icon-1024.png'
if not SOURCE.exists():
    SOURCE = HERE.parent.parent / 'desktop' / 'assets' / 'paperroom-icon-source.png'

src = Image.open(SOURCE).convert('RGBA').resize((1024, 1024), Image.LANCZOS)
canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
inset, radius = 40, 190
# Supersampled rounded-rect mask for smooth corners.
mask = Image.new('L', (4096, 4096), 0)
ImageDraw.Draw(mask).rounded_rectangle((inset * 4, inset * 4, 4096 - inset * 4, 4096 - inset * 4), radius * 4, fill=255)
mask = mask.resize((1024, 1024), Image.LANCZOS)
inner = src.resize((1024 - inset * 2, 1024 - inset * 2), Image.LANCZOS)
canvas.paste(inner, (inset, inset))
canvas.putalpha(mask)
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
canvas.save(HERE / 'icon.ico', sizes=sizes)
canvas.resize((256, 256), Image.LANCZOS).save(HERE / 'icon-preview.png')
print('icon.ico', ', '.join(f'{w}' for w, _ in sizes), 'from', SOURCE.name)
