// 홈 화면에 추가(앱 설치)용 서비스 워커 등록. 모든 페이지가 불러온다.
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
