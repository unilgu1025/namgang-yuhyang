# 대장선 필살기 '불 끄기' 연기 텍스처 (래스터로 직접 그림). 실행: python scripts/gen-snuff.py
# 꺼진 유등 위로 보랏빛 검은 연기가 말려 올라가고, 아래에 사그라드는 불씨가 남는다.
import numpy as np
from PIL import Image, ImageFilter

W, H = 256, 384
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

def noise(scale):
    small = rng.random((H // scale + 2, W // scale + 2)).astype(np.float32)
    return np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255

turb = sum(noise(s) / i for i, s in enumerate([48, 24, 12, 6], 1)) / 2.08
alpha = np.zeros((H, W), np.float32)
# 아래에서 위로 흔들리며 퍼지는 연기 기둥: 높이마다 중심이 사인파로 휘고 폭이 넓어진다
for k in range(3):
    t = 1 - yy / H                      # 0 = 아래, 1 = 위
    cx = W / 2 + np.sin(t * 7 + k * 2.1) * (18 + 40 * t) + (k - 1) * 14 * t
    width = 14 + 70 * t ** 1.2
    alpha += np.exp(-((xx - cx) / width) ** 2) * np.clip(t * 3.2, 0, 1) * (1 - t) ** 0.6 * (0.8 - k * 0.15)
alpha *= 0.55 + 0.9 * turb
alpha = np.clip(alpha, 0, 1) ** 1.3

# 색: 아래는 짙은 남보라, 위로 갈수록 옅은 회청색으로 흩어진다
t = (1 - yy / H)[..., None]
dark = np.array([34, 22, 48], np.float32)
light = np.array([96, 104, 128], np.float32)
rgb = dark * (1 - t) + light * t + (turb[..., None] - 0.5) * 40

# 사그라드는 불씨: 아래 가운데 작은 주황 점
ember = np.exp(-(((xx - W / 2) / 16) ** 2 + ((yy - H * 0.9) / 10) ** 2))
rgb = rgb * (1 - ember[..., None]) + np.array([255, 150, 60], np.float32) * ember[..., None]
alpha = np.maximum(alpha, ember * 0.95)

img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8), 'RGBA')
img = img.filter(ImageFilter.GaussianBlur(1.5))
img.save('public/assets/fx_snuff.png', optimize=True)
print('public/assets/fx_snuff.png', img.size)
