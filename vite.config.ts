import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // agent-system이 5173을 쓰므로 APFS는 5273으로 고정 (충돌 회피)
  server: { port: 5273, strictPort: true },
  preview: { port: 4273, strictPort: true },
});
