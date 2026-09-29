export type Vec = { x: number; y: number };
export type Rect = { cx: number; cy: number; hw: number; hh: number };

const DEG = Math.PI / 180;

/** 발사대 → 손가락 벡터를 18°~162° 위쪽 단위벡터로. 손가락이 발사대보다 아래면 null(취소). */
export function aimDirection(dx: number, dy: number, minDeg = 18): Vec | null {
  if (dy > -4) return null;
  let a = Math.atan2(-dy, dx);
  a = Math.min(Math.max(a, minDeg * DEG), (180 - minDeg) * DEG);
  return { x: Math.cos(a), y: -Math.sin(a) };
}

/** 원-사각형 충돌. 겹치면 사각형 밖을 향하는 법선과 겹친 깊이. */
export function circleRect(p: Vec, r: number, b: Rect): { n: Vec; depth: number } | null {
  const qx = Math.max(b.cx - b.hw, Math.min(p.x, b.cx + b.hw));
  const qy = Math.max(b.cy - b.hh, Math.min(p.y, b.cy + b.hh));
  const dx = p.x - qx, dy = p.y - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { n: { x: dx / d, y: dy / d }, depth: r - d };
  }
  // 중심이 사각형 안: 가장 얕은 면으로 밀어낸다
  const ox = b.hw - Math.abs(p.x - b.cx), oy = b.hh - Math.abs(p.y - b.cy);
  return ox < oy
    ? { n: { x: Math.sign(p.x - b.cx) || 1, y: 0 }, depth: ox + r }
    : { n: { x: 0, y: Math.sign(p.y - b.cy) || 1 }, depth: oy + r };
}

export function reflect(v: Vec, n: Vec): Vec {
  const d = v.x * n.x + v.y * n.y;
  return d >= 0 ? v : { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y };
}

/** 완전 수평 반사로 턴이 끝나지 않는 것을 막는다. 속력은 유지. */
export function keepVertical(v: Vec, minDeg = 8): Vec {
  const s = Math.hypot(v.x, v.y);
  const minVy = s * Math.sin(minDeg * DEG);
  if (Math.abs(v.y) >= minVy) return v;
  const vy = (Math.sign(v.y) || 1) * minVy;
  return { x: Math.sign(v.x) * Math.sqrt(s * s - vy * vy), y: vy };
}

/** 결정적 난수 (스테이지 재도전 시 같은 배치). */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
