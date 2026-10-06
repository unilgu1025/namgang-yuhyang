import Phaser from 'phaser';
import { GAP, advance, insert, lantern, popAt, type Lantern } from './chain.ts';
import { bindSound, buzz, loadSounds, pauseSound, playEnding, sfx, startBgm, toggleSound } from './sound.ts';

// 유등잇기.md 수치. 논리 해상도 720×1280, 세로 화면.
const W = 720, H = 1280;
const CX = 360, CY = 700; // 가운데 발사대
const R = GAP / 2;
const COLORS = 4;
const TOTAL = 80; // 한 판에 흘러오는 유등 수
const INTRO = 16; // 처음 빠르게 굴러 들어오는 수
const SPEED = { intro: 460, base: 56, perSec: 1 }; // px/s, 시간이 갈수록 조금씩 빨라진다
const PULL = 340; // 같은 색으로 끊긴 앞 묶음이 끌려오는 속도
const SHOT = 1500;
const SWAP_R = 70;
const MARKET_URL = 'promo.html?from=zuma';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 시계 방향으로 1.75바퀴 돌며 가운데로 말려 드는 물길. 고리 사이 간격(약 106)이 유등 지름의 두 배 이상이라 사이로 쏠 수 있다 */
function spiralPath(): number[] {
  const r0 = 320, rEnd = 135, turns = 1.75;
  const k = (r0 - rEnd) / (turns * Math.PI * 2);
  const out = [-20, 700, 60, 590]; // 왼쪽 가장자리에서 나선 진행 방향(오른쪽 위)으로 들어온다
  for (let t = 0; t <= turns * Math.PI * 2 + 1e-6; t += 0.15) {
    const a = -Math.PI * 0.75 + t, r = r0 - k * t;
    out.push(Math.round(CX + r * Math.cos(a)), Math.round(CY + r * Math.sin(a)));
  }
  return out;
}

type Shot = { x: number; y: number; vx: number; vy: number; c: number; sprite: Phaser.GameObjects.Image };

class Zuma extends Phaser.Scene {
  private pts: Phaser.Math.Vector2[] = []; // 물길을 2px 간격으로 미리 샘플링
  private len = 0;
  private balls: Lantern[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private queue: number[] = [];
  private spawned = 0;
  private time0 = 0;
  private state: 'play' | 'over' = 'play';
  private cur = 0;
  private next = 0;
  private aim = -Math.PI / 2;
  private shot: Shot | null = null;
  private curImg!: Phaser.GameObjects.Image;
  private nextImg!: Phaser.GameObjects.Image;
  private aimG!: Phaser.GameObjects.Graphics;
  private whirl!: Phaser.GameObjects.Image;
  private combo = 0;

  constructor() { super('zuma'); }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    for (let i = 0; i < COLORS; i++) this.load.image(`z${i}`, `assets/z${i}.png`);
    this.load.image('whirl', 'assets/item_whirl.png');
    this.load.image('break', 'assets/break.png');
    loadSounds(this, ['ending', 'hit', 'break', 'echo', 'bell', 'click', 'wall']);
  }

