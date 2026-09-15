import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 이 파일이 있는 체크아웃의 .claude/worktrees/ 절대경로 (메인 체크아웃에서만 실재한다)
const worktreeDir = fileURLToPath(new URL('./.claude/worktrees/', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // @/ → src 별칭 (shadcn/ui 컴포넌트 import 해석용). tsconfig paths와 양쪽 모두 필요.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // agent-system이 5173을 쓰므로 APFS는 5273으로 고정 (충돌 회피)
  // 워크트리(.claude/worktrees/<branch>)는 저장소 root 안에 있지만 별개 체크아웃이다.
  // 워처에서 빼지 않으면 dev 서버가 남의 브랜치 파일 변경에 HMR 을 돌린다.
  // ⚠ 반드시 **이 설정 파일 기준 절대경로**로 쓴다. `'**/.claude/worktrees/**'` 같은 상대 glob 은
  //   워크트리 *안에서* dev 서버를 띄웠을 때(wt.sh dev) 그 워크트리 자신의 root 까지 매칭해
  //   소스 전체가 무시되고 HMR 이 죽는다. 절대경로면 워크트리에선 존재하지 않는 경로가 되어 무해하다.
  server: { port: 5273, strictPort: true, watch: { ignored: [`${worktreeDir}**`] } },
  preview: { port: 4273, strictPort: true },
});
