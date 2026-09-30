import Phaser from 'phaser';
import { aimDirection, circleRect, reflect, keepVertical, rng, type Vec, type Rect } from './physics.ts';
import { STAGES, type ItemKind } from './stages.ts';
import { bindSound, buzz, loadSounds, pauseSound, playEnding, sfx, startBgm, toggleSound } from './sound.ts';

// 스와이프게임.md §4 좌표 (논리 해상도 720×1280)
const W = 720, H = 1280, TOP = 130, BOUNDARY_Y = 1050, LAUNCH_Y = 1150;
const COLS = 7, LOSE_ROW = 10;
const BALL_R = 13, MAX_BALLS = 60, PICKUP_R = 28;
const FIRE_GAP = 70, COMBO_MS = 1200, AIM_GRAB_R = 140;
const MARKET_URL = ''; // 온라인 마켓 주소가 정해지면 넣는다. 비어 있으면 결과 화면에서 링크를 숨긴다.

const cellX = (c: number) => 60 + 100 * c;
const cellY = (r: number) => 180 + 90 * r;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Kind = 'block' | 'knot' | 'sachet' | 'echo' | ItemKind;
type Cell = {
  kind: Kind; row: number; col: number; hp: number; maxHp: number; born: number; dead: boolean;
  used?: boolean; // 등불 띠·향 기둥·소용돌이: 한 번이라도 닿으면 그 턴이 끝날 때 사라진다
  obj: Phaser.GameObjects.Container; body?: Phaser.GameObjects.NineSlice; label?: Phaser.GameObjects.Text;
};
type Ball = {
  x: number; y: number; vx: number; vy: number; state: 'wait' | 'fly' | 'home'; breaks: number[];
  inside: Set<Cell>; // 지금 겹쳐 있는 아이템. 들어오는 순간에만 발동한다
  sprite: Phaser.GameObjects.Image; trail: Phaser.GameObjects.Image;
};

const ITEM_TEXT: Record<ItemKind, string> = {
  row: '등불 띠 · 가로 한 줄',
  col: '향 기둥 · 세로 한 줄',
  whirl: '소용돌이 · 방향 바뀜',
  bomb: '연등 · 주변 폭발',
};
const isPickup = (k: Kind) => k !== 'block' && k !== 'knot';

// 세션 안에서만 유지. 새로고침하면 처음부터 (저장 없음).
const session = { stage: 0 };

const rectOf = (c: Cell): Rect =>
  c.kind === 'knot'
    ? { cx: cellX(c.col), cy: cellY(c.row), hw: 48, hh: 12 }
    : { cx: cellX(c.col), cy: cellY(c.row), hw: 46, hh: 38 };

class Swipe extends Phaser.Scene {
  private cells: Cell[] = [];
  private balls: Ball[] = [];
  private state: 'aim' | 'fly' | 'busy' | 'over' = 'aim';
  private rand = rng(1);
  private launcherX = W / 2;
  private nextX: number | null = null;
  private turn = 0;
  private rowsSpawned = 0;
  private damage = 1;
  private pendingBonus = 0;
  private pendingBalls = 0;
  private fired = 0;
  private fireTimer = 0;
  private turnTime = 0;
  private dir: Vec = { x: 0, y: -1 };
  private aiming = false;
  private aimDir: Vec | null = null;
  private aimG!: Phaser.GameObjects.Graphics;
  private boundary!: Phaser.GameObjects.Image;

  constructor() { super('swipe'); }

  preload() {
    for (const k of ['ball', 'block', 'knot', 'sachet', 'break', 'trail', 'boundary', 'item_row', 'item_col', 'item_whirl', 'item_bomb']) {
      this.load.image(k, `assets/${k}.png`);
    }
    this.load.image('bg', 'assets/bg.jpg');
    loadSounds(this, ['bgm', 'ending', 'wall', 'hit', 'break', 'sachet', 'echo', 'bell', 'click']);
  }

