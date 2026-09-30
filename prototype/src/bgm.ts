// 모든 페이지(타이틀·게임·응모)가 함께 쓰는 배경음.
// 페이지를 옮겨도 끊긴 자리부터 이어지도록 재생 위치를 sessionStorage에 남긴다.
const KEY = 'bgm-time';
export const bgm = new Audio('assets/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.45;
let wanted = true; // 엔딩 음악·일시정지 중에는 false

bgm.addEventListener('loadedmetadata', () => {
  try { bgm.currentTime = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* 저장소 막힘 */ }
}, { once: true });
addEventListener('pagehide', () => {
  try { sessionStorage.setItem(KEY, String(bgm.currentTime)); } catch { /* 저장소 막힘 */ }
});

export function playBgm() {
  wanted = true;
  bgm.play().catch(() => {}); // 자동재생이 막히면 아래 첫 조작 때 다시 시도
}
export function stopBgm() {
  wanted = false;
  bgm.pause();
}

// 브라우저는 소리 있는 자동재생을 첫 조작 전까지 막는 경우가 많다
const kick = () => { if (wanted && bgm.paused) bgm.play().catch(() => {}); };
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, kick, { capture: true });
playBgm();
