// Makes web-sized copies of ../assets/*_v1.* into public/assets. Originals are never touched.
// 오디오 변환에는 시스템 ffmpeg가 필요하다.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SRC = '../assets/';
const OUT = 'public/assets/';
mkdirSync(OUT, { recursive: true });

const jobs = [
  ['bg_namgang_water_night_v1.png', 'bg.jpg', { width: 720, height: 1280, fit: 'cover' }, 'jpg'],
  ['keyart-steam-title-center-v1.png', 'title.jpg', { width: 1600 }, 'jpg'],
  ['ball_incense_lantern_v1.png', 'ball.png', { width: 128, height: 128, fit: 'contain' }],
  ['block_dark_wave_01_v1.png', 'block.png', { width: 280 }],
  ['bumper_wave_knot_v1.png', 'knot.png', { width: 280 }],
  ['item_sachet_v1.png', 'sachet.png', { width: 128, height: 128, fit: 'contain' }],
  ['fx_dark_break_v1.png', 'break.png', { width: 384 }],
  ['fx_incense_trail_v1.png', 'trail.png', { width: 256 }],
  ['ui_lantern_boundary_v1.png', 'boundary.png', { width: 720 }],
  ['item_lantern_ribbon_v1.svg', 'item_row.png', { width: 128, height: 128 }],
  ['item_incense_pillar_v1.svg', 'item_col.png', { width: 128, height: 128 }],
  ['item_whirlpool_v1.svg', 'item_whirl.png', { width: 128, height: 128 }],
  ['item_lotus_lantern_v1.svg', 'item_bomb.png', { width: 128, height: 128 }],
  // 향 피우기 컷신 소녀. 코덱스 그림이 생기면 이 줄의 원본만 바꾼다(같은 출력 이름)
  ['cut_girl_pray_v1.svg', 'cut_girl.png', { width: 600 }],
];

for (const [src, out, resize, fmt] of jobs) {
  let img = sharp(SRC + src);
  if (fmt !== 'jpg' && !src.endsWith('.svg')) img = img.trim({ threshold: 1 });
  img = img.resize({ ...resize, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  img = fmt === 'jpg' ? img.jpeg({ quality: 82, mozjpeg: true }) : img.png({ compressionLevel: 9, palette: false });
  const info = await img.toFile(OUT + out);
  console.log(`${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}

// ── 디펜스 (assets/defense → public/assets/d) ──
// 애니메이션 프레임은 기준점이 흔들리지 않도록 trim하지 않고 캔버스째 줄인다. 한 장짜리 UI만 trim.
const D = '../assets/defense/';
const DOUT = OUT + 'd/';
mkdirSync(DOUT, { recursive: true });
const frames = (base, n) => Array.from({ length: n }, (_, i) => `${base}_${String(i + 1).padStart(2, '0')}_v01.png`);
const defense = [
  ...frames('units/unit_guard_lantern_idle', 3).map((f, i) => [f, `guard_idle${i + 1}.webp`, 220]),
  ...frames('units/unit_guard_lantern_attack', 3).map((f, i) => [f, `guard_attack${i + 1}.webp`, 220]),
  ...frames('units/unit_comfort_lantern_idle', 3).map((f, i) => [f, `comfort_idle${i + 1}.webp`, 250]),
  ...frames('units/unit_comfort_lantern_shield', 3).map((f, i) => [f, `comfort_shield${i + 1}.webp`, 250]),
  ...frames('enemies/enemy_shadow_boat_move', 3).map((f, i) => [f, `boat${i + 1}.webp`, 300]),
  ...frames('enemies/enemy_mist_shard_move', 3).map((f, i) => [f, `mist${i + 1}.webp`, 240]),
  ...frames('fx/fx_guard_orb', 2).map((f, i) => [f, `orb${i + 1}.webp`, 128]),
  ...frames('fx/fx_dice_cast', 3).map((f, i) => [f, `dice${i + 1}.webp`, 256]),
  ...frames('fx/fx_fortress_collapse', 3).map((f, i) => [f, `collapse${i + 1}.webp`, 720]),
  ['ui/ui_roll_button_idle_v01.png', 'roll_idle.webp', 720],
  ['ui/ui_roll_button_press_v01.png', 'roll_press.webp', 720],
  ['ui/ui_roll_button_charge_v01.png', 'roll_charge.webp', 720],
  ['ui/ui_action_card_idle_v01.png', 'card_idle.webp', 720],
  ['ui/ui_action_card_select_v01.png', 'card_select.webp', 720],
  ['ui/ui_action_card_confirm_v01.png', 'card_confirm.webp', 720],
  ['ui/ui_result_modal_v01.png', 'result.webp', 640],
  ['ui/ui_top_hud_frame_v01.png', 'hud.webp', 900, 'trim'],
  ['ui/ui_lantern_integrity_gauge_v01.png', 'gauge.webp', 900, 'trim'],
  ['ui/ui_wave_ribbon_in_01_v01.png', 'ribbon.webp', 900, 'trim'],
  ['ui/ui_pause_button_v01.png', 'pause.webp', 160, 'trim'],
];
for (const [src, out, width, trim] of defense) {
  let img = sharp(D + src);
  if (trim) img = img.trim({ threshold: 1 });
  const info = await img.resize({ width }).webp({ quality: 82, alphaQuality: 90 }).toFile(DOUT + out);
  console.log(`d/${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
}
for (const s of ['intact', 'breach', 'ruin']) {
  await sharp(`${D}background/ending/bg_ending_jinju_fortress_${s}_v01.png`)
    .resize({ width: 720, height: 1280, fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${DOUT}end_${s}.jpg`);
  console.log(`d/end_${s}.jpg`);
}

// ogg(끊김 없는 반복) + mp3(Safari 대비) 두 벌. 음악은 음량을 맞춘다.
const audio = [
  ['bgm_aquaria_v1.wav', 'bgm', 'loudnorm=I=-20'],
  ['bgm_oriental_ending_v1.wav', 'ending', 'loudnorm=I=-18'],
  ['sfx_wall_pluck_v1.ogg', 'wall'],
  ['sfx_block_hit_v1.ogg', 'hit'],
  ['sfx_block_break_v1.ogg', 'break'],
  ['sfx_sachet_v1.ogg', 'sachet'],
  ['sfx_echo_v1.ogg', 'echo'],
  ['sfx_bell_v1.ogg', 'bell'],
  ['sfx_ui_click_v1.ogg', 'click'],
  ['sfx_dice_throw_v1.ogg', 'dice'],
];

for (const [src, out, filter] of audio) {
  for (const [ext, codec] of [['ogg', ['-c:a', 'libvorbis', '-q:a', '4']], ['mp3', ['-c:a', 'libmp3lame', '-b:a', '128k']]]) {
    const af = filter ? ['-af', filter] : [];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', SRC + src, ...af, '-ar', '44100', ...codec, `${OUT}${out}.${ext}`]);
  }
  console.log(`${out}.ogg/.mp3`);
}
