// 유등 잇기(주마식) 유등 행렬. 화면과 무관한 순수 규칙만 둔다 → chain.test.ts가 검사.
// 행렬은 물길 위 거리 s로만 표현한다. balls[0]이 맨 앞(소용돌이에 가장 가까움), 마지막이 꼬리.

export const GAP = 44; // 붙어 있는 유등 중심 간격 (지름)
const TOUCH = GAP + 0.5;

export type Lantern = { id: number; c: number; s: number };

let nextId = 1;
export const lantern = (c: number, s = 0): Lantern => ({ id: nextId++, c, s });

export const touching = (front: Lantern, back: Lantern) => front.s - back.s <= TOUCH;

/**
 * 한 프레임 이동.
 * - 꼬리 묶음만 speed로 앞으로 가고, 붙어 있는 앞 유등을 밀어낸다(떨어진 앞 묶음은 멈춰 기다린다).
 * - 끊긴 자리 양쪽 색이 같으면 앞 묶음이 pull 속도로 뒤로 끌려와 붙는다.
 * 반환: 이번 프레임에 새로 붙은 자리(뒤쪽 유등의 인덱스) → 그 자리에서 짝 맞추기를 검사한다.
 */
export function advance(balls: Lantern[], dt: number, speed: number, pull: number): number[] {
  if (!balls.length) return [];
  const gapped = new Set<number>();
  for (let i = 0; i + 1 < balls.length; i++) if (!touching(balls[i], balls[i + 1])) gapped.add(balls[i + 1].id);

  // 같은 색으로 끊긴 앞 묶음을 뒤로 당긴다 (뒤쪽 묶음부터 처리해야 겹치지 않는다)
  for (let i = balls.length - 2; i >= 0; i--) {
    const front = balls[i], back = balls[i + 1];
    if (touching(front, back) || front.c !== back.c) continue;
    const move = Math.min(pull * dt, front.s - back.s - GAP);
    for (let j = i; j >= 0; j--) {
      balls[j].s -= move;
      if (j > 0 && !touching(balls[j - 1], balls[j])) break; // 이 묶음의 맨 앞까지만
    }
  }

  balls[balls.length - 1].s += speed * dt;
  for (let i = balls.length - 2; i >= 0; i--) balls[i].s = Math.max(balls[i].s, balls[i + 1].s + GAP);

  const joined: number[] = [];
  for (let i = 0; i + 1 < balls.length; i++) if (gapped.has(balls[i + 1].id) && touching(balls[i], balls[i + 1])) joined.push(i + 1);
  return joined;
}

/** 맞은 유등 hit의 앞(ahead) 또는 뒤에 끼워 넣는다. 끼운 유등의 인덱스를 돌려준다. */
export function insert(balls: Lantern[], hit: number, ahead: boolean, c: number): number {
  const at = ahead ? hit : hit + 1;
  const s = ahead ? balls[hit].s + GAP : balls[hit].s;
  const l = lantern(c, s);
  balls.splice(at, 0, l);
  // 끼운 자리 앞쪽으로 붙어 있던 유등들을 한 칸씩 밀어낸다
  for (let i = at - 1; i >= 0; i--) {
    if (balls[i].s >= balls[i + 1].s + GAP) break;
    balls[i].s = balls[i + 1].s + GAP;
  }
  return at;
}

/** i를 포함해 붙어 있는 같은 색이 3개 이상이면 지우고 지운 유등들을 돌려준다. */
export function popAt(balls: Lantern[], i: number): Lantern[] {
  if (i < 0 || i >= balls.length) return [];
  const c = balls[i].c;
  let a = i, b = i;
  while (a > 0 && balls[a - 1].c === c && touching(balls[a - 1], balls[a])) a--;
  while (b + 1 < balls.length && balls[b + 1].c === c && touching(balls[b], balls[b + 1])) b++;
  return b - a + 1 >= 3 ? balls.splice(a, b - a + 1) : [];
}
