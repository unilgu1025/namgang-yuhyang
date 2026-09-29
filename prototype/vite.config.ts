import { defineConfig } from 'vite';

// 게임마다 HTML 한 장.
// GitHub Pages는 https://<계정>.github.io/<저장소>/ 아래에서 열리므로 배포 빌드에서 BASE=/<저장소>/ 를 넘긴다.
export default defineConfig({
  base: process.env.BASE ?? '/',
  build: { rollupOptions: { input: { main: 'index.html', swipe: 'swipe.html', defense: 'defense.html' } } },
});
