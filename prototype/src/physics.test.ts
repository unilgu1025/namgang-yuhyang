import assert from 'node:assert/strict';
import { aimDirection, circleRect, reflect, keepVertical, rng } from './physics.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≉ ${b}`);

// 조준: 아래쪽은 취소, 수평에 가까우면 18°로 클램프
assert.equal(aimDirection(10, 20), null);
const flat = aimDirection(100, -5)!;
near(Math.atan2(-flat.y, flat.x) * 180 / Math.PI, 18);
const flatL = aimDirection(-100, -5)!;
near(Math.atan2(-flatL.y, flatL.x) * 180 / Math.PI, 162);
const up = aimDirection(0, -100)!;
near(up.x, 0); near(up.y, -1);

// 원-사각형: 아래에서 올라와 밑면에 닿으면 법선은 아래(+y)
const box = { cx: 0, cy: 0, hw: 40, hh: 30 };
const hit = circleRect({ x: 0, y: 40 }, 13, box)!;
near(hit.n.x, 0); near(hit.n.y, 1); near(hit.depth, 3);
assert.equal(circleRect({ x: 0, y: 50 }, 13, box), null);
// 모서리: 대각 법선
const corner = circleRect({ x: 45, y: 35 }, 13, box)!;
near(corner.n.x, corner.n.y);

// 반사: 위로 가던 구슬이 밑면에 맞으면 아래로
const r = reflect({ x: 3, y: -4 }, { x: 0, y: 1 });
near(r.x, 3); near(r.y, 4);
// 이미 멀어지는 중이면 그대로 (이중 반사 방지)
assert.deepEqual(reflect({ x: 3, y: 4 }, { x: 0, y: 1 }), { x: 3, y: 4 });

// 수평 방지: 속력 유지, 최소 8°
const kv = keepVertical({ x: 100, y: 0.5 });
near(Math.hypot(kv.x, kv.y), Math.hypot(100, 0.5));
assert.ok(Math.abs(kv.y) >= Math.hypot(100, 0.5) * Math.sin(8 * Math.PI / 180) - 1e-9);

// 난수: 같은 시드 → 같은 수열
const a = rng(7), b = rng(7);
for (let i = 0; i < 5; i++) assert.equal(a(), b());

console.log('physics ok');
