// 「남강유향의 이야기 — 강 건너 보내는 안부」 4컷. 타이틀 창(index.html)과 단독 페이지(comic.html)가 함께 쓴다.
// 그림: public/assets/comic/1~4.webp (1024×1024). 아직 없으면 컷 번호만 있는 빈 칸으로 보인다.
export const PANELS = [
  {
    alt: '밤, 초가집 툇마루에 앉은 소녀가 강 건너 희미한 진주성을 바라보며 오빠를 걱정한다',
    text: '오빠는 강 건너 진주성을 지키러 떠났어요.',
    quote: '오늘 밤도… 소식이 없네.',
  },
  {
    alt: '성 아래 강가에서 오빠가 꽃가지 무늬 실크 유등 하나를 조심스럽게 물에 띄운다',
    text: '오빠는 무사하다는 마음을 실크 유등에 담아 띄웠어요.',
    quote: '나는 무사해. 걱정 마.',
  },
  {
    alt: '인물 없이, 어두운 남강 수면 위를 유등 하나가 천천히 떠내려간다',
    text: '작은 불빛 하나가 어두운 남강을 천천히 건너요.',
    quote: '오빠의 안부를 싣고.',
  },
  {
    alt: '소녀가 가까이 다가온 유등의 빛을 발견하고 안도하며 환하게 미소 짓는다',
    text: '강을 건너온 불빛이 동생에게 닿았어요.',
    quote: '오빠가… 무사하구나!',
  },
];

/** 4컷 뒤에 한 번 더 건네는 말 (창의 시작 버튼 위, 페이지 맨 아래) */
export const EPILOGUE = ['그날 강을 건넌 안부가 오늘의 남강 유등이 되었어요.', '이제, 당신의 안부를 띄워 볼까요?'];

export function renderComic(el: HTMLElement) {
  el.replaceChildren(...PANELS.map((p, i) => {
    const fig = document.createElement('figure');
    fig.className = 'panel';
    fig.dataset.n = String(i + 1);
    const img = new Image(1024, 1024);
    img.src = `assets/comic/${i + 1}.webp`;
    img.alt = p.alt;
    img.onerror = () => fig.classList.add('empty'); // 그림이 오기 전: 번호만 있는 빈 칸
    const cap = document.createElement('figcaption');
    const q = document.createElement('q');
    q.textContent = p.quote;
    cap.append(p.text, q);
    fig.append(img, cap);
    return fig;
  }));
  const epi = document.createElement('p');
  epi.className = 'epilogue';
  epi.append(EPILOGUE[0], Object.assign(document.createElement('strong'), { textContent: EPILOGUE[1] }));
  el.after(epi);
}
