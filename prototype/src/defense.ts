import Phaser from 'phaser';
import {
  CARDS, CRIT, ENEMY, GUARD_CHANCE, INCENSE, LEVEL_MUL, MAX_LEVEL, MAX_SLOW, START, UNIT, WAVES,
  type Bonus, type CardId, type EnemyType, type UnitType,
} from './defense-data.ts';
import { bindSound, buzz, loadSounds, pauseSound, playEnding, sfx, startBgm, toggleSound } from './sound.ts';
import { MAPS, isMapId, type MapDef, type MapId } from './maps.ts';

// 디펜스게임.md §3 좌표 (논리 해상도 720×1280)
const W = 720, H = 1280;
// 넓은 화면(웹)에서는 HUD·조작부가 양옆 패널로 빠지므로 전장(y 118~1018)만 비춰 크게 보여 준다.
// 좌표계는 그대로, 카메라가 보는 범위만 다르다.
const WIDE = matchMedia('(min-aspect-ratio: 5/4)');
const VIEW = WIDE.matches ? { y: 118, h: 900 } : { y: 0, h: H };
// ponytail: 창 비율이 바뀌면 새로고침(진행 초기화). 드문 경우라 상태 이전은 하지 않음
WIDE.addEventListener('change', () => location.reload());
const MARKET_URL = ''; // 온라인 마켓 주소가 정해지면 넣는다. 비어 있으면 승리 화면에서 링크를 숨긴다.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 물길(맵)은 시작 화면에서 고른다. 게임을 만들기 전에 정해지고 판 도중에는 바뀌지 않는다.
let MAP: MapDef = MAPS.s;
let PATH = MAP.path;
let SLOTS = MAP.slots;
const SLOT_R = 48, DROP_R = 80;

type Unit = {
  type: UnitType; level: number; slot: number; cd: number; attacking: boolean;
  sprite: Phaser.GameObjects.Sprite;
  marks: Phaser.GameObjects.Graphics; // 레벨 점 + 사거리 점선 원. 유등 위치를 원점으로 그린다
};
type Enemy = {
  type: EnemyType; hp: number; maxHp: number; dist: number; slow: number; dead: boolean;
  sprite: Phaser.GameObjects.Sprite; bar: Phaser.GameObjects.Graphics; hpText: Phaser.GameObjects.Text;
};
/** 타격 숫자 색: Lv1 일반 = 회색, 합성으로 강해진 일반 = 빨강, 치명타 = 노랑 굵게(레벨과 무관하게 우선) */
type Hit = { amount: number; style: 'normal' | 'leveled' | 'crit' | 'ult' };
type Orb = { sprite: Phaser.GameObjects.Sprite; target: Enemy; hit: Hit };

const HIT_STYLE: Record<Hit['style'], Phaser.Types.GameObjects.Text.TextStyle> = {
  normal: { fontFamily: 'Gowun Dodum', fontSize: '30px', color: '#c3c8ce', stroke: '#040506', strokeThickness: 5 },
  leveled: { fontFamily: 'Gowun Dodum', fontSize: '32px', color: '#ff5a4a', stroke: '#040506', strokeThickness: 5 },
  crit: { fontFamily: 'Gowun Batang', fontStyle: 'bold', fontSize: '44px', color: '#fcc441', stroke: '#040506', strokeThickness: 7 },
  // 향 피우기(필살기) 전용
  ult: { fontFamily: 'Gowun Batang', fontStyle: 'bold', fontSize: '56px', color: '#fdf6bf', stroke: '#8a4a10', strokeThickness: 8 },
};

const unitScale = (u: { type: UnitType; level: number }) => (u.type === 'guard' ? 0.5 : 0.46) + 0.05 * u.level;
type Spec = { type: UnitType; level: number };
const unitDamage = (u: Spec, bonus: Bonus) => UNIT[u.type].damage * LEVEL_MUL ** (u.level - 1) * (u.type === 'guard' ? bonus.guardDmg : 1);
const unitRange = (u: Spec, bonus: Bonus) => UNIT[u.type].range * (u.type === 'comfort' ? bonus.comfortRange : 1);
const unitSlow = (u: Spec, bonus: Bonus) =>
  u.type === 'comfort' ? Math.min(MAX_SLOW, UNIT.comfort.slow + UNIT.comfort.slowPerLevel * (u.level - 1) + bonus.comfortSlow) : 0;
const RANGE_COLOR: Record<UnitType, number> = { guard: 0xfcc441, comfort: 0x5ca1bc };
const seenTypes = new Set<UnitType>(); // 세션 동안 한 번만 자동 안내

/** Phaser Graphics에는 점선이 없어서 짧은 호를 이어 그린다 */
function dashedCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, dash = 14, gap = 10) {
  const step = (dash + gap) / r, len = dash / r;
  for (let a = 0; a < Math.PI * 2; a += step) {
    g.beginPath().arc(x, y, r, a, Math.min(a + len, Math.PI * 2)).strokePath();
  }
}

