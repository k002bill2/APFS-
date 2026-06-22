import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // @/ → src 별칭 (shadcn/ui 컴포넌트 import 해석용). tsconfig paths와 양쪽 모두 필요.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // agent-system이 5173을 쓰므로 APFS는 5273으로 고정 (충돌 회피)
  server: { port: 5273, strictPort: true },
  preview: { port: 4273, strictPort: true },
});
