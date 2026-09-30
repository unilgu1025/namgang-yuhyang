import assert from 'node:assert/strict';
import { WAVES } from './defense-data.ts';

// 물결 구성이 기획서 §7 숫자와 맞는지 (안개·배 수, 마지막 물결 끝의 대장선)
const count = (w: number, t: string) => WAVES[w].spawns.filter((s) => s === t).length;
assert.deepEqual([count(0, 'mist'), count(0, 'boat')], [12, 4]);
assert.deepEqual([count(1, 'mist'), count(1, 'boat'), count(1, 'boss')], [16, 7, 1]);
assert.equal(WAVES.at(-1)!.spawns.at(-1), 'boss');
// 배가 앞에 몰려 나오지 않는다: 첫 1/3 구간의 배 비율이 전체보다 낮다
for (const w of WAVES) {
  const third = w.spawns.slice(0, Math.floor(w.spawns.length / 3));
  const ratio = (a: string[]) => a.filter((s) => s !== 'mist').length / a.length;
  assert.ok(ratio(third) < ratio(w.spawns), w.name);
}
console.log('defense data ok');
