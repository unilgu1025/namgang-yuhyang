// 두 게임이 함께 쓰는 소리·진동. 원본 출처는 asset-register.md.
import Phaser from 'phaser';

let game: Phaser.Game;
export const sound = { on: true };

export function bindSound(g: Phaser.Game) {
  game = g;
}

export function loadSounds(scene: Phaser.Scene, keys: string[]) {
  for (const k of keys) scene.load.audio(k, [`assets/${k}.ogg`, `assets/${k}.mp3`]);
}

// 구슬·투사체가 한꺼번에 부딪혀도 소리가 뭉개지지 않도록 같은 소리는 45ms에 한 번만.
const lastPlayed: Record<string, number> = {};
export function sfx(key: string, cfg: Phaser.Types.Sound.SoundConfig = {}) {
  if (!game) return; // 게임을 만들기 전(맵 고르기 등)의 클릭
  const now = performance.now();
  if (now - (lastPlayed[key] ?? 0) < 45) return;
  lastPlayed[key] = now;
  game.sound.play(key, { volume: 0.5, ...cfg });
}

/** 브라우저 자동재생 제한 때문에 첫 조작 뒤에 시작한다. */
export function startBgm() {
  game.sound.stopByKey('ending');
  const bgm = game.sound.get('bgm') ?? game.sound.add('bgm', { loop: true, volume: 0.45 });
  if (!bgm.isPlaying) bgm.play();
}

export function playEnding() {
  game.sound.stopByKey('bgm');
  game.sound.play('ending', { volume: 0.9 });
}

export const buzz = (ms: number) => { if (sound.on) navigator.vibrate?.(ms); };

export function toggleSound() {
  sound.on = !sound.on;
  game.sound.mute = !sound.on;
  return sound.on;
}

export function pauseSound(paused: boolean) {
  if (paused) game.sound.pauseAll();
  else game.sound.resumeAll();
}
