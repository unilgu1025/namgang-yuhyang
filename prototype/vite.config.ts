import { defineConfig } from 'vite';

// 게임마다 HTML 한 장.
export default defineConfig({
  build: { rollupOptions: { input: { main: 'index.html', swipe: 'swipe.html', defense: 'defense.html' } } },
});
