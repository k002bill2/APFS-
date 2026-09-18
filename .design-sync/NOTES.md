# design-sync NOTES — APFS Dashboard DS (claude.ai/design 프로젝트 709895f7)

## 저장소 특성 (재동기 시 먼저 읽을 것)
- **앱 저장소, 라이브러리 아님.** dist 라이브러리 엔트리·.d.ts 트리가 없다. 컨버터는 `srcDir: src/ds`(배럴 `src/ds/index.tsx`)에서 엔트리를 합성한다.
  `--entry ./dist/index.es.js`(존재하지 않는 경로)를 넘겨야 패키지 루트가 저장소 루트로 잡힌다(없으면 `node_modules/<pkg>`를 찾다 실패).
- **합성 모드는 `componentSrcMap` 핀만 컴포넌트로 인정**한다(`exportedNames`가 .d.ts 엔트리에서 읽으므로). 배럴에 모듈을 추가하면 핀도 추가할 것.
- **props 계약**: `npx tsc -p .design-sync/tsconfig.types.json`(noCheck, emitDeclarationOnly)로 배럴 그래프 .d.ts를 `dist/types/`에 emit하고
  `package.json` `publishConfig.types`가 그 엔트리를 가리킨다(private 패키지라 npm에는 무의미). `buildCmd`가 이 순서를 포함한다 — vite build가 dist를 비우므로 tsc는 그 뒤.
- **CSS**: Tailwind preflight off + 유틸 클래스 기반이라 `cssEntry`는 **vite 산출 컴파일 CSS**(`dist/assets/index-*.css` → `.design-sync/.cache/app.css`). tokens.css만으로는 무스타일.
  Tailwind JIT라 앱이 쓰지 않는 유틸(`grid-cols-5` 등)은 CSS에 없다 — 프리뷰/디자인 에이전트의 레이아웃 글루는 인라인 style 또는 `var(--*)` 토큰.
- **tokens/ 는 비어 있다**: `copyTokens`는 `tokensPkg`(node_modules 패키지)가 있어야만 동작. 토큰은 `_ds_bundle.css`(app.css) 안 `:root`/`.dark` 블록으로 디자인에 도달한다.
- **가이드라인**: 기본 glob이 저장소 `docs/*.md`(메뉴구성도 등 프로젝트 문서)를 끌어와 `guidelinesGlob: [".design-sync/guidelines/**/*.md"]`로 막았다. 큐레이션 가이드는 그 디렉터리에 둔다.
- **렌더 검증 브라우저**: playwright 브라우저 미설치. `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`로 시스템 Chrome 사용(validate·capture·subagent 전부).
- Node 25.6 실행(.nvmrc 22) — vite build·tsc 모두 통과. 재동기 시 22로 맞춰도 무방.
- Fact-Forcing Gate(ECC hook)가 Write/rm을 막는다 — 프리뷰·설정 파일은 Bash 히어독으로 쓴다.

## 프리뷰 작성 규약(이 저장소)
- import는 `'apfs-dashboard-offline'`(→ window.APFS). named export = 대문자 시작 **함수**(컴포넌트)만 셀로 잡힌다.
- 제어형 Dialog(`open`)는 `ref` 필수(dialog-exit 계약). 캡처에 포커스 하이라이트가 찍히지 않게 `onOpenAutoFocus={e=>e.preventDefault()}`.
- Radix 하위 파트(SheetTitle 등)는 부모 조합 전체가 프리뷰다(단독 렌더는 "must be used within" 에러).
- 아이콘 prop은 문자열 이름(`src/dash/icons.tsx` 키): check plus download refresh bell settings landmark target shield-alert trending inbox trash search 등.

## Known render warns (재동기 시 새 경고와 대조)
- `[FONT_MISSING] "Apple SD Gothic Neo"` — 폰트 스택의 macOS 시스템 폴백. 번들할 수 없고 할 필요 없음(Pretendard가 1순위, jsdelivr 원격 @font-face).
- `[FONT_DANGLING] katex_*` — app.css에 딸려온 Plate 수식 플러그인 폰트. DS 컴포넌트는 쓰지 않는다.
- `[RENDER_THIN] PopNumber` — 숫자 하나짜리 컴포넌트라 본질적으로 얇다.
- CountUp을 품은 셀(StatCard 등)은 1s 카운트업 **중간값이 캡처**된다 — 제품 카드는 라이브 렌더라 최종값 표시. 등급은 구성 기준.
- esbuild `import.meta` 경고(dialog-exit.ts dev 플래그) — IIFE에서 빈 값, 동작 무관.

## Re-sync risks
- `.design-sync/.cache/app.css`는 buildCmd 산출물 — buildCmd를 건너뛰면 stale CSS로 빌드된다.
- `publishConfig.types` 경로는 `dist/types/ds/index.d.ts` — 배럴 위치를 옮기면 함께.
- Pretendard는 jsdelivr 원격 로드 — 오프라인/차단 환경에서 폴백 폰트로 렌더.
- 캔버스(`APFS 로그인 프로토타입.dc.html`)는 이 동기로 바뀌지 않는다 — 디자인 에이전트가 DS Checkbox를 쓸 수 있게 될 뿐.