  create() {
    Object.assign(this, { balls: [], sprites: new Map(), spawned: 0, state: 'play', shot: null, combo: 0, aim: -Math.PI / 2 });
    this.time0 = this.time.now;
    this.queue = makeQueue();

    this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    const curve = new Phaser.Curves.Spline(spiralPath());
    this.len = curve.getLength();
    this.pts = curve.getSpacedPoints(Math.ceil(this.len / 2));
    this.drawRiver();

    const end = this.pts.at(-1)!;
    this.whirl = this.add.image(end.x, end.y, 'whirl').setDisplaySize(96, 96).setAlpha(0.9);
    if (!reducedMotion) this.tweens.add({ targets: this.whirl, angle: -360, duration: 2600, repeat: -1 });

    // 발사대: 금빛 고리 + 지금 쏠 유등 + 다음 유등
    this.add.circle(CX, CY, 58, 0x040506, 0.75).setStrokeStyle(3, 0xc2824b);
    this.aimG = this.add.graphics().setDepth(5);
    this.cur = this.pickColor();
    this.next = this.pickColor();
    this.curImg = this.add.image(CX, CY, `z${this.cur}`).setDisplaySize(64, 64).setDepth(6);
    this.nextImg = this.add.image(CX + 44, CY + 44, `z${this.next}`).setDisplaySize(30, 30).setDepth(6);
    this.drawAim();

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) this.aimAt(p); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state !== 'play') return;
      if (Phaser.Math.Distance.Between(p.x, p.y, CX, CY) < SWAP_R) return this.swap();
      this.aimAt(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Phaser.Math.Distance.Between(p.downX, p.downY, CX, CY) >= SWAP_R) this.fire();
    });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (this.state !== 'play') return;
      if (e.key === 'ArrowLeft') this.aim -= 0.06;
      else if (e.key === 'ArrowRight') this.aim += 0.06;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.fire(); }
      else if (e.key === 'x' || e.key === 'X' || e.key === 'Shift') this.swap();
      else return;
      this.drawAim();
    });

    ui.count(TOTAL);
    ui.hint(true);
    this.cameras.main.fadeIn(300, 4, 5, 6);
  }

  private drawRiver() {
    const g = this.add.graphics();
    g.lineStyle(56, 0x040506, 0.45).strokePoints(this.pts);
    g.lineStyle(50, 0x1c3745, 0.55).strokePoints(this.pts);
    g.lineStyle(2, 0xc2824b, 0.35).strokePoints(this.pts);
  }

  private pickColor() {
    const live = [...new Set(this.balls.map((b) => b.c))];
    const pool = live.length ? live : [...new Set(this.queue)];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * COLORS);
  }

  private aimAt(p: Phaser.Input.Pointer) {
    if (Phaser.Math.Distance.Between(p.x, p.y, CX, CY) < 30) return;
    this.aim = Math.atan2(p.y - CY, p.x - CX);
    this.drawAim();
    ui.hint(false);
  }

  private drawAim() {
    const g = this.aimG.clear();
    const dx = Math.cos(this.aim), dy = Math.sin(this.aim);
    g.fillStyle(0x5ca1bc, 0.9);
    for (let d = 70; d < 560; d += 26) g.fillCircle(CX + dx * d, CY + dy * d, 4);
  }

  private swap() {
    [this.cur, this.next] = [this.next, this.cur];
    this.refreshLauncher();
    sfx('wall', { volume: 0.4 });
  }

  private refreshLauncher() {
    this.curImg.setTexture(`z${this.cur}`);
    this.nextImg.setTexture(`z${this.next}`);
  }

  fire() {
    if (this.state !== 'play' || this.shot) return;
    startBgm();
    ui.hint(false);
    const vx = Math.cos(this.aim) * SHOT, vy = Math.sin(this.aim) * SHOT;
    const sprite = this.add.image(CX, CY, `z${this.cur}`).setDisplaySize(GAP, GAP).setDepth(7);
    this.shot = { x: CX, y: CY, vx, vy, c: this.cur, sprite };
    this.cur = this.next;
    this.next = this.pickColor();
    this.refreshLauncher();
    sfx('click', { volume: 0.4 });
  }

  update(_: number, deltaMs: number) {
    if (this.state !== 'play') return;
    const fast = import.meta.env.DEV ? ((window as { __speed?: number }).__speed ?? 1) : 1;
    const dt = (Math.min(deltaMs, 50) * fast) / 1000;

    // 들어오기: 꼬리가 한 칸 들어올 때마다 다음 유등을 물길 입구에 붙인다
    while (this.queue.length && (!this.balls.length || this.balls.at(-1)!.s >= GAP)) {
      const tail = this.balls.at(-1);
      this.balls.push(lantern(this.queue.shift()!, tail ? tail.s - GAP : 0));
      this.spawned++;
    }
    const elapsed = (this.time.now - this.time0) / 1000;
    const speed = this.spawned < INTRO ? SPEED.intro : SPEED.base + SPEED.perSec * elapsed;
    for (const i of advance(this.balls, dt, speed, PULL)) this.tryPop(i, true);

    if (this.shot) this.moveShot(dt);
    this.render(dt);

    const head = this.balls[0];
    if (head && head.s >= this.len) return this.lose();
    const danger = head ? head.s / this.len : 0;
    this.whirl.setTint(danger > 0.85 ? 0xff7766 : 0xffffff);
    if (!this.queue.length && !this.balls.length && !this.shot) this.win();
  }

  private moveShot(dt: number) {
    const s = this.shot!;
    const steps = Math.ceil((SHOT * dt) / 10);
    for (let k = 0; k < steps; k++) {
      s.x += (s.vx * dt) / steps;
      s.y += (s.vy * dt) / steps;
      let hit = -1, best = GAP;
      this.balls.forEach((b, i) => {
        const p = this.at(b.s);
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        if (d < best) { best = d; hit = i; }
      });
      if (hit >= 0) {
        const b = this.balls[hit];
        const front = this.at(b.s + R), back = this.at(b.s - R);
        const ahead = Math.hypot(front.x - s.x, front.y - s.y) < Math.hypot(back.x - s.x, back.y - s.y);
        const at = insert(this.balls, hit, ahead, s.c);
        // 쏜 자리에서 행렬 자리로 미끄러져 들어가게 그 위치에서 시작한다
        this.sprites.set(this.balls[at].id, s.sprite.setDepth(4));
        this.shot = null;
        sfx('hit', { volume: 0.5 });
        this.combo = 0;
        this.tryPop(at, false);
        return;
      }
      if (s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) {
        s.sprite.destroy();
        this.shot = null;
        return;
      }
    }
    s.sprite.setPosition(s.x, s.y);
  }

  private tryPop(i: number, chained: boolean) {
    const gone = popAt(this.balls, i);
    if (!gone.length) return;
    this.combo = chained ? this.combo + 1 : 1;
    buzz(10 + this.combo * 5);
    sfx('break', { volume: 0.6, rate: 1 + Math.min(this.combo - 1, 4) * 0.12 });
    if (this.combo > 1) {
      sfx('echo', { volume: 0.5 });
      const p = this.at(gone[0].s);
      ui.float(this, p.x, p.y, `연쇄 ×${this.combo}`);
    }
    for (const l of gone) {
      const img = this.sprites.get(l.id);
      this.sprites.delete(l.id);
      if (!img) continue;
      this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.6, duration: 220, onComplete: () => img.destroy() });
      const fx = this.add.image(img.x, img.y, 'break').setScale(0.15).setDepth(5);
      this.tweens.add({ targets: fx, scale: 0.35, alpha: 0, duration: 380, onComplete: () => fx.destroy() });
    }
    // 쏠 색이 더 이상 행렬에 없으면 있는 색으로 바꿔 준다
    const live = new Set(this.balls.map((b) => b.c));
    if (live.size && !live.has(this.cur)) this.cur = this.pickColor();
    if (live.size && !live.has(this.next)) this.next = this.pickColor();
    this.refreshLauncher();
    ui.count(this.queue.length + this.balls.length);
  }

  private at(s: number) {
    return this.pts[Phaser.Math.Clamp(Math.round(s / 2), 0, this.pts.length - 1)];
  }

  private render(dt: number) {
    const k = Math.min(1, dt * 18);
    for (const b of this.balls) {
      const p = this.at(Math.max(0, b.s));
      let img = this.sprites.get(b.id);
      if (!img) {
        img = this.add.image(p.x, p.y, `z${b.c}`).setDisplaySize(GAP, GAP).setDepth(3);
        this.sprites.set(b.id, img);
      }
      img.setPosition(img.x + (p.x - img.x) * k, img.y + (p.y - img.y) * k);
      img.setAlpha(b.s < 0 ? 0 : 1);
    }
  }

  private win() {
    this.state = 'over';
    this.aimG.clear();
    sfx('bell', { volume: 0.8 });
    buzz(30);
    const glow = this.add.circle(CX, CY, 60, 0xfcc441, 0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, scale: 10, alpha: 0, duration: 1100, ease: 'Sine.Out' });
    this.time.delayedCall(700, playEnding);
    this.time.delayedCall(1200, () => ui.result(true));
  }

  private lose() {
    this.state = 'over';
    this.aimG.clear();
    this.shot?.sprite.destroy();
    sfx('bell', { volume: 0.6, detune: -1200 });
    if (!reducedMotion) this.cameras.main.shake(300, 0.008);
    const end = this.pts.at(-1)!;
    for (const img of this.sprites.values()) {
      this.tweens.add({ targets: img, x: end.x, y: end.y, scale: 0, duration: 700, delay: Math.random() * 300 });
    }
    this.time.delayedCall(1100, () => ui.result(false));
  }
}

