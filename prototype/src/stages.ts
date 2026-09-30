// 스와이프게임.md §8. 수치는 실제 플레이로 조절한다.
// 구슬은 턴마다 +1. 새 행 조각 HP = 그 순간 구슬 수 × hpMul 범위 → 구슬이 늘어도 압박이 유지된다.
/** row 등불 띠(가로 줄 피해) · col 향 기둥(세로 줄 피해) · whirl 소용돌이(방향 무작위) · bomb 연등(3×3 폭발) */
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

export const STAGES: StageDef[] = [
  {
    name: '첫 물결',
    clearText: '첫 물결 위의 어둠이 걷혔습니다.',
    seed: 11,
    balls: 3,
    rows: 12,
    start: { blocks: 8, hp: [2, 5], knots: 3 },
    perRow: [2, 3],
    hpMul: [0.7, 1.3],
    knotChance: 0.25,
    sachetTurns: [2, 5, 8],
    items: { chance: 0.35, pool: ['row', 'col', 'whirl'] },
  },
  {
    name: '흐르는 그림자',
    clearText: '강 위에 등불이 다시 켜졌습니다.',
    seed: 23,
    balls: 5,
    rows: 14,
    start: { blocks: 11, hp: [3, 7], knots: 4 },
    perRow: [2, 4],
    hpMul: [0.9, 1.8],
    knotChance: 0.35,
    sachetTurns: [3, 7, 11],
    items: { chance: 0.4, pool: ['row', 'col', 'whirl', 'bomb'] },
  },
];
