# HANDOFF — Animate UI 인터랙션(Motion) 도입

**작성**: 2026-09-04 · **브랜치**: `feature/task-httpsanimate-uicomdocscomponents-apfs-co-202609041410`
**관련 메모리**: `[[motion-radix-overlay-exit-incompatible]]` (핵심 발견 영속화 완료)

---

## 1. 무엇을 하는 작업인가

사용자 요청: https://animate-ui.com/docs/components 의 인터랙션을 APFS components에 "모두 적용".
사용자 결정(AskUserQuestion): **"Motion(Framer) 도입해 원본 최대 재현"** → 이 프로젝트에 한해 "라이브러리-0 정책"을 사용자 승인으로 해제하고 `motion` 13.2.0 도입.

## 2. Step 1 조사 결론 (재조사 불필요)

- Animate UI = 전부 Motion 기반, Components 72 + Primitives 82 + Icons. 상당수(불꽃놀이/별/버블 배경, 방사형 메뉴, 커서 팔로우)는 **투자자산관리 대시보드에 부적합** → 제외.
- APFS 오버레이(Dialog/Dropdown/Tooltip/Sheet/Accordion 등)는 **이미 tailwindcss-animate로 enter+exit 정상** → "없어서" 못 하는 게 아니라 "spring이 아닐 뿐".
- 대시보드에 값어치 있는 진짜 미구현: **KPI 카운트업 · 스크롤 reveal · Tabs 슬라이딩 인디케이터** (전부 Motion으로 구현 가능).

## 3. ✅ 완료 + 브라우저 실측 검증

| 항목 | 파일 | 검증 |
|---|---|---|
| Motion 13.2.0 설치 (React18 호환) | package.json | 빌드 green |
| spring 프리셋(원본 계수 상수화) | `src/dash/motion/presets.ts` | — |
| MotionConfig reducedMotion="user" | `src/dash/app.tsx` | (저모션 코드보장, 브라우저 미실측) |
| Button·IconBtn hover/press spring | `src/dash/components.tsx` | hover→scale(1.03) 실측 |
| KPI 카운트업 | `src/dash/motion/count-up.tsx` → StatCard | 0→23,840 콤마·소수 유지 실측 |
| SegTabs 슬라이딩 인디케이터 | `src/dash/components.tsx` SegTabs | left 876→843 보간 실측 |

빌드 green · 테스트 50/50 · 회귀 0.

## 4. ⛔ 핵심 발견 — Radix 오버레이 exit 비호환 (다시 시도 말 것)

Radix 오버레이를 `AnimatePresence + forceMount + asChild motion.div`로 감싸면 **enter spring은 완벽하나 exit(닫힘)가 발화 안 됨**. Animate UI 원본(`imskyleen/animate-ui`) 소스를 1:1 이식하고 5개 원인(스프레드 순서·key 위치·AnimatePresence 배치·useControlledState 로직·닫기 경로)을 전부 맞췄는데도 실패. 마운트 유지 소비처(`<Dialog open={regOpen}>`)에서도 실패.
→ **결정: 오버레이는 tailwindcss-animate 유지(회귀 방지). dialog.tsx는 원본으로 되돌림.** Motion은 Radix 충돌 없는 표면에만. 상세는 메모리 참조.

## 5. ⬜ 남은 작업 (새 세션 시작점 — 서로 독립, 병렬 가능)

전부 **비-Radix**라 exit 문제 없음. 각각 독립 추가:

1. **스크롤 reveal** — 위젯이 뷰포트 진입 시 fade/slide-in. `useInView` + `motion.div` 래퍼. Card/ChartCard(components.tsx)에 opt-in prop로. ⚠ 레이아웃 흔들림·성능 주의(위젯 多), reduced-motion 존중.
2. **애니 Switch/Checkbox** — 현재 정적. `src/dash/ui/checkbox.tsx` 등에 motion thumb/check. (Radix Checkbox지만 **enter/exit 오버레이가 아니라** 상태 전환이라 안전.)
3. **Ripple / Shine / Tilt** — 버튼·카드 효과. 신규 `src/dash/motion/*` 프리미티브 + opt-in. 낮은 우선순위(장식성).

## 6. 규약 / 함정 (새 세션 필독)

- **오버레이(Dialog/Sheet/Dropdown/Popover/HoverCard/Tooltip/ContextMenu/Accordion)에 Motion 붙이지 말 것** — exit 비호환(§4). tailwindcss-animate 그대로.
- Motion 저모션: JS 구동이라 tokens.css의 `animation-duration` CSS 규칙 무효 → 반드시 `MotionConfig reducedMotion="user"`(app.tsx, 이미 있음) 또는 `useReducedMotion()` 게이트.
- 카운트업/마스크: `kpi.value`는 포맷 문자열, 마스크 ON이면 mn()이 숫자→0. CountUp은 마스크 ON·복합 숫자면 정적 폴백(오포맷 방지). **`mask.tsx`의 `_on`은 현재 false**(다른 세션이 바꿈, 내 작업 아님).
- spring 계수는 `presets.ts` 한 곳에서만. 리터럴 분산 금지.
- 색은 tokens.css 변수만, z는 토큰 스케일만(dashboard-ui·color-tokens·z-index 스킬).

## 7. 검증 방법

```bash
npm run dev    # http://localhost:5273
npm run build  # green 확인 (tsc 에러는 Phase 0 기존, esbuild 무시)
npm test       # 50/50
```
- 카운트업 확인: route "main"(localStorage `apfs.route`=main), StatCard 숫자 램프.
- SegTabs 확인: main의 월/분기/연 탭 클릭 → 배경 슬라이드.
- 브라우저 자동화: `aside-browser` 스킬 + MCP `repl`(Playwright식). 연결 자주 끊김 → 한 호출에 fresh ref로.

## 8. 커밋 상태 (미커밋)

**내 파일**: `package.json`·`package-lock.json`·`src/dash/app.tsx`·`src/dash/components.tsx`·`src/dash/motion/`(신규 3파일).
**내 작업 아님(분리 필요)**: `src/dash/mask.tsx`(`_on=false`)·`src/dash/shell.tsx`(StatusBadge 라벨)·`.claude/commands/start-all.md` — 다른 세션. 커밋 시 스테이징에서 제외.
커밋은 사용자 명시 지시 시에만(`/commit-push-pr`, 브랜치 가드 준수, 트레일러 포함).
