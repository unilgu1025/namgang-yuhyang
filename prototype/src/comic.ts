// 「남강유향의 이야기 — 강 건너 보내는 안부」 4컷. 타이틀 창(index.html)과 단독 페이지(comic.html)가 함께 쓴다.
// 그림: public/assets/comic/1~4.webp (1024×1024). 아직 없으면 컷 번호만 있는 빈 칸으로 보인다.
export const PANELS = [
  {
    alt: '밤, 강 건너 초가집 툇마루에 앉은 소녀가 무릎을 안고 어두운 진주성을 걱정스럽게 바라본다',
    text: '오빠는 강 건너 진주성을 지키러 떠났어요.',
    quote: '오늘 밤도… 소식이 없네.',
  },
  {
    alt: '성벽 아래 물가에서 젊은 병사가 촛불을 밝힌 실크 유등을 두 손으로 강물에 내려놓는다',
    text: '오빠는 실크 유등에 작은 불을 밝혀 강물에 띄웠어요.',
    quote: '나는 무사해. 걱정 마.',
  },
  {
    alt: '강을 건너온 등불을 소녀가 물가에서 두 손으로 받쳐 들고 환하게 웃는다',
    text: '어둠을 건너온 작은 불빛이 동생에게 닿았어요.',
    quote: '오빠가… 무사하구나!',
  },
  {
    alt: '오늘 밤 수많은 유등이 떠 있는 남강에서 한복 입은 소녀가 등불 하나를 띄우며 미소 짓는다',
    text: '그날 강을 건넌 안부가 오늘의 남강 유등이 되었어요.',
    quote: '이제, 당신의 안부를 띄워 볼까요?',
  },
];

export function renderComic(el: HTMLElement) {
  el.replaceChildren(...PANELS.map((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'panel';
    fig.dataset.n = String(i + 1);
    const img = new Image(1024, 1024);
    img.src = `assets/comic/${i + 1}.webp`;
    img.alt = p.alt;
    img.decoding = 'async';
    img.onerror = () => fig.classList.add('empty'); // 그림이 오기 전: 번호만 있는 빈 칸
    const cap = document.createElement('figcaption');
    const q = document.createElement('q');
    q.textContent = p.quote;
    cap.append(p.text, q);
    fig.append(img, cap);
    return fig;
  }));
}
