// 디펜스 물길(맵). 좌표는 논리 해상도 720×1280, 전장은 대략 y 132~1010.
export type Pt = { x: number; y: number };
export type MapId = 's' | 'spiral';
export type MapDef = {
  name: string;
  desc: string;
  path: number[]; // [x0, y0, x1, y1, ...] 스플라인 제어점. 마지막 점이 성 입구
  slots: Pt[];
  hpMul: number; // 맵 난이도 보정: 적 체력 배율
  startLabel: Pt; // '어둠이 오는 곳' 글자 위치(시작점 기준 오프셋)
  gateLabel: Pt; // '성 입구' 글자 위치(끝점 기준 오프셋)
};

export const SLOT_COUNT = 10;
/** 유등 자리 중심 ↔ 경로 중심 최소 거리: 자리 반지름 48 + 물길 띠 반폭 32 + 여유 */
export const SLOT_PATH_GAP = 84;
/** 자리끼리 최소 간격 */
export const SLOT_SPACING = 112;

/** 폴리라인을 step 간격으로 촘촘히 샘플링 */
export function sample(path: number[], step = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 3 < path.length; i += 2) {
    const [x0, y0, x1, y1] = path.slice(i, i + 4);
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n });
  }
  out.push({ x: path.at(-2)!, y: path.at(-1)! });
  return out;
}

export const distToPath = (p: Pt, pts: Pt[]) => Math.min(...pts.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));

/**
 * 경로와 겹치지 않으면서 가까운 칸부터 고른다(가까울수록 사거리에 경로가 많이 들어온다).
 * 격자 후보 → 경로와 SLOT_PATH_GAP 이상 떨어진 것만 → 가까운 순으로 서로 SLOT_SPACING 이상 떨어지게 count개.
 */
export function autoSlots(path: number[], count = SLOT_COUNT, box = { x0: 70, x1: 650, y0: 190, y1: 950 }): Pt[] {
  const pts = sample(path);
  const cands: (Pt & { d: number })[] = [];
  for (let y = box.y0; y <= box.y1; y += 10) {
    for (let x = box.x0; x <= box.x1; x += 10) {
      const d = distToPath({ x, y }, pts);
      if (d >= SLOT_PATH_GAP) cands.push({ x, y, d });
    }
  }
  cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  const picked: Pt[] = [];
  for (const c of cands) {
    if (picked.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= SLOT_SPACING)) picked.push({ x: c.x, y: c.y });
    if (picked.length === count) break;
  }
  return picked.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** 달팽이 나선: 화면 위에서 들어와 시계 방향으로 1.5바퀴 돌며 가운데 성으로 말려 든다 */
function spiral(): number[] {
  const cx = 360, cy = 560, r0 = 300, turns = 1.5, rEnd = 70;
  const k = (r0 - rEnd) / (turns * Math.PI * 2);
  const out = [cx, 140];
  for (let t = 0; t <= turns * Math.PI * 2 + 1e-6; t += 0.2) {
    const a = -Math.PI / 2 + t, r = r0 - k * t;
    out.push(Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a)));
  }
  return out;
}

const S_PATH = [400, 250, 320, 330, 220, 440, 300, 560, 480, 640, 520, 760, 400, 850, 250, 920, 330, 1000];
const SPIRAL_PATH = spiral();

export const MAPS: Record<MapId, MapDef> = {
  s: {
    name: '굽이치는 강',
    desc: '강물을 따라 S자로 내려오는 물길. 양쪽 강가에 유등을 둔다.',
    path: S_PATH,
    slots: [330, 480, 630, 780, 930].flatMap((y) => [{ x: 92, y }, { x: 628, y }]),
    hpMul: 1,
    startLabel: { x: 0, y: -42 },
    gateLabel: { x: 96, y: -8 },
  },
  spiral: {
    name: '소용돌이',
    desc: '달팽이처럼 1.5바퀴 돌며 가운데 성으로 말려 드는 물길. 고리 사이 유등은 여러 바퀴를 한꺼번에 노린다.',
    path: SPIRAL_PATH,
    slots: autoSlots(SPIRAL_PATH),
    // 고리 사이 유등이 여러 바퀴를 한꺼번에 때려서 S자보다 훨씬 유리하다(보정 전 봇 3전 3승)
    hpMul: 1.25,
    startLabel: { x: -130, y: 6 },
    gateLabel: { x: 0, y: 46 },
  },
};

export const isMapId = (v: unknown): v is MapId => v === 's' || v === 'spiral';