class Defense extends Phaser.Scene {
  private path!: Phaser.Curves.Spline;
  private pathLen = 0;
  private slots: (Unit | null)[] = [];
  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];
  private queue: EnemyType[] = [];
  private state: 'play' | 'cards' | 'cut' | 'over' = 'play';
  private wave = 0;
  private spawnTimer = 0;
  private seeds = 0;
  private rollCost = 0;
  private integrity = 0;
  private incense = 0;
  private bonus: Bonus = { guardDmg: 1, comfortSlow: 0, comfortRange: 1, incenseGain: 1 };
  private hinted = false;
  private candidates!: Phaser.GameObjects.Graphics;

  constructor() { super('defense'); }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    const d = (k: string, n: number) => { for (let i = 1; i <= n; i++) this.load.image(`${k}${i}`, `assets/d/${k}${i}.webp`); };
    d('guard_idle', 3); d('guard_attack', 3); d('comfort_idle', 3); d('comfort_shield', 3);
    d('boat', 3); d('mist', 3); d('orb', 2); d('dice', 3); d('collapse', 3);
    for (const s of ['intact', 'breach', 'ruin']) this.load.image(`end_${s}`, `assets/d/end_${s}.jpg`);
    loadSounds(this, ['bgm', 'ending', 'dice', 'hit', 'break', 'bell', 'echo', 'click', 'wall', 'sachet']);
  }

  create() {
    this.makeAnims();
    Object.assign(this, {
      slots: SLOTS.map(() => null), enemies: [], orbs: [], queue: [], state: 'play', wave: 0, spawnTimer: 0,
      seeds: START.seeds, rollCost: START.rollCost, integrity: START.integrity, incense: 0,
      bonus: { guardDmg: 1, comfortSlow: 0, comfortRange: 1, incenseGain: 1 },
    });

    this.add.image(W / 2, H / 2, 'bg').setDisplaySize(W, H);
    this.path = new Phaser.Curves.Spline(PATH);
    this.pathLen = this.path.getLength();
    this.drawPath();

    const g = this.add.graphics();
    for (const s of SLOTS) {
      g.fillStyle(0x040506, 0.35).fillCircle(s.x, s.y, SLOT_R);
      g.lineStyle(2, 0xfcc441, 0.35).strokeCircle(s.x, s.y, SLOT_R);
    }
    this.candidates = this.add.graphics().setDepth(1500);

    this.input.on('dragstart', (_: unknown, obj: Phaser.GameObjects.Sprite) => this.dragStart(obj));
    this.input.on('drag', (_: unknown, obj: Phaser.GameObjects.Sprite, x: number, y: number) => {
      obj.setPosition(x, y);
      this.unitOf(obj)?.marks.setPosition(x, y);
    });
    this.input.on('dragend', (_: unknown, obj: Phaser.GameObjects.Sprite) => this.dragEnd(obj));

    for (let i = 0; i < START.freeUnits; i++) this.summon(true);
    this.startWave(0);
    this.cameras.main.setScroll(0, VIEW.y).fadeIn(300, 4, 5, 6);
    ui.update(this);
  }

  private makeAnims() {
    const add = (key: string, frames: string[], frameRate: number, repeat = -1) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: frames.map((k) => ({ key: k })), frameRate, repeat });
    };
    const f = (k: string, n: number) => Array.from({ length: n }, (_, i) => `${k}${i + 1}`);
    add('guard-idle', f('guard_idle', 3), 2.5);
    add('guard-attack', f('guard_attack', 3), 3 / 0.22, 0);
    add('comfort-idle', f('comfort_idle', 3), 2.5);
    add('comfort-shield', f('comfort_shield', 3), 5);
    add('boat-move', f('boat', 3), 3 / 0.9);
    add('boss-move', f('boat', 3), 3 / 1.2);
    add('mist-move', f('mist', 3), 3 / 0.9);
    add('orb', f('orb', 2), 10);
    add('dice', f('dice', 3), 10, 0);
  }

  // ── 소환·합성 ─────────────────────────────────────────

  roll() {
    if (!this.canRoll()) return;
    this.seeds -= this.rollCost;
    this.rollCost += START.rollStep;
    startBgm();
    this.summon(false);
    ui.update(this);
  }

  canRoll() {
    return this.state === 'play' && this.seeds >= this.rollCost && this.slots.includes(null);
  }

  private summon(free: boolean) {
    const empty = this.slots.flatMap((u, i) => (u ? [] : [i]));
    if (!empty.length) return;
    const slot = empty[Math.floor(Math.random() * empty.length)];
    const type: UnitType = Math.random() < GUARD_CHANCE ? 'guard' : 'comfort';
    const u = this.placeUnit(type, 1, slot);
    const { x, y } = SLOTS[slot];
    if (!free) sfx('dice', { volume: 0.7 });
    const fx = this.add.sprite(x, y, 'dice1').setScale(0.55).setDepth(1600).play('dice');
    fx.once('animationcomplete', () => this.tweens.add({ targets: fx, alpha: 0, scale: 0.8, duration: 200, onComplete: () => fx.destroy() }));
    u.sprite.setAlpha(0).setScale(unitScale(u) * 0.6);
    this.tweens.add({ targets: u.sprite, alpha: 1, scale: unitScale(u), delay: 220, duration: 220, ease: 'Back.Out' });
    // 종류별로 처음 나왔을 때 한 번 효과를 알려 준다
    if (!seenTypes.has(type)) {
      seenTypes.add(type);
      this.time.delayedCall(free ? 900 : 450, () => this.showInfo(u, true));
    }
    this.maybeHint();
  }

  private placeUnit(type: UnitType, level: number, slot: number): Unit {
    const { x, y } = SLOTS[slot];
    const sprite = this.add.sprite(x, y, `${type}_idle1`).setOrigin(0.5, 0.62).setDepth(y).play(`${type}-idle`);
    const u: Unit = { type, level, slot, cd: 0, attacking: false, sprite, marks: this.add.graphics() };
    sprite.setScale(unitScale(u)).setInteractive({ draggable: true, useHandCursor: true });
    sprite.on('animationcomplete-guard-attack', () => { u.attacking = false; sprite.play('guard-idle'); });
    this.slots[slot] = u;
    this.drawMarks(u);
    return u;
  }

  /** 레벨 점(색 외 구분용) + 사거리 점선 원. strong = 끄는 중이거나 정보를 보는 중 */
  private drawMarks(u: Unit, strong = false) {
    const { x, y } = SLOTS[u.slot];
    const g = u.marks.clear().setPosition(x, y).setDepth(strong ? 1650 : 5);
    g.lineStyle(strong ? 3 : 2, RANGE_COLOR[u.type], strong ? 0.95 : 0.4);
    dashedCircle(g, 0, 0, unitRange(u, this.bonus));
    if (strong) g.fillStyle(RANGE_COLOR[u.type], 0.08).fillCircle(0, 0, unitRange(u, this.bonus));
    const w = (u.level - 1) * 16;
    for (let i = 0; i < u.level; i++) {
      g.fillStyle(0x040506, 0.8).fillCircle(-w / 2 + i * 16, 50, 7);
      g.fillStyle(0xfcc441, 1).fillCircle(-w / 2 + i * 16, 50, 5);
    }
  }

  private showInfo(u: Unit, isNew = false) {
    if (!u.sprite.active) return;
    this.slots.forEach((o) => o && this.drawMarks(o, o === u));
    // 유등을 가리지 않도록 위쪽 유등이면 팝업을 아래에 띄운다
    ui.unitInfo(u.type, u.level, this.bonus, isNew, SLOTS[u.slot].y < 640, () => { if (u.sprite.active) this.drawMarks(u); });
  }

  /** 적 경로: 옅은 물길 띠 + 진행 방향 점선과 화살표 + 시작·성 입구 표시 */
  private drawPath() {
    const pts = this.path.getSpacedPoints(Math.round(this.pathLen / 6));
    // 반투명 굵은 선은 이음새마다 겹쳐 줄무늬가 생긴다: 불투명하게 한 장에 그린 뒤 통째로 반투명하게
    const band = this.make.graphics({}, false);
    for (const [w, c] of [[64, 0x0b1820], [40, 0x1f4a5a]] as const) {
      band.lineStyle(w, c, 1).strokePoints(pts);
      band.fillStyle(c, 1);
      for (const p of pts) band.fillCircle(p.x, p.y, w / 2);
    }
    this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(1).setAlpha(0.45).draw(band);
    band.destroy();
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(3, 0xe0cdb1, 0.6);
    for (let i = 0; i + 3 < pts.length; i += 5) g.lineBetween(pts[i].x, pts[i].y, pts[i + 3].x, pts[i + 3].y);
    g.fillStyle(0xfcc441, 0.8);
    for (let d = 90; d < this.pathLen - 40; d += 120) {
      const p = this.path.getPointAt(d / this.pathLen);
      const a = this.path.getTangentAt(d / this.pathLen).angle();
      const tip = (r: number, da: number) => [p.x + Math.cos(a + da) * r, p.y + Math.sin(a + da) * r];
      const [x1, y1] = tip(12, 0), [x2, y2] = tip(10, 2.5), [x3, y3] = tip(10, -2.5);
      g.fillTriangle(x1, y1, x2, y2, x3, y3);
    }
    const end = pts[pts.length - 1];
    g.fillStyle(0xfcc441, 0.25).fillCircle(end.x, end.y, 34);
    g.lineStyle(3, 0xfcc441, 0.8).strokeCircle(end.x, end.y, 34);
    g.fillStyle(0x040506, 0.5).fillCircle(PATH[0], PATH[1], 26);
    g.lineStyle(2, 0x9a8cff, 0.7).strokeCircle(PATH[0], PATH[1], 26);
    const label = (x: number, y: number, t: string) => this.add.text(x, y, t, {
      fontFamily: 'Gowun Dodum', fontSize: '22px', color: '#fdf6bf', stroke: '#040506', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);
    label(PATH[0] + MAP.startLabel.x, PATH[1] + MAP.startLabel.y, '어둠이 오는 곳');
    label(end.x + MAP.gateLabel.x, end.y + MAP.gateLabel.y, '성 입구');
  }

  private unitOf(obj: Phaser.GameObjects.GameObject) {
    return this.slots.find((u) => u?.sprite === obj) ?? undefined;
  }

  private dragStart(obj: Phaser.GameObjects.Sprite) {
    const u = this.unitOf(obj);
    if (!u || this.state !== 'play') return;
    startBgm();
    obj.setDepth(1700);
    this.drawMarks(u, true);
    // 합칠 수 있는 자리를 표시
    this.candidates.clear().lineStyle(4, 0xfcc441, 0.9);
    for (const o of this.slots) {
      if (o && o !== u && o.type === u.type && o.level === u.level && u.level < MAX_LEVEL) {
        this.candidates.strokeCircle(SLOTS[o.slot].x, SLOTS[o.slot].y, SLOT_R + 6);
      }
    }
  }

  private dragEnd(obj: Phaser.GameObjects.Sprite) {
    const u = this.unitOf(obj);
    this.candidates.clear();
    if (!u) return;
    const home = SLOTS[u.slot];
    // 거의 움직이지 않았으면 탭: 효과 팝업
    if (Math.hypot(obj.x - home.x, obj.y - home.y) < 14) {
      obj.setPosition(home.x, home.y).setDepth(home.y);
      this.showInfo(u);
      return;
    }
    let best = -1, bestD = DROP_R;
    SLOTS.forEach((s, i) => {
      const d = Math.hypot(s.x - obj.x, s.y - obj.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    const other = best >= 0 ? this.slots[best] : undefined;
    if (best >= 0 && best !== u.slot && !other) {
      this.slots[u.slot] = null;
      u.slot = best;
      this.slots[best] = u;
    } else if (other && other !== u && other.type === u.type && other.level === u.level && u.level < MAX_LEVEL) {
      this.slots[u.slot] = null;
      u.sprite.destroy();
      u.marks.destroy();
      other.level++;
      this.drawMarks(other);
      ui.toast(`${UNIT[other.type].name} Lv${other.level} · 피해 ${Math.round(unitDamage(other, this.bonus))}${other.type === 'comfort' ? ` · 둔화 ${Math.round(unitSlow(other, this.bonus) * 100)}%` : ''}`);
      this.tweens.add({ targets: other.sprite, scale: unitScale(other), duration: 260, ease: 'Back.Out' });
      const { x, y } = SLOTS[other.slot];
      const ring = this.add.circle(x, y, 30, 0xfcc441, 0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(1600);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      sfx('echo', { volume: 0.6 });
      buzz(12);
      ui.update(this);
      return;
    }
    const { x, y } = SLOTS[u.slot];
    obj.setPosition(x, y).setDepth(y);
    this.drawMarks(u);
    ui.update(this);
  }

  /** 키보드 대안(M): 합칠 수 있는 가장 낮은 레벨 한 쌍을 합친다 */
  mergeAny() {
    if (this.state !== 'play') return;
    const units = this.slots.filter((u): u is Unit => !!u).sort((a, b) => a.level - b.level);
    for (const a of units) {
      const b = units.find((o) => o !== a && o.type === a.type && o.level === a.level && a.level < MAX_LEVEL);
      if (!b) continue;
      a.sprite.setPosition(b.sprite.x, b.sprite.y);
      return this.dragEnd(a.sprite);
    }
  }

  private maybeHint() {
    if (this.hinted) return;
    const units = this.slots.filter((u): u is Unit => !!u);
    if (units.some((a) => units.some((b) => a !== b && a.type === b.type && a.level === b.level))) {
      this.hinted = true;
      ui.hint();
    }
  }

  // ── 물결 ──────────────────────────────────────────────

  private startWave(i: number) {
    this.wave = i;
    this.queue = [...WAVES[i].spawns];
    this.spawnTimer = 1.6;
    this.state = 'play';
    ui.ribbon(WAVES[i].name);
    ui.update(this);
  }

  private spawn(type: EnemyType) {
    const def = ENEMY[type];
    const hp = def.hp * WAVES[this.wave].hpMul * MAP.hpMul;
    const anim = `${type}-move`;
    const sprite = this.add.sprite(PATH[0], PATH[1], type === 'mist' ? 'mist1' : 'boat1').play(anim).setScale(def.scale * 0.7);
    if (type === 'boss') sprite.setTint(0xc88a9a);
    const hpText = this.add.text(0, 0, '', {
      fontFamily: 'Gowun Dodum', fontSize: type === 'boss' ? '26px' : '22px', color: '#fdf6bf', stroke: '#040506', strokeThickness: 4,
    }).setOrigin(0.5, 1);
    this.enemies.push({ type, hp, maxHp: hp, dist: 0, slow: 1, dead: false, sprite, bar: this.add.graphics(), hpText });
  }

  update(_: number, deltaMs: number) {
    if (this.state !== 'play') return;
    const fast = import.meta.env.DEV ? ((window as { __speed?: number }).__speed ?? 1) : 1;
    const dt = (Math.min(deltaMs, 50) * fast) / 1000;

    this.spawnTimer -= dt;
    if (this.queue.length && this.spawnTimer <= 0) {
      this.spawn(this.queue.shift()!);
      this.spawnTimer = WAVES[this.wave].gap;
    }

    const units = this.slots.filter((u): u is Unit => !!u && u.sprite.input?.dragState === 0);
    const comforts = units.filter((u) => u.type === 'comfort');
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.slow = 1;
      for (const c of comforts) {
        if (Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, e.sprite.x, e.sprite.y) < unitRange(c, this.bonus)) {
          e.slow = Math.min(e.slow, 1 - unitSlow(c, this.bonus));
        }
      }
      e.dist += ENEMY[e.type].speed * e.slow * dt; // 물길이 길수록 적이 오래 머문다
      const t = Math.min(1, e.dist / this.pathLen);
      const p = this.path.getPointAt(t);
      if (Math.abs(p.x - e.sprite.x) > 0.5) e.sprite.setFlipX(p.x < e.sprite.x);
      e.sprite.setPosition(p.x, p.y).setDepth(p.y).setScale(ENEMY[e.type].scale * (0.7 + 0.3 * t));
      e.sprite.setAlpha(e.slow < 1 ? 0.85 : 1);
      this.drawBar(e);
      if (t >= 1) this.leak(e);
      if (this.state !== 'play') return;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const u of units) {
      u.cd -= dt;
      const range = unitRange(u, this.bonus);
      const inRange = this.enemies.filter((e) => Phaser.Math.Distance.Between(u.sprite.x, u.sprite.y, e.sprite.x, e.sprite.y) < range);
      if (u.type === 'comfort') {
        const anim = inRange.length ? 'comfort-shield' : 'comfort-idle';
        if (u.sprite.anims.currentAnim?.key !== anim) u.sprite.play(anim);
        if (u.cd <= 0 && inRange.length) {
          u.cd = UNIT.comfort.every;
          for (const e of inRange) this.damage(e, this.rollHit(u));
        }
      } else if (u.cd <= 0 && inRange.length) {
        u.cd = UNIT.guard.every;
        const target = inRange.reduce((a, b) => (b.dist > a.dist ? b : a));
        this.shoot(u, target);
      }
    }

    for (const o of this.orbs) {
      if (o.target.dead) { o.sprite.destroy(); continue; }
      const dx = o.target.sprite.x - o.sprite.x, dy = o.target.sprite.y - o.sprite.y;
      const d = Math.hypot(dx, dy), step = 760 * dt;
      if (d <= step + 10) {
        this.damage(o.target, o.hit);
        sfx('hit', { volume: 0.2 });
        o.sprite.destroy();
        continue;
      }
      o.sprite.setPosition(o.sprite.x + (dx / d) * step, o.sprite.y + (dy / d) * step).setRotation(Math.atan2(dy, dx));
    }
    this.orbs = this.orbs.filter((o) => o.sprite.active);

    if (!this.queue.length && !this.enemies.length) this.endWave();
  }

  private shoot(u: Unit, target: Enemy) {
    u.attacking = true;
    u.sprite.play('guard-attack');
    const hit = this.rollHit(u);
    this.time.delayedCall(90, () => {
      if (!u.sprite.active || target.dead) return;
      const sprite = this.add.sprite(u.sprite.x + (target.sprite.x > u.sprite.x ? 30 : -30), u.sprite.y - 20, 'orb1')
        .play('orb').setScale((0.3 + 0.03 * u.level) * (hit.style === 'crit' ? 1.4 : 1)).setDepth(2000).setBlendMode(Phaser.BlendModes.ADD);
      this.orbs.push({ sprite, target, hit });
      sfx('wall', { volume: 0.15, rate: 1.3 });
    });
  }

  private rollHit(u: Unit): Hit {
    const base = unitDamage(u, this.bonus);
    if (Math.random() < CRIT.chance) return { amount: base * CRIT.mul, style: 'crit' };
    return { amount: base, style: u.level > 1 ? 'leveled' : 'normal' };
  }

  /** 체력바 + 남은 체력 숫자 (항상 표시) */
  private drawBar(e: Enemy) {
    const w = e.type === 'boss' ? 110 : 60, x = e.sprite.x - w / 2, y = e.sprite.y - e.sprite.displayHeight * 0.42;
    e.bar.clear().setDepth(e.sprite.depth + 1);
    e.bar.fillStyle(0x040506, 0.8).fillRect(x - 1, y - 1, w + 2, 8);
    e.bar.fillStyle(e.slow < 1 ? 0x5ca1bc : 0xfcc441, 1).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 6);
    e.hpText.setText(String(Math.ceil(e.hp))).setPosition(e.sprite.x, y - 1).setDepth(e.sprite.depth + 2);
  }

  private floatHit(e: Enemy, hit: Hit) {
    const n = Math.round(hit.amount);
    const top = e.sprite.y - e.sprite.displayHeight * 0.42 - 34; // 체력 숫자 위에서 떠오른다
    const t = this.add.text(e.sprite.x + Phaser.Math.Between(-22, 22), top, hit.style === 'crit' ? `${n}!` : String(n), HIT_STYLE[hit.style])
      .setOrigin(0.5).setDepth(2500);
    if (hit.style === 'crit' || hit.style === 'ult') t.setScale(1.4);
    this.tweens.add({ targets: t, y: t.y - 46, scale: 1, alpha: { from: 1, to: 0 }, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  /** hit = 유등 타격(숫자를 띄움), number = 향 피우기처럼 유등이 아닌 피해 */
  private damage(e: Enemy, hit: Hit | number) {
    if (e.dead) return;
    const amount = typeof hit === 'number' ? hit : hit.amount;
    if (typeof hit !== 'number') this.floatHit(e, hit);
    e.hp -= amount;
    if (e.hp > 0) {
      e.hpText.setText(String(Math.ceil(e.hp)));
      e.sprite.setTint(0xfff0c0);
      this.time.delayedCall(70, () => { if (!e.dead) e.type === 'boss' ? e.sprite.setTint(0xc88a9a) : e.sprite.clearTint(); });
      return;
    }
    e.dead = true;
    e.bar.destroy();
    e.hpText.destroy();
    const def = ENEMY[e.type];
    this.seeds += def.seeds;
    this.incense = Math.min(1, this.incense + def.incense * this.bonus.incenseGain);
    sfx('break', { volume: e.type === 'boss' ? 0.9 : 0.35, rate: e.type === 'boss' ? 0.6 : 1 });
    buzz(e.type === 'boss' ? 30 : 5);
    this.tweens.add({ targets: e.sprite, scale: e.sprite.scale * 0.5, alpha: 0, duration: 320, onComplete: () => e.sprite.destroy() });
    ui.update(this);
  }

  private leak(e: Enemy) {
    e.dead = true;
    e.bar.destroy();
    e.hpText.destroy();
    this.tweens.add({ targets: e.sprite, alpha: 0, duration: 200, onComplete: () => e.sprite.destroy() });
    this.integrity = Math.max(0, this.integrity - ENEMY[e.type].leak);
    sfx('bell', { volume: 0.4, detune: -1200 });
    buzz(40);
    if (!reducedMotion) this.cameras.main.shake(180, 0.005);
    ui.update(this);
    if (this.integrity <= 0) this.lose();
  }

  burnIncense() {
    if (this.state !== 'play' || this.incense < 1) return;
    this.incense = 0;
    this.state = 'cut'; // 컷신 동안 전장은 멈춘다
    startBgm();
    sfx('bell', { volume: 0.8 });
    buzz(20);
    ui.update(this);
    ui.cutscene(() => this.releaseIncense());
  }

  /** 컷신이 끝나는 순간: 성에서 금빛 파동이 퍼져 일반 적은 모두 쓰러지고 대장선은 크게 깎인다 */
  private releaseIncense() {
    if (this.state !== 'cut') return;
    this.state = 'play';
    sfx('bell', { volume: 0.9, detune: 700 });
    sfx('break', { volume: 0.9, rate: 0.7 });
    buzz(40);
    if (!reducedMotion) this.cameras.main.flash(350, 253, 246, 191).shake(400, 0.012);
    const [gx, gy] = [PATH.at(-2)!, PATH.at(-1)!];
    for (const [delay, color] of [[0, 0xfdf6bf], [120, 0xfcc441], [240, 0xc2824b]] as const) {
      const ring = this.add.circle(gx, gy, 40, color, 0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(1800);
      this.tweens.add({ targets: ring, scale: 34, alpha: 0, delay, duration: 900, ease: 'Sine.Out', onComplete: () => ring.destroy() });
    }
    // 파동이 성에서 멀어지는 순서대로 맞힌다
    for (const e of [...this.enemies]) {
      const d = Phaser.Math.Distance.Between(gx, gy, e.sprite.x, e.sprite.y);
      this.time.delayedCall(80 + d * 0.6, () => {
        const amount = e.type === 'boss' ? INCENSE.power + e.maxHp * INCENSE.bossRatio : INCENSE.power;
        this.damage(e, { amount, style: 'ult' });
      });
    }
    ui.update(this);
  }

  private endWave() {
    this.seeds += START.waveBonus;
    this.orbs.forEach((o) => o.sprite.destroy());
    this.orbs = [];
    if (this.wave === WAVES.length - 1) return this.win();
    this.state = 'cards';
    const pool = (Object.keys(CARDS) as CardId[]).filter((id) => id !== 'wall' || this.integrity < START.integrity);
    Phaser.Utils.Array.Shuffle(pool);
    ui.update(this);
    ui.cards(pool.slice(0, 3), (id) => {
      this.applyCard(id);
      this.startWave(this.wave + 1);
    });
  }

  private applyCard(id: CardId) {
    if (id === 'wick') this.bonus.guardDmg *= 1.3;
    if (id === 'ripple') { this.bonus.comfortSlow += 0.1; this.bonus.comfortRange *= 1.15; }
    if (id === 'sachet') this.bonus.incenseGain *= 1.5;
    if (id === 'wall') this.integrity = Math.min(START.integrity, this.integrity + 3);
    if (id === 'seeds') this.seeds += 60;
    this.slots.forEach((u) => u && this.drawMarks(u)); // 사거리 강화 반영
  }

  // ── 엔딩 ──────────────────────────────────────────────

  private cover(key: string) {
    $('stage').classList.add('ending');
    const img = this.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(3000).setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 500 });
    return img;
  }

  private win() {
    this.state = 'over';
    this.time.delayedCall(400, () => {
      this.cover('end_intact');
      playEnding();
      buzz(30);
      // 안부등을 강에 띄운다: 작은 안부등들이 물결을 따라 멀어진다
      for (let i = 0; i < 7; i++) {
        const lamp = this.add.sprite(140 + i * 75 + Phaser.Math.Between(-20, 20), 1230, 'comfort_idle1')
          .play('comfort-idle').setScale(0.22).setDepth(3001).setAlpha(0);
        this.tweens.add({
          targets: lamp, y: 820 + Phaser.Math.Between(-40, 40), scale: 0.09, alpha: { from: 0, to: 1 },
          delay: 500 + i * 220, duration: 3200, ease: 'Sine.Out',
        });
      }
    });
    this.time.delayedCall(4200, () => ui.result(true));
  }

  private lose() {
    this.state = 'over';
    // 온전한 성 → 붕괴 파편 3프레임(성벽 위) → 무너진 성 → 꺼진 성 → 결과
    const base = this.cover('end_intact');
    const fx = this.add.image(W / 2, 360, 'collapse1').setDepth(3002).setAlpha(0);
    [700, 1100, 1500].forEach((at, i) => this.time.delayedCall(at, () => {
      fx.setTexture(`collapse${i + 1}`).setAlpha(1);
      sfx('break', { volume: 0.8, rate: 0.55 + i * 0.05 });
      if (!reducedMotion) this.cameras.main.shake(300, 0.01);
      if (i === 1) base.setTexture('end_breach');
    }));
    this.time.delayedCall(2100, () => {
      this.tweens.add({ targets: fx, alpha: 0, duration: 500 });
      base.setTexture('end_ruin');
      sfx('bell', { volume: 0.7, detune: -1200 });
    });
    this.time.delayedCall(3600, () => ui.result(false));
  }

  // DOM이 읽는 상태
  view() {
    return {
      seeds: this.seeds, rollCost: this.rollCost, canRoll: this.canRoll(), full: !this.slots.includes(null),
      incense: this.incense, integrity: this.integrity, waveName: WAVES[this.wave].name,
      left: this.queue.length + this.enemies.filter((e) => !e.dead).length, playing: this.state === 'play',
    };
  }
}

// ── DOM UI ────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const scene = () => game.scene.getScene('defense') as Defense;

const ui = {
  update(s: Defense) {
    const v = s.view();
    $('wave-name').textContent = v.waveName;
    $('wave-left').textContent = `남은 어둠 ${v.left}`;
    // 등불씨는 주사위 버튼 안에서 다음 굴림까지 차오르는 게이지로 보여 준다
    $('roll-cost').textContent = v.full ? `빈 자리 없음 · 합쳐 보세요` : `등불씨 ${v.seeds} / ${v.rollCost}`;
    $('seed-fill').style.setProperty('--p', String(Math.min(1, v.seeds / v.rollCost)));
    $('roll').setAttribute('aria-label', `주사위 굴림, 등불씨 ${v.seeds} / ${v.rollCost}${v.full ? ', 빈 자리 없음' : ''}`);
    $('roll').setAttribute('aria-disabled', String(!v.canRoll));
    $('roll').classList.toggle('ready', v.canRoll);
    const inc = $('incense');
    inc.style.setProperty('--fill', String(v.incense));
    inc.classList.toggle('full', v.incense >= 1);
    inc.setAttribute('aria-disabled', String(!(v.incense >= 1 && v.playing)));
    inc.setAttribute('aria-label', `향 피우기, 게이지 ${Math.round(v.incense * 100)}%`);
    const gauge = $('gauge');
    gauge.style.setProperty('--hp', String(v.integrity / START.integrity));
    gauge.classList.toggle('danger', v.integrity <= 3);
    $('gauge-label').textContent = `성 불빛 ${v.integrity} / ${START.integrity}`;
  },
  ribbon(name: string) {
    $('ribbon-text').textContent = name;
    const r = $('ribbon');
    r.hidden = false;
    r.style.animation = 'none';
    void r.offsetWidth;
    r.style.animation = '';
    setTimeout(() => { r.hidden = true; }, 1800);
  },
  hint() {
    $('hint').hidden = false;
    setTimeout(() => { $('hint').hidden = true; }, 4500);
  },
  /** 향 피우기 컷신. 금빛 섬광이 가장 밝을 때 onRelease(실제 피해). 탭·키로 넘길 수 있다 */
  cutscene(onRelease: () => void) {
    const el = $('cutscene');
    const total = reducedMotion ? 900 : 2800, release = reducedMotion ? 600 : 2550;
    // 애니메이션을 처음부터 다시 재생
    const fresh = el.cloneNode(true) as HTMLElement;
    el.replaceWith(fresh);
    fresh.hidden = false;
    $('cut-sr').textContent = '향을 피웠습니다. 소녀가 남강에 안부등을 띄웁니다.';
    let released = false;
    const release_ = () => { if (!released) { released = true; onRelease(); } };
    const end = () => {
      release_();
      fresh.hidden = true;
      clearTimeout(t1); clearTimeout(t2);
      removeEventListener('keydown', skipKey);
    };
    const skipKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); end(); } };
    const t1 = setTimeout(release_, release), t2 = setTimeout(end, total);
    fresh.onclick = end;
    setTimeout(() => addEventListener('keydown', skipKey), 150); // 발동한 Space가 바로 넘기지 않도록
  },
  toast(text: string) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(Number(t.dataset.timer));
    t.dataset.timer = String(setTimeout(() => { t.hidden = true; }, 2200));
  },
  /** 유등 효과 팝업. 게임은 멈추지 않는다. 닫히면 onClose */
  unitInfo(type: UnitType, level: number, bonus: Bonus, isNew: boolean, atBottom: boolean, onClose: () => void) {
    const u = UNIT[type];
    const cur = { type, level }, next = { type, level: level + 1 };
    const num = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
    const rows: [string, string, string | null][] = [
      ['피해', `${num(unitDamage(cur, bonus))}${type === 'comfort' ? ' (범위 전체)' : ''}`, level < MAX_LEVEL ? String(num(unitDamage(next, bonus))) : null],
      ['공격 간격', `${u.every}초`, null],
      ['사거리', `${Math.round(unitRange(cur, bonus))} (점선 원)`, null],
    ];
    rows.push(['치명타', `${CRIT.chance * 100}% 확률로 ${CRIT.mul}배`, null]);
    if (type === 'comfort') rows.push(['둔화', `${Math.round(unitSlow(cur, bonus) * 100)}%`, level < MAX_LEVEL ? `${Math.round(unitSlow(next, bonus) * 100)}%` : null]);
    $('info-kicker').textContent = isNew ? '새 유등' : '유등 정보';
    $('info-title').textContent = `${u.name} Lv${level}`;
    ($('info-img') as HTMLImageElement).src = `assets/d/${type}_idle1.webp`;
    $('info-role').textContent = u.role;
    const dl = $('info-stats');
    dl.replaceChildren(...rows.flatMap(([k, v, n]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      if (n) {
        const s = document.createElement('small');
        s.textContent = ` → Lv${level + 1} ${n}`;
        dd.append(s);
      }
      return [dt, dd];
    }));
    $('info-merge').textContent = level < MAX_LEVEL
      ? `같은 ${u.name} Lv${level}을 끌어 겹치면 Lv${level + 1}로 합쳐집니다.`
      : '최고 레벨입니다.';
    const box = $('unit-info');
    box.classList.toggle('bottom', atBottom);
    box.hidden = false;
    clearTimeout(Number(box.dataset.timer));
    const close = () => { box.hidden = true; onClose(); };
    $('info-close').onclick = close;
    box.dataset.timer = String(setTimeout(close, isNew ? 7000 : 5000));
  },
  cards(ids: CardId[], pick: (id: CardId) => void) {
    const list = $('card-list');
    list.replaceChildren();
    let chosen: CardId | null = null;
    for (const id of ids) {
      const c = CARDS[id];
      const b = document.createElement('button');
      b.className = 'card';
      b.setAttribute('aria-label', `${c.name}: ${c.desc}`);
      const img = document.createElement('img');
      img.src = c.icon;
      img.alt = '';
      if (!c.icon.endsWith('.jpg')) img.className = 'contain';
      const name = document.createElement('b');
      name.textContent = c.name;
      const desc = document.createElement('span');
      desc.textContent = c.desc;
      b.append(img, name, desc);
      // 첫 탭은 선택, 같은 카드를 한 번 더 탭하면 확정 (키보드 Enter는 바로 확정)
      b.onclick = (e) => {
        if (chosen) return;
        const keyboard = (e as PointerEvent).pointerType === '';
        if (!b.classList.contains('selected') && !keyboard) {
          list.querySelectorAll('.card').forEach((x) => x.classList.remove('selected'));
          b.classList.add('selected');
          return;
        }
        chosen = id;
        b.classList.add('confirmed');
        sfx('sachet', { volume: 0.7 });
        setTimeout(() => { $('cards').hidden = true; pick(id); }, 450);
      };
      list.append(b);
    }
    $('cards').hidden = false;
    (list.firstElementChild as HTMLElement)?.focus();
  },
  result(win: boolean) {
    $('result-title').textContent = win ? '안부등이 남강에 떠올랐습니다' : '성의 불빛이 꺼졌습니다';
    $('result-text').textContent = win
      ? '세 물결을 지나 성의 불빛을 지켰습니다. 띄운 불빛이 누군가의 안부로 닿기를.'
      : '어둠이 성에 닿았습니다. 유등을 합쳐 더 강하게 키워 보세요.';
    ($('result-scene') as HTMLImageElement).src = `assets/d/end_${win ? 'intact' : 'ruin'}.jpg`;
    const market = $('market');
    market.replaceChildren();
    if (win && MARKET_URL) {
      const a = document.createElement('a');
      Object.assign(a, { className: 'link', href: MARKET_URL, target: '_blank', rel: 'noopener', textContent: '남강유향 이야기 더 보기' });
      market.append(a);
    }
    $('result').hidden = false;
    $('again').focus();
  },
};

