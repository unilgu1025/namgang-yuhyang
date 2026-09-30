// 스와이프게임.md §8. 수치는 실제 플레이로 조절한다.
// 구슬은 턴마다 +1. 새 행 조각 HP = 그 순간 구슬 수 × hpMul 범위 → 구슬이 늘어도 압박이 유지된다.
/** row 등불 띠(╱ 사선 피해) · col 향 기둥(╲ 사선 피해) · whirl 소용돌이(방향 무작위) · bomb 연등(3×3 폭발) */
export type ItemKind = 'row' | 'col' | 'whirl' | 'bomb';

export type StageDef = {
  name: string;
  clearText: string;
  seed: number;
  balls: number;
  rows: number;
  start: { blocks: number; hp: [number, number]; knots: number };
  perRow: [number, number];
  hpMul: [number, number];
  knotChance: number;
  sachetTurns: number[];
  /** 새 행마다 chance 확률로 pool에서 하나 (중복 = 가중치) */
  items: { chance: number; pool: ItemKind[] };
};

// 행사장 전시용 한 판(약 45초): 벽돌은 많고 약하게, 매듭(반사 벽)을 늘려 구슬이 많이 튕기게 한다.
export const STAGES: StageDef[] = [
  {
    name: '남강의 물결',
    clearText: '강 위에 등불이 다시 켜졌습니다.',
    seed: 11,
    balls: 8,
    rows: 6,
    start: { blocks: 14, hp: [1, 3], knots: 4 },
    perRow: [3, 5],
    hpMul: [0.2, 0.45],
    knotChance: 0.7,
    sachetTurns: [1, 3],
    items: { chance: 0.6, pool: ['row', 'col', 'whirl', 'bomb'] },
  },
];
