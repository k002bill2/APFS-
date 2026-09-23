import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  /* vite.config.ts 와 같은 '@' 별칭 — 컴포넌트를 렌더하는 테스트가 ui/*(@/lib/utils)를 import 한다 */
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/dash/**/*.test.ts'],
  },
});
