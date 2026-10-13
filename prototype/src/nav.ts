// 모든 페이지 공용 사이드바: 왼쪽 가장자리 탭을 누르면 페이지 목록이 열린다.
import './nav.css';

const PAGES = [
  { href: 'index.html', label: '타이틀', sub: '처음 화면' },
  { href: 'swipe.html', label: '물결을 가르는 향등', sub: '스와이프' },
  { href: 'defense.html', label: '안부를 띄우는 밤', sub: '랜덤 디펜스' },
  { href: 'zuma.html', label: '빛을 잇는 강', sub: '유등 잇기' },
  { href: 'comic.html', label: '남강유향의 이야기', sub: '4컷 만화' },
  { href: 'promo.html', label: '남강유향 알아보기', sub: '소개 · 경품 응모' },
  { href: 'guestbook.html', label: '그림 방명록', sub: '안부를 그림으로 남기기' },
];

const here = location.pathname.split('/').pop() || 'index.html';

const tab = Object.assign(document.createElement('button'), {
  className: 'sidenav-tab', type: 'button', innerHTML: '<span aria-hidden="true">☰</span>',
});
tab.setAttribute('aria-label', '전체 메뉴 열기');
tab.setAttribute('aria-expanded', 'false');
tab.setAttribute('aria-controls', 'sidenav');

const backdrop = Object.assign(document.createElement('div'), { className: 'sidenav-backdrop', hidden: true });
const nav = Object.assign(document.createElement('nav'), { id: 'sidenav', className: 'sidenav', hidden: true });
nav.setAttribute('aria-label', '전체 메뉴');
nav.innerHTML = `
  <div class="sidenav-head">
    <strong>남강유향</strong>
    <button class="sidenav-close" type="button" aria-label="메뉴 닫기">×</button>
  </div>
  <ul>${PAGES.map((p) => `
    <li><a href="${p.href}"${p.href === here ? ' aria-current="page"' : ''}>${p.label}<small>${p.sub}</small></a></li>`).join('')}
  </ul>`;

document.body.append(tab, backdrop, nav);

function setOpen(open: boolean) {
  nav.hidden = backdrop.hidden = !open;
  tab.setAttribute('aria-expanded', String(open));
  if (open) {
    // 게임 중이면 먼저 일시정지
    const pause = document.getElementById('pause');
    const result = document.getElementById('result');
    if (pause && (!result || result.hidden)) pause.click();
    (nav.querySelector<HTMLElement>('[aria-current]') ?? nav.querySelector<HTMLElement>('a'))?.focus();
  } else tab.focus();
}

tab.onclick = () => setOpen(true);
backdrop.onclick = () => setOpen(false);
nav.querySelector<HTMLButtonElement>('.sidenav-close')!.onclick = () => setOpen(false);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !nav.hidden) { e.stopImmediatePropagation(); setOpen(false); }
}, { capture: true });
