import assert from 'node:assert/strict';
import { MAPS, SLOT_COUNT, SLOT_PATH_GAP, SLOT_SPACING, distToPath, sample } from './maps.ts';

for (const [id, m] of Object.entries(MAPS)) {
  const pts = sample(m.path);
  assert.equal(m.slots.length, SLOT_COUNT, `${id}: 자리 수`);
  for (const s of m.slots) {
    assert.ok(distToPath(s, pts) >= SLOT_PATH_GAP - 1, `${id}: 자리 (${s.x},${s.y})가 물길과 겹침`);
    assert.ok(s.x >= 60 && s.x <= 660 && s.y >= 180 && s.y <= 960, `${id}: 자리 (${s.x},${s.y})가 전장 밖`);
    // 사거리가 짧은 안부등(200)을 놓아도 물길에 닿아야 쓸모 있는 자리
    assert.ok(distToPath(s, pts) < 200, `${id}: 자리 (${s.x},${s.y})가 물길에서 너무 멂`);
  }
  for (const a of m.slots) for (const b of m.slots) {
    if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= SLOT_SPACING - 1, `${id}: 자리끼리 겹침`);
  }
  // 성 입구(끝점)는 전장 안
  const [gx, gy] = [m.path.at(-2)!, m.path.at(-1)!];
  assert.ok(gy > 132 && gy < 1010 && gx > 0 && gx < 720, `${id}: 성 입구 위치`);
}
console.log('maps ok');