function setPaused(paused: boolean) {
  $('pause-menu').hidden = !paused;
  pauseSound(paused);
  if (paused) { game.scene.pause('defense'); $('resume').focus(); } else game.scene.resume('defense');
}

$('roll').onclick = () => scene().roll();
$('incense').onclick = () => scene().burnIncense();
$('again').onclick = () => {
  $('result').hidden = true;
  $('stage').classList.remove('ending');
  startBgm();
  scene().scene.restart();
};
$('pause').onclick = () => { if ($('result').hidden && $('cards').hidden && $('cutscene').hidden) setPaused(true); };
$('resume').onclick = () => setPaused(false);
$('sound').onclick = () => {
  const on = toggleSound();
  $('sound').textContent = `소리·진동 ${on ? '켜짐' : '꺼짐'}`;
  $('sound').setAttribute('aria-pressed', String(on));
};
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('.btn, .icon-btn, .dbtn')) sfx('click', { volume: 0.5 });
});
addEventListener('keydown', (e) => {
  if (!$('map-pick').hidden) return; // 아직 게임이 없다
  const overlayOpen = !$('result').hidden || !$('cards').hidden || !$('cutscene').hidden;
  if (e.key === 'Escape' && !overlayOpen) return setPaused($('pause-menu').hidden === true);
  if (!$('pause-menu').hidden || overlayOpen) return;
  if (e.key === 'r' || e.key === 'R') scene().roll();
  if (e.key === 'm' || e.key === 'M') scene().mergeAny();
  if (e.key === ' ') { e.preventDefault(); scene().burnIncense(); }
});

await Promise.all([
  document.fonts.load('20px "Gowun Dodum"'),
  document.fonts.load('700 36px "Gowun Batang"'),
]).catch(() => {});

/** 물길 고르기: ?map=s|spiral 이 있으면 바로 시작(새로고침해도 같은 맵) */
function pickMap(): Promise<MapId> {
  const q = new URLSearchParams(location.search).get('map');
  if (isMapId(q)) return Promise.resolve(q);
  const box = $('map-pick');
  box.hidden = false;
  (box.querySelector('button') as HTMLElement).focus();
  return new Promise((done) => {
    box.querySelectorAll<HTMLButtonElement>('[data-map]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.map as MapId;
        history.replaceState(null, '', `?map=${id}`);
        box.hidden = true;
        done(id);
      };
    });
  });
}

const mapId = await pickMap();
MAP = MAPS[mapId];
PATH = MAP.path;
SLOTS = MAP.slots;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: VIEW.h,
  backgroundColor: '#040506',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Defense,
});
bindSound(game);
if (import.meta.env.DEV) Object.assign(window, { game });
