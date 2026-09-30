// 디펜스게임.md §4~7 수치. 실제 플레이로 조절한다.
// 향 게이지: 적 수를 줄인 뒤에도 물결마다 한 번은 찰 수 있게 처치당 8% (약 13마리)

export type UnitType = 'guard' | 'comfort';
export type EnemyType = 'mist' | 'boat' | 'boss';

export const MAX_LEVEL = 4;
/** 합성(유등 2개 → 1개)이 확실히 이득이 되도록 2보다 크게 */
export const LEVEL_MUL = 2.3;
export const GUARD_CHANCE = 0.65;

export const UNIT = {
  guard: { name: '수호등', role: '사거리 안에서 성에 가장 가까운 적에게 빛 구슬을 쏩니다.', damage: 12, every: 0.8, range: 250, slow: 0, slowPerLevel: 0 },
  comfort: { name: '안부등', role: '사거리 안의 모든 적을 느리게 하고, 1초마다 물결 피해를 줍니다.', damage: 5, every: 1, range: 200, slow: 0.25, slowPerLevel: 0.08 },
};
export const MAX_SLOW = 0.7;
/** 모든 유등 타격(빛 구슬·물결)에 적용 */
export const CRIT = { chance: 0.15, mul: 2 };

export const ENEMY: Record<EnemyType, { hp: number; speed: number; leak: number; seeds: number; incense: number; scale: number }> = {
  mist: { hp: 40, speed: 172, leak: 1, seeds: 4, incense: 0.08, scale: 0.62 },
  boat: { hp: 155, speed: 90, leak: 2, seeds: 9, incense: 0.08, scale: 0.62 },
  boss: { hp: 1800, speed: 42, leak: 6, seeds: 40, incense: 0.2, scale: 1 },
};

/** 주사위는 자주 굴릴 수 있게: 비용 증가 폭을 작게, 처치 보상은 넉넉히 */
export const START = { seeds: 50, integrity: 10, freeUnits: 3, rollCost: 8, rollStep: 3, waveBonus: 30 };

/** 향 피우기(필살기): 일반 적은 power로 모두 쓰러지고, 대장선은 power + 최대 체력 × bossRatio */
export const INCENSE = { power: 999, bossRatio: 0.3 };

export type Wave = { name: string; hpMul: number; gap: number; spawns: EnemyType[] };

/** 안개와 배를 고르게 섞는다. 배는 뒤쪽에 조금 몰리게. */
function mix(mist: number, boat: number): EnemyType[] {
  const out: EnemyType[] = [];
  const total = mist + boat;
  let b = 0;
  for (let i = 0; i < total; i++) {
    const wantBoats = Math.round(((i + 1) / total) ** 1.3 * boat);
    out.push(b < wantBoats ? (b++, 'boat') : 'mist');
  }
  return out;
}

export const WAVES: Wave[] = [
  { name: '첫째 물결', hpMul: 1.3, gap: 0.9, spawns: mix(12, 4) },
  { name: '마지막 물결', hpMul: 4.4, gap: 0.7, spawns: [...mix(16, 7), 'boss'] },
];

export type Bonus = { guardDmg: number; comfortSlow: number; comfortRange: number; incenseGain: number };
export type CardId = 'wick' | 'ripple' | 'sachet' | 'wall' | 'seeds';

export const CARDS: Record<CardId, { name: string; desc: string; icon: string }> = {
  wick: { name: '심지 돋우기', desc: '모든 수호등 피해 +30%', icon: 'assets/d/guard_idle1.webp' },
  ripple: { name: '잔물결', desc: '안부등 둔화 +10%p, 사거리 +15%', icon: 'assets/d/comfort_idle1.webp' },
  sachet: { name: '향 주머니', desc: '향 게이지 충전량 +50%', icon: 'assets/sachet.png' },
  wall: { name: '성벽 보수', desc: '성 불빛 +3 (최대 10)', icon: 'assets/d/end_intact.jpg' },
  seeds: { name: '등불씨 꾸러미', desc: '등불씨 +60', icon: 'assets/d/dice2.webp' },
};
