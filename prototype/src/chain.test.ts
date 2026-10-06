import assert from 'node:assert/strict';
import { GAP, advance, insert, lantern, popAt } from './chain.ts';

const row = (colors: number[], head = 1000) => colors.map((c, i) => lantern(c, head - i * GAP));
const colors = (b: { c: number }[]) => b.map((l) => l.c).join('');

// 꼬리가 밀면 붙어 있는 행렬 전체가 같이 간다
{
  const b = row([0, 1, 2]);
  advance(b, 1, 10, 0);
  assert.deepEqual(b.map((l) => l.s), [1010, 1010 - GAP, 1010 - 2 * GAP]);
}

// 같은 색 셋째를 끼우면 터진다. 두 개뿐이면 남는다
{
  const b = row([1, 0, 0, 2]);
  insert(b, 2, false, 0); // 두 번째 0 뒤에
  assert.equal(colors(b), '10002');
  assert.equal(popAt(b, 3).length, 3);
  assert.equal(colors(b), '12');
  const c = row([1, 0, 2]);
  const at = insert(c, 1, true, 0);
  assert.equal(popAt(c, at).length, 0);
}

// 끼우면 앞쪽 붙은 유등들이 한 칸씩 밀린다
{
  const b = row([1, 2, 3]);
  insert(b, 2, false, 4);
  for (let i = 0; i + 1 < b.length; i++) assert.ok(b[i].s - b[i + 1].s >= GAP - 1e-9);
}

// 가운데가 터져 끊겼는데 양쪽 색이 같으면 앞 묶음이 끌려와 붙고, 붙은 자리에서 연쇄가 난다
{
  const b = row([2, 2, 1, 1, 1, 2, 3]);
  popAt(b, 3); // 1 셋 → 2 2 | 2 3
  assert.equal(colors(b), '2223');
  let joined: number[] = [];
  for (let t = 0; t < 200 && !joined.length; t++) joined = advance(b, 0.02, 0, 300);
  assert.deepEqual(joined, [2]);
  assert.equal(popAt(b, joined[0]).length, 3);
  assert.equal(colors(b), '3');
}

// 끊긴 양쪽 색이 다르면 앞 묶음은 멈춰 있고 꼬리가 따라와 밀어 붙인다
{
  const b = row([1, 1, 2, 2, 2, 3]);
  popAt(b, 3);
  const frontS = b[0].s;
  advance(b, 0.1, 50, 300);
  assert.equal(b[0].s, frontS);
  let joined: number[] = [];
  for (let t = 0; t < 400 && !joined.length; t++) joined = advance(b, 0.02, 100, 300);
  assert.deepEqual(joined, [2]);
}
console.log('chain ok');
