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

### 3-1. ✅ 추가 완료 (2026-09-04 이어서 세션) + 브라우저 실측

| 항목 | 파일 | 검증 |
|---|---|---|
| 스크롤 reveal(fade+slide-in) | `presets.ts`(tween.reveal·revealVariants) + `components.tsx`(Card/ChartCard `reveal` opt-in) + `main_widgets.tsx`(차트 위젯 6개 `reveal={true}`) | route=main 실측: 뷰포트 내 카드는 로드 시 등장 후 **transform:none**(잔류 변환 없음=쌓임맥락 트랩 회피), 뷰포트 밖 카드는 translateY(12)·opacity:0 대기 → 스크롤 진입 시 발화, 콘솔 에러 0 |
| 애니 Checkbox(scale-pop) | `src/dash/ui/checkbox.tsx` | 빌드 green(⚠ **미배선 프리미티브** — 실화면 체크박스는 AG Grid 내장·renderers.tsx raw input이라 현재 비가시. 도입 시 자동 적용) |

**핵심 설계 결정**:
- reveal은 **래퍼 div 금지** → root `<section>`을 `motion.section`으로 조건 전환(dcol-span 보존). `whileInView`+`viewport once`. 저모션은 MotionConfig가 y를 끔(게이트 불필요).
- reveal 활성화는 **main 대시보드 차트 위젯에만**(위젯 정의부 6곳). StatCard(KPI)는 이미 CountUp이라 제외.
- Checkbox는 공유 프리미티브라 **위험 최소 scale-pop**(Radix Indicator enter만, forceMount/controlled 재배선 안 함) — advisor의 forceMount+pathLength(양방향)는 indeterminate·form-reset 엣지 위험이라 미채택.

## 4. ⛔ 핵심 발견 — Radix 오버레이 exit 비호환 (다시 시도 말 것)

Radix 오버레이를 `AnimatePresence + forceMount + asChild motion.div`로 감싸면 **enter spring은 완벽하나 exit(닫힘)가 발화 안 됨**. Animate UI 원본(`imskyleen/animate-ui`) 소스를 1:1 이식하고 5개 원인(스프레드 순서·key 위치·AnimatePresence 배치·useControlledState 로직·닫기 경로)을 전부 맞췄는데도 실패. 마운트 유지 소비처(`<Dialog open={regOpen}>`)에서도 실패.
→ **결정: 오버레이는 tailwindcss-animate 유지(회귀 방지). dialog.tsx는 원본으로 되돌림.** Motion은 Radix 충돌 없는 표면에만. 상세는 메모리 참조.

## 5. 남은 작업

1. ✅ **스크롤 reveal** — 완료(§3-1). Card/ChartCard `reveal` opt-in, main 차트 위젯 6개 활성.
2. ✅ **애니 Checkbox** — 완료(§3-1, scale-pop). ⚠ 단 프리미티브 미배선 — 향후 실화면 체크박스를 이 `ui/checkbox.tsx`로 교체할 때 가시화됨.
3. ⏸ **Ripple / Shine / Tilt** — **스킵(사용자 확인 대기)**. 투자자산관리 대시보드 톤에 장식성 과함(Step 1에서 불꽃/별/커서팔로우 제외한 것과 동일 논리). "모두 적용"의 잔여분이라 사용자가 명시 요청하면 추가.

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