  create() {
    const stage = STAGES[session.stage];
    Object.assign(this, {
      cells: [], balls: [], state: 'aim', rand: rng(stage.seed), launcherX: W / 2, nextX: null, turn: 0,
      rowsSpawned: 0, damage: 1, pendingBonus: 0, pendingBalls: 0, aiming: false, aimDir: null,
    });

    this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    this.boundary = this.add.image(W / 2, BOUNDARY_Y, 'boundary');
    this.aimG = this.add.graphics().setDepth(20);

    for (let i = 0; i < stage.balls; i++) this.addBall();

    // 시작 배치: 위 3행에 매듭과 조각을 흩뿌린다
    const slots = this.shuffle([...Array(COLS * 3).keys()]);
    for (let i = 0; i < stage.start.knots; i++) this.makeCell('knot', Math.floor(slots[i] / COLS), slots[i] % COLS, 0);
    for (let i = stage.start.knots; i < stage.start.knots + stage.start.blocks; i++) {
      const [lo, hi] = stage.start.hp;
      this.makeCell('block', Math.floor(slots[i] / COLS), slots[i] % COLS, lo + Math.floor(this.rand() * (hi - lo + 1)));
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state !== 'aim') return;
      if (p.y > BOUNDARY_Y || Phaser.Math.Distance.Between(p.x, p.y, this.launcherX, LAUNCH_Y) < AIM_GRAB_R) {
        this.aiming = true;
        this.updateAim(p);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.aiming) this.updateAim(p); });
    const release = () => {
      if (!this.aiming) return;
      this.aiming = false;
      this.aimG.clear();
      if (this.aimDir) this.fire(this.aimDir);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.keyAim(e));

    ui.hud(stage.name, this.balls.length, 0);
    ui.hint(session.stage === 0);
    this.cameras.main.fadeIn(300, 4, 5, 6);
  }

  private shuffle<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private addBall() {
    const trail = this.add.image(this.launcherX, LAUNCH_Y, 'trail')
      .setOrigin(0.92, 0.5).setDisplaySize(110, 22).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    const sprite = this.add.image(this.launcherX, LAUNCH_Y, 'ball').setDisplaySize(44, 44).setDepth(10);
    this.balls.push({ x: this.launcherX, y: LAUNCH_Y, vx: 0, vy: 0, state: 'wait', breaks: [], inside: new Set(), sprite, trail });
  }

  private makeCell(kind: Kind, row: number, col: number, hp: number) {
    const obj = this.add.container(cellX(col), cellY(row));
    const cell: Cell = { kind, row, col, hp, maxHp: hp, born: this.turn, dead: false, obj };
    if (kind === 'block') {
      cell.body = this.add.nineslice(0, 0, 'block', undefined, 92, 76, 26, 26, 22, 22);
      cell.label = this.add.text(0, 0, String(hp), {
        fontFamily: 'Gowun Dodum', fontSize: '30px', color: '#fdf6bf', stroke: '#040506', strokeThickness: 5,
      }).setOrigin(0.5);
      obj.add([cell.body, cell.label]);
      this.paintBlock(cell);
    } else if (kind === 'knot') {
      obj.add(this.add.image(0, 0, 'knot').setDisplaySize(100, 21));
    } else if (kind === 'sachet') {
      obj.add(this.add.image(0, 0, 'sachet').setDisplaySize(60, 60));
    } else if (kind !== 'echo') {
      obj.add(this.add.image(0, 0, `item_${kind}`).setDisplaySize(72, 72));
    } else {
      // 잔향 조각: 옅은 백색 연무 + 회전 표시 (색만으로 구분하지 않도록)
      const g = this.add.graphics();
      g.fillStyle(0xfdf6bf, 0.22).fillCircle(0, 0, PICKUP_R);
      g.lineStyle(3, 0xfdf6bf, 0.9).beginPath().arc(0, 0, PICKUP_R - 6, 0, Math.PI * 1.4).strokePath();
      obj.add(g);
      if (!reducedMotion) this.tweens.add({ targets: g, angle: 360, duration: 1600, repeat: -1 });
    }
    this.cells.push(cell);
    return cell;
  }

  /** HP가 줄수록 밝아진다. 숫자와 함께 표시해 색만으로 상태를 구분하지 않는다. */
  private paintBlock(c: Cell) {
    const k = 1 - c.hp / c.maxHp;
    c.body!.setTint(Phaser.Display.Color.GetColor(150 + 105 * k, 160 + 95 * k, 175 + 80 * k));
    c.label!.setText(String(c.hp));
  }

  private spawnRow() {
    const stage = STAGES[session.stage];
    const [lo, hi] = stage.hpMul;
    const [minN, maxN] = stage.perRow;
    const cols = this.shuffle([...Array(COLS).keys()]);
    const n = minN + Math.floor(this.rand() * (maxN - minN + 1));
    const balls = this.balls.length + this.pendingBalls;
    const placed: Cell[] = [];
    for (let i = 0; i < n; i++) {
      const hp = Math.max(1, Math.round(balls * (lo + this.rand() * (hi - lo))));
      placed.push(this.makeCell('block', 0, cols[i], hp));
    }
    let free = n;
    if (this.rand() < stage.knotChance) placed.push(this.makeCell('knot', 0, cols[free++], 0));
    if (stage.sachetTurns.includes(this.turn)) placed.push(this.makeCell('sachet', 0, cols[free++], 0));
    if (free < COLS && this.rand() < stage.items.chance) {
      const pool = stage.items.pool;
      placed.push(this.makeCell(pool[Math.floor(this.rand() * pool.length)], 0, cols[free], 0));
    }
    for (const c of placed) {
      c.obj.setY(cellY(-1)).setAlpha(0);
      this.tweens.add({ targets: c.obj, y: cellY(0), alpha: 1, duration: 260, ease: 'Sine.Out' });
    }
    this.rowsSpawned++;
  }

  // ── 조준 ──────────────────────────────────────────────

  private updateAim(p: Phaser.Input.Pointer) {
    this.showAim(aimDirection(p.x - this.launcherX, p.y - LAUNCH_Y));
  }

  /** 키보드 조준: ←/→로 3°씩, Space·Enter로 발사. */
  private keyAim(e: KeyboardEvent) {
    if (this.state !== 'aim') return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (this.aimDir) { this.aimG.clear(); this.fire(this.aimDir); }
      return;
    }
    const turn = e.key === 'ArrowLeft' ? 3 : e.key === 'ArrowRight' ? -3 : 0;
    if (!turn) return;
    e.preventDefault();
    const cur = this.aimDir ? Math.atan2(-this.aimDir.y, this.aimDir.x) * 180 / Math.PI : 90;
    const a = Phaser.Math.Clamp(cur + turn, 18, 162) * Math.PI / 180;
    this.showAim({ x: Math.cos(a), y: -Math.sin(a) });
  }

  private showAim(dir: Vec | null) {
    this.aimDir = dir;
    this.aimG.clear();
    if (!this.aimDir) return;
    const from = { x: this.launcherX, y: LAUNCH_Y };
    const first = this.cast(from, this.aimDir, 1600);
    this.dots(from, first.pt);
    if (first.n) {
      const second = this.cast(first.pt, reflect(this.aimDir, first.n), 220);
      this.dots(first.pt, second.pt);
    }
    this.aimG.fillStyle(0xfcc441, 1).fillCircle(first.pt.x, first.pt.y, 8);
  }

  /** 조준선 미리보기용 광선. 첫 충돌점과 법선. */
  private cast(from: Vec, d: Vec, maxLen: number): { pt: Vec; n: Vec | null } {
    for (let s = 4; s <= maxLen; s += 4) {
      const p = { x: from.x + d.x * s, y: from.y + d.y * s };
      if (p.x < BALL_R) return { pt: p, n: { x: 1, y: 0 } };
      if (p.x > W - BALL_R) return { pt: p, n: { x: -1, y: 0 } };
      if (p.y < TOP + BALL_R) return { pt: p, n: { x: 0, y: 1 } };
      for (const c of this.cells) {
        if (c.dead || (c.kind !== 'block' && c.kind !== 'knot')) continue;
        const hit = circleRect(p, BALL_R, rectOf(c));
        if (hit) return { pt: p, n: hit.n };
      }
    }
    return { pt: { x: from.x + d.x * maxLen, y: from.y + d.y * maxLen }, n: null };
  }

  private dots(a: Vec, b: Vec) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    this.aimG.fillStyle(0x5ca1bc, 0.95);
    for (let s = 26; s < len; s += 26) {
      this.aimG.fillCircle(a.x + (b.x - a.x) * s / len, a.y + (b.y - a.y) * s / len, 5);
    }
  }

  // ── 발사와 이동 ────────────────────────────────────────

  private fire(d: Vec) {
    this.state = 'fly';
    this.dir = d;
    this.turn++;
    this.fired = 0;
    this.fireTimer = 0;
    this.turnTime = 0;
    this.nextX = null;
    this.damage = 1 + this.pendingBonus;
    this.pendingBonus = 0;
    ui.hud(STAGES[session.stage].name, this.balls.length, this.damage - 1);
    ui.hint(false);
    startBgm();
  }

  update(_: number, deltaMs: number) {
    if (this.state !== 'fly') return;
    // 개발 서버에서만: window.__speed로 밸런스 자동 검증을 빨리 돌린다
    const fast = import.meta.env.DEV ? ((window as { __speed?: number }).__speed ?? 1) : 1;
    deltaMs = Math.min(deltaMs, 50) * fast;
    const dt = deltaMs / 1000;
    this.turnTime += dt;
    // ponytail: 10초 넘는 턴은 1.6배속. 체감이 부족하면 '회수' 버튼을 추가.
    const boost = this.turnTime > 10 ? 1.6 : 1;
    const speed = this.balls.length >= 8 ? 1230 : 1100;

    this.fireTimer -= deltaMs;
    while (this.fired < this.balls.length && this.fireTimer <= 0) {
      const b = this.balls[this.fired++];
      Object.assign(b, { x: this.launcherX, y: LAUNCH_Y, vx: this.dir.x * speed, vy: this.dir.y * speed, state: 'fly', breaks: [], inside: new Set() });
      b.trail.setVisible(!reducedMotion);
      this.fireTimer += FIRE_GAP;
    }

    for (const b of this.balls) {
      if (b.state !== 'fly') continue;
      this.step(b, dt * boost);
      if ((this.state as string) === 'over') return;
      b.sprite.setPosition(b.x, b.y);
      b.trail.setPosition(b.x, b.y).setRotation(Math.atan2(b.vy, b.vx));
    }

    if (this.fired === this.balls.length && this.balls.every((b) => b.state === 'home')) this.endTurn();
  }

  private step(b: Ball, dt: number) {
    const n = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 6);
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      let v: Vec = { x: b.vx, y: b.vy };
      if (b.x < BALL_R) { b.x = BALL_R; v = keepVertical({ x: Math.abs(v.x), y: v.y }); sfx('wall', { volume: 0.2 }); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; v = keepVertical({ x: -Math.abs(v.x), y: v.y }); sfx('wall', { volume: 0.2 }); }
      if (b.y < TOP + BALL_R) { b.y = TOP + BALL_R; v.y = Math.abs(v.y); sfx('wall', { volume: 0.2 }); }
      b.vx = v.x;
      b.vy = v.y;
      if (v.y > 0 && b.y >= LAUNCH_Y) { this.home(b); return; }

      for (const c of this.cells) {
        if (c.dead) continue;
        if (isPickup(c.kind)) {
          if (Math.hypot(b.x - cellX(c.col), b.y - cellY(c.row)) >= BALL_R + PICKUP_R) b.inside.delete(c);
          else if (!b.inside.has(c)) { b.inside.add(c); this.touchItem(c, b); }
          continue;
        }
        const hit = circleRect(b, BALL_R, rectOf(c));
        if (!hit) continue;
        b.x += hit.n.x * hit.depth;
        b.y += hit.n.y * hit.depth;
        const r = keepVertical(reflect({ x: b.vx, y: b.vy }, hit.n));
        b.vx = r.x;
        b.vy = r.y;
        if (c.kind === 'block') this.damageBlock(c, this.damage, b);
        else sfx('wall', { volume: 0.35, rate: 0.8 });
        break;
      }
      if (this.state === 'over') return;
    }
  }

  private home(b: Ball) {
    b.state = 'home';
    b.y = LAUNCH_Y;
    b.trail.setVisible(false);
    if (this.nextX === null) this.nextX = Phaser.Math.Clamp(b.x, 30, W - 30);
    this.tweens.add({ targets: b.sprite, x: this.nextX, y: LAUNCH_Y, duration: 150, ease: 'Sine.Out' });
  }

  private damageBlock(c: Cell, amount: number, b?: Ball) {
    if (c.dead) return;
    c.hp -= amount;
    if (c.hp > 0) {
      sfx('hit', { volume: 0.4, detune: (Math.random() - 0.5) * 200 });
      this.paintBlock(c);
      this.tweens.add({ targets: c.obj, scale: 0.94, duration: 50, yoyo: true });
      return;
    }
    c.dead = true;
    buzz(8);
    sfx('break', { volume: 0.55 });
    const x = cellX(c.col), y = cellY(c.row);
    this.tweens.add({ targets: c.obj, scale: 0.6, alpha: 0, duration: 140, onComplete: () => c.obj.destroy() });
    const fx = this.add.image(x, y, 'break').setScale(0.2).setDepth(5);
    this.tweens.add({ targets: fx, scale: 0.5, alpha: 0, duration: 420, ease: 'Cubic.Out', onComplete: () => fx.destroy() });

    // 같은 구슬이 1.2초 안에 조각 3개를 깨면 그 자리에 잔향 조각 (동시에 하나만)
    if (!b) return this.checkWin();
    const now = this.time.now;
    b.breaks = b.breaks.filter((t) => now - t < COMBO_MS);
    b.breaks.push(now);
    if (b.breaks.length >= 3 && !this.cells.some((e) => e.kind === 'echo' && !e.dead)) {
      this.makeCell('echo', c.row, c.col, 0);
      b.breaks = [];
    }
    this.checkWin();
  }

  private collect(c: Cell) {
    c.dead = true;
    let text = '다음 턴 피해 +1';
    sfx(c.kind, { volume: 0.7 });
    if (c.kind === 'sachet') {
      text = '구슬 +1';
      if (this.balls.length + this.pendingBalls < MAX_BALLS) this.pendingBalls++;
    } else {
      this.pendingBonus = 1;
    }
    this.tweens.add({ targets: c.obj, y: c.obj.y - 30, alpha: 0, duration: 300, onComplete: () => c.obj.destroy() });
    this.floatText(c.obj.x, c.obj.y - 20, text);
  }

  private floatText(x: number, y: number, text: string) {
    const t = this.add.text(Phaser.Math.Clamp(x, 130, W - 130), y, text, {
      fontFamily: 'Gowun Dodum', fontSize: '26px', color: '#fcc441', stroke: '#040506', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private touchItem(c: Cell, b: Ball) {
    if (c.kind === 'sachet' || c.kind === 'echo') return this.collect(c);
    const x = cellX(c.col), y = cellY(c.row);
    if (!c.used) this.floatText(x, y - 40, ITEM_TEXT[c.kind as ItemKind]);

    if (c.kind === 'bomb') {
      c.dead = true;
      c.obj.destroy();
      buzz(15);
      sfx('break', { volume: 0.9, rate: 0.6 });
      const flash = this.add.circle(x, y, 60, 0xfcc441, 0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
      this.tweens.add({ targets: flash, scale: 2.6, alpha: 0, duration: 380, ease: 'Cubic.Out', onComplete: () => flash.destroy() });
      for (const t of this.cells) {
        if (t.kind === 'block' && Math.abs(t.row - c.row) <= 1 && Math.abs(t.col - c.col) <= 1) this.damageBlock(t, this.balls.length);
      }
      return;
    }

    c.used = true;
    if (c.kind === 'whirl') {
      const a = Math.random() * Math.PI * 2, s = Math.hypot(b.vx, b.vy);
      const v = keepVertical({ x: Math.cos(a) * s, y: Math.sin(a) * s });
      b.vx = v.x;
      b.vy = v.y;
      sfx('wall', { volume: 0.45, rate: 0.6 });
      this.tweens.add({ targets: c.obj, angle: c.obj.angle - 120, duration: 250 });
      return;
    }

    // 등불 띠(가로) / 향 기둥(세로): 줄 전체에 빛줄기
    const row = c.kind === 'row';
    const beam = row
      ? this.add.rectangle(W / 2, y, W, 14, 0xfcc441, 0.85)
      : this.add.rectangle(x, (TOP + BOUNDARY_Y) / 2, 14, BOUNDARY_Y - TOP, 0xfcc441, 0.85);
    beam.setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    this.tweens.add({ targets: beam, alpha: 0, [row ? 'scaleY' : 'scaleX']: 2.5, duration: 260, onComplete: () => beam.destroy() });
    sfx('echo', { volume: 0.45, detune: 400 });
    for (const t of this.cells) {
      if (t.kind === 'block' && (row ? t.row === c.row : t.col === c.col)) this.damageBlock(t, this.damage);
    }
  }

  // ── 턴 종료와 승패 ─────────────────────────────────────

  private endTurn() {
    this.state = 'busy';
    this.launcherX = this.nextX ?? this.launcherX;
    this.pendingBalls++; // 턴마다 구슬 +1
    for (; this.pendingBalls > 0; this.pendingBalls--) if (this.balls.length < MAX_BALLS) this.addBall();
    for (const b of this.balls) { b.state = 'wait'; b.sprite.setPosition(this.launcherX, LAUNCH_Y); }

    // 잔향 조각은 생긴 다음 턴이 끝나면 사라진다
    for (const c of this.cells) {
      if (c.kind === 'echo' && !c.dead && c.born < this.turn) { c.dead = true; c.obj.destroy(); }
      if (c.used && !c.dead) {
        c.dead = true;
        this.tweens.add({ targets: c.obj, alpha: 0, scale: 0.4, duration: 200, onComplete: () => c.obj.destroy() });
      }
    }
    this.cells = this.cells.filter((c) => !c.dead);

    for (const c of this.cells) {
      c.row++;
      this.tweens.add({ targets: c.obj, y: cellY(c.row), duration: 260, ease: 'Sine.InOut' });
    }
    if (this.rowsSpawned < STAGES[session.stage].rows) this.spawnRow();
    ui.hud(STAGES[session.stage].name, this.balls.length, this.pendingBonus);

    this.time.delayedCall(280, () => {
      if (this.cells.some((c) => c.kind === 'block' && c.row >= LOSE_ROW)) return this.lose();
      for (const c of this.cells) {
        if (c.row >= LOSE_ROW) { c.dead = true; this.tweens.add({ targets: c.obj, alpha: 0, duration: 200, onComplete: () => c.obj.destroy() }); }
      }
      this.cells = this.cells.filter((c) => !c.dead);
      this.checkWin();
      if (this.state === 'busy') this.state = 'aim';
    });
  }

  private checkWin() {
    if (this.state === 'over' || this.rowsSpawned < STAGES[session.stage].rows) return;
    if (this.cells.some((c) => c.kind === 'block' && !c.dead)) return;
    this.state = 'over';
    for (const b of this.balls) b.trail.setVisible(false);
    buzz(20);
    sfx('bell', { volume: 0.7 });
    const glow = this.add.circle(this.launcherX, LAUNCH_Y, 40, 0xfcc441, 0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 9, alpha: 0, duration: 900, ease: 'Sine.Out' });
    this.tweens.add({ targets: this.boundary, alpha: 0.35, duration: 900, yoyo: true });
    const last = session.stage === STAGES.length - 1;
    if (last) {
      this.time.delayedCall(1200, playEnding);
    }
    this.time.delayedCall(900, () => ui.result(last ? 'ending' : 'clear'));
  }

  private lose() {
    this.state = 'over';
    sfx('bell', { volume: 0.6, detune: -1200 });
    if (!reducedMotion) {
      this.cameras.main.shake(250, 0.006);
      this.tweens.add({ targets: this.boundary, x: W / 2 + 8, duration: 70, yoyo: true, repeat: 3 });
    }
    this.tweens.add({ targets: this.boundary, alpha: 0.25, delay: 350, duration: 500 });
    this.time.delayedCall(900, () => ui.result('fail'));
  }
}

// ── DOM UI (HUD·일시정지·결과) ──────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  hud(name: string, balls: number, bonus: number) {
    $('stage-name').textContent = `${session.stage + 1}. ${name}`;
    $('balls').textContent = `구슬 × ${balls}`;
    $('bonus').hidden = bonus === 0;
  },
  hint(show: boolean) { $('hint').hidden = !show; },
  result(kind: 'clear' | 'fail' | 'ending') {
    const stage = STAGES[session.stage];
    const copy = {
      clear: ['물결이 잔잔해졌습니다', stage.clearText],
      fail: ['등불이 꺼졌습니다', '어둠이 등불 경계선을 넘었습니다. 같은 물결에서 다시 띄울 수 있어요.'],
      ending: ['남강에 향등이 돌아왔습니다', '두 번의 물결을 지나 강 위의 어둠이 모두 걷혔습니다. 띄운 불빛이 누군가의 안부로 닿기를.'],
    }[kind];
    $('result-title').textContent = copy[0];
    $('result-text').textContent = copy[1];
    const actions = $('result-actions');
    actions.replaceChildren();
    const btn = (label: string, primary: boolean, onClick: () => void) => {
      const b = document.createElement('button');
      b.className = primary ? 'btn primary' : 'btn';
      b.textContent = label;
      b.onclick = onClick;
      actions.append(b);
      return b;
    };
    const first =
      kind === 'clear' ? btn('다음 물결', true, () => { session.stage++; restart(); })
      : kind === 'fail' ? btn('다시 띄우기', true, restart)
      : btn('처음부터', true, () => { session.stage = 0; restart(); });
    btn('타이틀로', false, () => { location.href = 'index.html'; });
    if (kind === 'ending' && MARKET_URL) {
      const a = document.createElement('a');
      a.className = 'link';
      a.href = MARKET_URL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = '남강유향 이야기 더 보기';
      actions.append(a);
    }
    $('result').hidden = false;
    first.focus();
  },
};

function restart() {
  $('result').hidden = true;
  game.scene.getScene('swipe')!.scene.restart();
}

function setPaused(paused: boolean) {
  $('pause-menu').hidden = !paused;
  pauseSound(paused);
  if (paused) {
    game.scene.pause('swipe');
    $('resume').focus();
  } else {
    game.scene.resume('swipe');
  }
}

$('pause').onclick = () => { if ($('result').hidden) setPaused(true); };
$('resume').onclick = () => setPaused(false);
$('sound').onclick = () => {
  const on = toggleSound();
  $('sound').textContent = `소리·진동 ${on ? '켜짐' : '꺼짐'}`;
  $('sound').setAttribute('aria-pressed', String(on));
};
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('.btn, .icon-btn')) sfx('click', { volume: 0.5 });
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('result').hidden) setPaused($('pause-menu').hidden === true); });

await document.fonts.load('30px "Gowun Dodum"').catch(() => {});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#040506',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Swipe,
});
bindSound(game);
if (import.meta.env.DEV) Object.assign(window, { game, session });
