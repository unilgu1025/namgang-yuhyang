// 유등 잇기: 기존 향등 구슬(ball.png)을 색만 돌려 4색 유등을 만든다. 실행: node scripts/gen-zuma.mjs
import sharp from 'sharp';
const hues = [0, 85, 200, 295]; // 금빛 · 초록 · 파랑 · 분홍 (서로 멀리 떨어진 색)
await Promise.all(hues.map((hue, i) =>
  sharp('public/assets/ball.png').modulate({ hue, saturation: i ? 1.35 : 1 }).png().toFile(`public/assets/z${i}.png`)));
console.log('z0~z3.png');
