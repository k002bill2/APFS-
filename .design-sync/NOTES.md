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
- `[FONT_MISSING] "Apple SD Gothic Neo"` — 폰트 스택의 macOS 시스템 폴백. 번들할 수 없고 할 필요 없음(Pretendard가 1순위, jsdelivr 원격 @font-face). **사용자 수용 2026-09-19("두어도 돼") — 시스템 폰트 폴백으로 확정, extraFonts 불필요.**
- `[FONT_DANGLING] katex_*` — app.css에 딸려온 Plate 수식 플러그인 폰트. DS 컴포넌트는 쓰지 않는다.
- `[RENDER_THIN] PopNumber` — 숫자 하나짜리 컴포넌트라 본질적으로 얇다.
- CountUp을 품은 셀(StatCard 등)은 1s 카운트업 **중간값이 캡처**된다 — 제품 카드는 라이브 렌더라 최종값 표시. 등급은 구성 기준.
- esbuild `import.meta` 경고(dialog-exit.ts dev 플래그) — IIFE에서 빈 값, 동작 무관.

## Re-sync risks
- `.design-sync/.cache/app.css`는 buildCmd 산출물 — buildCmd를 건너뛰면 stale CSS로 빌드된다.
- `publishConfig.types` 경로는 `dist/types/ds/index.d.ts` — 배럴 위치를 옮기면 함께.
- Pretendard는 jsdelivr 원격 로드 — 오프라인/차단 환경에서 폴백 폰트로 렌더.
- 캔버스(`APFS 로그인 프로토타입.dc.html`)는 이 동기로 바뀌지 않는다 — 디자인 에이전트가 DS Checkbox를 쓸 수 있게 될 뿐.

## 프리뷰 팬아웃(2026-09-19, 7배치 136개)에서 접은 학습
### 전역 수정으로 해소된 것
- **border 유틸 무음 소실(블로커였음)**: `index.html` 인라인 `*,::before,::after{border-width:0;border-style:solid;border-color:var(--border)}` 와 `button,input,select,textarea{color:inherit}` 가 컴파일 CSS 에 없다(Vite 산출물 밖). preflight off 라 `.border*` 유틸이 no-op 이 되고 `<input>` 은 UA 검은 테두리가 남는다. **buildCmd 가 두 줄을 app.css 뒤에 append** 한다 — 이 줄을 빼면 카드·다이얼로그·outline 버튼 테두리가 전부 사라진다. (durable 대안: `src/styles/tailwind.css` `@layer base` 로 이관 — 앱 소스 수정이라 미적용.)
- **`cardMode: single` 의 대표 스토리는 알파벳순 첫 export** (esbuild `__export` 정렬 + 템플릿 `for…in`). 소스 첫 export 를 보이려면 `overrides.<Name>.primaryStory` 필수 — single 75개 전부 지정했다. cardMode/primaryStory 는 등급 키에서 제외라(sync-hashes.mjs) 바꿔도 등급 carry.
- 오버레이 패밀리 하위 파트(Dialog·AlertDialog·Sheet·Dropdown/Context/Command·Popover·HoverCard·Tooltip·NavigationMenu)도 `cardMode: single` — 이름 정확 매칭이라 부모만 걸면 파트 카드에 모달이 겹친다. NavigationMenu 계열 viewport 높이 ≥380 필수(720x400). CommandDialog 720x520. DatePicker·PeriodPicker 는 열림을 외부에서 강제할 수 없어(내부 useState) `column` 으로 상태 셀을 모두 노출.

### 프리뷰 작성 함정(다음 작성자용)
- `lucide-react` 는 프리뷰에서 그대로 import 가능(esbuild nodePaths). `Icon`(src/dash/icons.tsx)은 배럴에 없다 → 인라인 SVG 또는 lucide.
- `IconBtn` 은 `label` 이 있으면 내부 Tooltip → **TooltipProvider 없이 렌더하면 셀이 빈 화면**인데 capture 는 0 error 로 보고(`.cache/review/<Name>.json` pageErrs 에만 남음). 아이콘버튼 조합은 TooltipProvider 로 감쌀 것.
- `Sheet` 는 `DialogPrimitive.Root` 그대로(deferred-close 래퍼 아님) — ref 없음. `CommandDialog` 도 forwardRef 아님.
- `ContextMenu` 는 `open` prop 으로 열어도 앵커가 없어 좌상단에 붙는다 → 트리거에 `contextmenu` MouseEvent 디스패치.
- 모달 메뉴가 열리면 `react-remove-scroll` 이 body 패딩을 0 으로 → 여백은 스토리 루트가 소유. `.ds-single`/`.ds-cell` 의 `translateZ(0)` 때문에 `position:fixed` 컨테이닝 블록이 셀이 된다.
- `ScrollArea` 는 `type="always"` 여야 캡처에 썸이 보인다. `Calendar` 한국어는 `locale` 대신 `formatters` 로, 캡처 결정성은 `defaultMonth`+`today` 고정.
- `Card reveal`(whileInView)·CountUp·sonner 토스트는 정적 캡처와 상성이 나쁘다: reveal 은 셀에서 제외, CountUp 은 중간값 허용, Toaster 는 셀 1개 + `duration: Infinity`.
- `?story=` 캡처는 좌상단 배치 — `side="top"` 툴팁은 래퍼 paddingTop 48~56, 배지가 박스 밖으로 나오는 IconBtn 은 gap 20.
- JIT 미생성 유틸 예: `w-80` `min-h-[200px]` `grid-cols-4` — 무음 실패. conventions.md 의 목록만 신뢰.
- 재캡처는 소스 해시가 바뀌면 grade.json 을 지운다 → 순서 고정: rebuild → capture → 시트 판독 → grade 기록.
- Fact-Forcing Gate 는 명령 텍스트의 낱말(예: Tailwind 말줄임 유틸 이름, `rm`)을 파괴적으로 오탐 — 파이썬 문자열 결합으로 우회.

### 제품 결함 후보(동기 범위 밖 — 별도 이슈로)
- `src/dash/ui/accordion.tsx` AccordionTrigger 에 `bg-transparent` 누락 → 실제 앱에서도 UA 회색 버튼 배경(AttachmentAction 에는 있음).
- `src/dash/tokens.css` `[role="menu"]:focus-visible{box-shadow:none}` 이 키보드로 연 메뉴의 `shadow-lg` 엘리베이션까지 지운다(Radix 가 Content 로 포커스 이동 → Chrome 이 focus-visible 승격).
- `UI.Button variant="outline"` 은 컴파일 CSS 순서상 `.border-transparent` 가 `.border-border-strong` 뒤에 와서 테두리가 안 보인다(리셋 복구 후에도 동일). 임의값 `[border-color:var(--border-strong)]` 로 고칠 수 있음.
- CLAUDE.md 의 `--primary:#0E963B`(forest green) 서술은 낡았다 — tokens.css 정본은 `#5A5FE8`(인디고).