/** 같은 색이 2~3개씩 이어 나오도록 섞는다(완전 무작위면 짝 맞추기가 너무 어렵다) */
function makeQueue() {
  const q: number[] = [];
  while (q.length < TOTAL) {
    let c = Math.floor(Math.random() * COLORS);
    if (c === q.at(-1)) c = (c + 1) % COLORS;
    const run = Math.random() < 0.5 ? 2 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < run && q.length < TOTAL; i++) q.push(c);
  }
  return q;
}

// ── DOM UI ──────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  count(n: number) { $('left').textContent = `남은 유등 ${n}`; },
  hint(show: boolean) { $('hint').hidden = !show; },
  float(scene: Phaser.Scene, x: number, y: number, text: string) {
    const t = scene.add.text(x, y, text, {
      fontFamily: 'Gowun Batang', fontStyle: 'bold', fontSize: '34px', color: '#fcc441', stroke: '#040506', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);
    scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  },
  result(win: boolean) {
    $('result-title').textContent = win ? '남강에 빛이 이어졌습니다' : '유등이 소용돌이에 잠겼습니다';
    $('result-text').textContent = win
      ? '같은 빛을 이어 어둠을 모두 걷어 냈습니다. 띄운 불빛이 누군가의 안부로 닿기를.'
      : '유등 행렬이 소용돌이에 닿았습니다. 같은 색 셋을 이어 줄여 보세요.';
    const actions = $('result-actions');
    actions.replaceChildren();
    const add = (el: HTMLElement) => { actions.append(el); return el; };
    if (win) add(Object.assign(document.createElement('a'), { className: 'btn primary', href: MARKET_URL, textContent: '배민 3만원권 응모하기' }));
    const again = add(Object.assign(document.createElement('button'), { className: win ? 'btn' : 'btn primary', textContent: '다시 하기', onclick: restart }));
    add(Object.assign(document.createElement('a'), { className: 'btn', href: 'index.html', textContent: '타이틀로' }));
    $('result').hidden = false;
    again.focus();
  },
};

function restart() {
  $('result').hidden = true;
  startBgm();
  game.scene.getScene('zuma')!.scene.restart();
}

function setPaused(paused: boolean) {
  $('pause-menu').hidden = !paused;
  pauseSound(paused);
  if (paused) { game.scene.pause('zuma'); $('resume').focus(); } else game.scene.resume('zuma');
}

$('pause').onclick = () => { if ($('result').hidden) setPaused(true); };
$('resume').onclick = () => setPaused(false);
$('sound').onclick = () => {
  const on = toggleSound();
  $('sound').textContent = `소리·진동 ${on ? '켜짐' : '꺼짐'}`;
  $('sound').setAttribute('aria-pressed', String(on));
};
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('result').hidden) setPaused($('pause-menu').hidden === true);
});

await document.fonts.load('700 36px "Gowun Batang"').catch(() => {});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#040506',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Zuma,
});
bindSound(game);
if (import.meta.env.DEV) Object.assign(window, { game });
