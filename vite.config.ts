import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 해시 라우팅이라 상대 경로로 빌드하면 어느 하위 경로에 올려도 동작한다 (GitHub Pages).
  base: './',
  plugins: [react()],
  build: {
    // 작은 글꼴 조각을 CSS에 base64로 넣으면 CSS가 1MB를 넘고, 쓰는 글자 조각만 받는 unicode-range가 소용없어진다.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
  },
});
