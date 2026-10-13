// 그림 방명록. 태블릿 펜·손가락으로 그리고 「남기기」를 누르면
// 1) 이 기기의 방명록 벽(IndexedDB)에 바로 붙고  2) 구글 드라이브로 보낸다(실패하면 다음에 다시 보냄).
import { send } from './entry.ts';

const W = 1200, H = 800; // 저장되는 그림 크기 (3:2)
const PENS = {
  brush: { label: '붓', size: 16 }, // 굵고, 펜 압력에 따라 굵기가 달라진다
  glow: { label: '빛 펜', size: 6 }, // 가늘고 유등처럼 빛난다
} as const;
type PenId = keyof typeof PENS;
const COLORS = [
  { name: '유등 금빛', v: '#fcc441' },
  { name: '등불 흰빛', v: '#fdf6bf' },
  { name: '홍매', v: '#ff7f96' },
  { name: '남강 청록', v: '#5ccbd6' },
  { name: '대숲 초록', v: '#8fd98b' },
  { name: '달빛 흰색', v: '#ffffff' },
];

type Pt = { x: number; y: number; p: number };
type Stroke = { pen: PenId; color: string; pts: Pt[] };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('pad');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d')!;
const bg = new Image();
bg.src = 'assets/bg.jpg';

let pen: PenId = 'brush';
let color = COLORS[0].v;
let strokes: Stroke[] = [];
let cur: Stroke | null = null;

function paintBackground() {
  ctx.save();
  ctx.fillStyle = '#0b1820';
  ctx.fillRect(0, 0, W, H);
  if (bg.complete && bg.naturalWidth) {
    // 강 배경을 가로로 채워 흐리게 깐다
    const s = W / bg.naturalWidth;
    ctx.globalAlpha = 0.35;
    ctx.drawImage(bg, 0, (H - bg.naturalHeight * s) / 2, W, bg.naturalHeight * s);
  }
  ctx.restore();
}

/** 선 한 토막(a→b)을 펜 모양대로 그린다 */
function segment(s: Stroke, a: Pt, b: Pt) {
  const { size } = PENS[s.pen];
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  if (s.pen === 'brush') {
    ctx.lineWidth = size * (0.35 + 1.3 * ((a.p + b.p) / 2));
    ctx.stroke();
  } else {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.stroke(); // 두 번 겹쳐 빛번짐을 진하게
  }
  ctx.restore();
}

function dot(s: Stroke, a: Pt) { segment(s, a, { ...a, x: a.x + 0.01 }); }

function redraw() {
  paintBackground();
  for (const s of strokes) {
    dot(s, s.pts[0]);
    for (let i = 1; i < s.pts.length; i++) segment(s, s.pts[i - 1], s.pts[i]);
  }
}

function point(e: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  // 마우스·손가락은 압력이 없으니 중간값
  const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, p };
}

canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 일부 기기 */ }
  cur = { pen, color, pts: [point(e)] };
  strokes.push(cur);
  dot(cur, cur.pts[0]);
  refreshButtons();
});
canvas.addEventListener('pointermove', (e) => {
  if (!cur) return;
  const evs = e.getCoalescedEvents?.() ?? [];
  for (const ev of evs.length ? evs : [e]) { // 펜이 촘촘히 보낸 점들 (없으면 이 이벤트 하나)
    const p = point(ev);
    segment(cur, cur.pts.at(-1)!, p);
    cur.pts.push(p);
  }
});
const end = () => { cur = null; };
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);

// ── 도구 ──────────────────────────────────────────────

const penBox = $('pens');
for (const [id, p] of Object.entries(PENS) as [PenId, (typeof PENS)[PenId]][]) {
  const b = Object.assign(document.createElement('button'), { type: 'button', className: 'tool', textContent: p.label });
  b.dataset.pen = id;
  b.onclick = () => { pen = id; refreshButtons(); };
  penBox.append(b);
}
const colorBox = $('colors');
for (const c of COLORS) {
  const b = Object.assign(document.createElement('button'), { type: 'button', className: 'swatch', title: c.name });
  b.style.setProperty('--c', c.v);
  b.setAttribute('aria-label', c.name);
  b.dataset.color = c.v;
  b.onclick = () => { color = c.v; refreshButtons(); };
  colorBox.append(b);
}

function refreshButtons() {
  penBox.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pen === pen)));
  colorBox.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === color)));
  $<HTMLButtonElement>('undo').disabled = $<HTMLButtonElement>('clear').disabled = $<HTMLButtonElement>('save').disabled = !strokes.length;
}

$('undo').onclick = () => { strokes.pop(); redraw(); refreshButtons(); };
$('clear').onclick = () => { strokes = []; redraw(); refreshButtons(); };

// ── 저장: 이 기기 벽 + 구글 드라이브 ─────────────────────

type Entry = { id?: number; at: number; image: string; sent: boolean };

const db = new Promise<IDBDatabase>((ok, fail) => {
  const req = indexedDB.open('guestbook', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('drawings', { keyPath: 'id', autoIncrement: true });
  req.onsuccess = () => ok(req.result);
  req.onerror = () => fail(req.error);
});
const store = async (mode: IDBTransactionMode) => (await db).transaction('drawings', mode).objectStore('drawings');
const wait = <T>(r: IDBRequest<T>) => new Promise<T>((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });

async function upload(e: Entry) {
  try {
    if ((await send({ type: 'drawing', image: e.image })) !== 'ok') return;
    e.sent = true;
    await wait((await store('readwrite')).put(e));
  } catch { /* 오프라인 등: 다음에 페이지를 열 때 다시 보낸다 */ }
}

async function renderWall() {
  const all = (await wait((await store('readonly')).getAll())) as Entry[];
  const wall = $('wall');
  wall.replaceChildren(...all.reverse().slice(0, 60).map((e) => {
    const img = new Image(W, H);
    img.src = e.image;
    img.alt = `${new Date(e.at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}에 남긴 그림`;
    return img;
  }));
  $('wall-count').textContent = `${all.length}개의 안부`;
  return all;
}

$('save').onclick = async () => {
  if (!strokes.length) return;
  const entry: Entry = { at: Date.now(), image: canvas.toDataURL('image/jpeg', 0.85), sent: false };
  entry.id = (await wait((await store('readwrite')).add(entry))) as number;
  strokes = [];
  redraw();
  refreshButtons();
  await renderWall();
  toast();
  upload(entry);
};

function toast() {
  const t = $('toast');
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2200);
}

bg.onload = redraw;
redraw();
refreshButtons();
// 전에 못 보낸 그림이 있으면 다시 보낸다
renderWall().then((all) => all.filter((e) => !e.sent).forEach(upload)).catch(() => {});
