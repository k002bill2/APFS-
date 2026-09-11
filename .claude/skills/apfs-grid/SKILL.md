---
name: apfs-grid
description: APFS 대시보드 리스트/그리드/매트릭스 페이지의 공통 양식 규약. GridFrame 프레임 컴포넌트로 페이지 골격(PageHeader·카드헤더+KPI·툴바·푸터)을 통일한다. 리스트·테이블·그리드·매트릭스형 조회 화면을 새로 만들거나 기존 화면을 공통 양식에 맞출 때 사용. Use when building or unifying list/grid/matrix table pages with the shared GridFrame shell.
---

# apfs-grid Skill

## 컨텍스트
APFS 대시보드의 리스트/그리드/매트릭스 페이지는 **테이블 본체는 제각각**(리스트=체크박스·CRUD·페이지네이션, 매트릭스=2단헤더·합계행·조회전용)이지만 **바깥 양식은 동일**해야 한다. `GridFrame`이 그 양식 골격을 SSOT로 소유하고, 테이블 내용은 `children`으로 주입받는다. "양식은 강제(통일), 내용은 자유"가 원칙.

- 정본 컴포넌트: `src/dash/grid_frame.tsx` (`GridFrame`, `KpiBadge`)
- 첫 실증: `src/dash/asset_funding.tsx` (매트릭스형)
- 양식 출처(SSOT): `generic_list.tsx`의 인라인 양식을 GridFrame이 흡수 — 신규/마이그레이션 모두 이 프레임을 쓴다.

## 프레임 구조
```
┌─ GridFrame ───────────────────────────────────────┐
│ PageHeader (crumbs · headerActions)                │
├───────────────────────────────────────────────────┤
│ 카드헤더: <h3>{cardTitle??title}</h3>+sub캡션 ·{kpis}│
├───────────────────────────────────────────────────┤  ← 툴바(슬롯이 있을 때만)
│ 툴바:  {toolbarLeft}            ·     {toolbarRight}│
├───────────────────────────────────────────────────┤
│ {children}  ← 테이블 본체 (리스트/매트릭스 자유)   │
├───────────────────────────────────────────────────┤  ← 푸터(슬롯이 있을 때만)
│ 푸터: {footerLeft} · {footerCenter} · {footerRight}│
└───────────────────────────────────────────────────┘
```
- 카드는 `Card pad={0}` + `overflow:hidden`. 툴바/푸터는 해당 슬롯이 하나라도 있을 때만 렌더(테두리·muted 배경 양식 내장).
- 루트는 `maxWidth:1280 · margin:0 auto`(generic_list 정본 폭) + `dashFade` 애니메이션.
- ⚠️ 현 `shell.tsx`의 `PageHeader`는 `title`/`sub`를 받기만 하고 렌더하지 않는다(crumbs·actions만). 그래서 **GridFrame이 `title`을 카드헤더 `<h3>`로, `sub`를 그 아래 캡션으로 직접 렌더**한다 — prop으로 넘긴 제목/설명은 반드시 화면에 나타난다.

## GridFrame API (정본 — 변경 시 이 표도 갱신)
```ts
interface GridFrameProps {
  crumbs: string[];          // PageHeader 브레드크럼 (필수)
  title: string;             // 페이지 제목 (필수) — 카드헤더 <h3>로 렌더(cardTitle 미지정 시)
  sub?: string;              // 카드헤더 타이틀 아래 캡션으로 렌더 (단위 범례 등). 비마스킹
  headerActions?: ReactNode; // PageHeader 우측 액션. 매트릭스/집계형은 primary 내보내기를 여기 둔다(asset_funding). 관리형 리스트는 내보내기를 툴바 kebab에 두므로 여기엔 보통 '메인으로'만 → 아래 "관리형 리스트 툴바·타이틀 규약"
  cardTitle?: string;        // 카드헤더 타이틀 (미지정 시 title 재사용)
  kpis?: ReactNode;          // 카드헤더 우측 KPI 배지군 (KpiBadge 나열)
  favRoute?: string;         // 즐겨찾기 별(★) 토글 활성 — 현재 페이지 라우트(onNav 인자와 동일 문자열).
                             // 지정 시 카드헤더 타이틀 옆에 별 렌더, 클릭=MenuStore 'fav' on/off(제한 없음).
                             // 키 도메인=ALLMENU(key=라우트, MENU 평탄화) — 라우트가 메뉴에 없으면 별 미렌더.
  toolbarLeft?: ReactNode;   // 툴바 좌: 필터칩·선택 액션·컨텍스트 설명
  toolbarRight?: ReactNode;  // 툴바 우: 새로고침·상세필터 등
  footerLeft?: ReactNode;    // 푸터 좌: 건수 등 요약
  footerCenter?: ReactNode;  // 푸터 중: 페이지네이션
  footerRight?: ReactNode;   // 푸터 우: 뷰 토글·다운로드 등
  children: ReactNode;       // 테이블 본체
}

// KPI 배지 (헤더 kpis 슬롯에 나열)
function KpiBadge(props: { icon: string; color: string; label: string; value: ReactNode; valueColor?: string }): JSX.Element
```

## 핵심 계약 (CRITICAL)
1. **테이블 가로 스크롤은 children 책임.** `Card`가 `overflow:hidden`이므로, 가로로 넘치는 테이블은 **반드시 자체 `overflow-x:auto` + `min-width` 래퍼**로 감쌀 것. 안 그러면 *스크롤이 아니라 클립*된다(responsive-ui 대표 실패 모드). 표준 패턴:
   ```tsx
   <div className="overflow-x-auto">
     <table className="w-full border-collapse min-w-[880px]">…</table>
   </div>
   ```
2. **토큰만 사용.** 색/테두리/배경은 `var(--…)`·`color-mix`만. 하드코딩 hex 금지(다크 깨짐). 프레임 자체가 토큰 기반이라 라이트/다크 자동 양립.
3. **마스킹.** `KpiBadge`는 라벨을 `<MT>`로 마스킹(generic_list verbatim) — 값은 호출자가 이미 `mn()` 처리해 넘긴다(단위 문자열은 비마스킹). 표 헤더·단위·탭·축(연도 등)·StatusBadge는 비마스킹("축은 두고 데이터는 가린다").
4. **반응형.** 모든 슬롯 행에 `flexWrap` 내장. 호출자는 슬롯 내부 묶음에도 좁을 때 적층되도록 둘 것. 입력이 있으면 폰트 ≥16px(responsive-ui).

## KPI 배지 행 (옵션 — 생성 스킬 HITL 결정, 기본 미포함)
카드헤더 우측 KPI 배지 행(`kpis` 슬롯)은 **옵션**이다(2026-09-11 규약 변경 — 이전 "기본 포함"에서 뒤집음). 페이지를 새로 생성할 때 [[apfs-capture-schema]]·[[apfs-manage-page]] SOP가 **HITL(`AskUserQuestion`)로 포함 여부를 먼저 묻고**, 사용자가 "포함"을 고른 경우에만 배지를 만든다. **기본값 = 미포함.** 포함 시 구성 = **전체 건수 + 도메인별 2지표**(3배지). 값은 호출자가 `mn()` 처리해 넘기고, 라벨은 `KpiBadge`가 `<MT>` 마스킹.
- **typed 페이지**(subfund_manage 등): 포함이면 `kpis={<><KpiBadge …/>…</>}`로 값을 직접 계산해 나열, 미포함이면 `kpis`를 넘기지 않는다(`GridFrame`이 `{kpis && …}`라 영역째 사라짐).
- **스키마 페이지**(GenericListPage/PageSchema):
  - 포함이면 `schema.countKpis`로 **선언만** 하면 자동 렌더되고 **필터 결과에 반응**한다(제네릭 금액 KPI를 대체).
    - `CountKpiSpec = { label; icon; color; column?; value? }` — `column+value`면 그 값과 일치하는 행 수, 없으면 전체 건수(`filtered` 파생).
    - 표준 팔레트: `layers`/`var(--primary)`(전체 건수) · `check-circle`/`var(--success)` · `wallet`/`var(--accent)`(도메인 2지표).
  - **미포함이면 `schema.hideKpis: true`** — 헤더 KPI 슬롯만 비운다. `countKpis`와 제네릭 금액 KPI(평균 변동률·합계 금액)를 **둘 다** 무력화하되 **카드뷰 금액/상태는 유지**(hideMetrics와 분리). ⚠️ 금액 컬럼이 있는 엔티티는 `countKpis`를 안 넣는 것만으로는 안 된다 — 제네릭 금액 KPI가 폴백으로 남으므로 `hideKpis:true`가 필수(`generic_list.tsx` `kpis={schema.hideKpis ? undefined : countKpiNodes ? … : hideMetrics ? undefined : 금액KPI}`).
  - **금액·변동률 개념 자체가 없는 엔티티**(공고 등)는 `hideMetrics: true`(제네릭 금액 KPI + 카드뷰 금액/상태 동시 제거). KPI 행만 끄려면 `hideKpis`, 금액 개념 전체를 끄려면 `hideMetrics`.
- 정본: **현재 두 트랙 모두 "미포함"이 실제 화면이다**(2026-09-11 사용자 지시로 자펀드 공고 정보관리·자펀드 관리에서 KPI 행 제거). 스키마 트랙 = `schemas/자펀드_공고_정보관리.ts`(`countKpis` 3배지 삭제 → `hideKpis: true`), typed 트랙 = `subfund_manage.tsx`(`kpis` prop과 KPI 전용 파생값 `totalCommit`·`formedCount`를 함께 삭제 — GridFrame이 `{kpis && …}`라 슬롯째 사라진다). 포함 예시가 필요하면 이 커밋 이전 리비전을 참고.

## 리스트 vs 매트릭스 — 어떤 children인가
- **리스트**(항목 CRUD): 단일 헤더 + 체크박스 + 행 액션. 툴바=필터칩/선택, 푸터=건수+페이지네이션+뷰토글. 스키마 주도면 `generic_list.tsx`/PageSchema 트랙.
- **매트릭스/집계**(조회전용): 2단 중첩헤더(`colSpan`/`rowSpan`)+합계행. 체크박스·CRUD·페이지네이션 없음. 툴바=컨텍스트 설명+새로고침, 푸터=건수. 캡처가 중첩헤더면 `apfs-capture-schema` SOP가 이쪽으로 escalate한다.

## 사용 예 (asset_funding 실증)
```tsx
<GridFrame
  crumbs={['홈','투자자산관리','모태펀드관리','모태펀드 조성 및 출자현황']}
  title="모태펀드 조성 및 출자현황"
  cardTitle="모태펀드 조성·출자 현황표"   // 매트릭스/집계형 예외: 문서 정식명칭을 카드 제목으로(리스트형은 메뉴 리프와 일치)
  headerActions={<><Button variant="outline" leadingIcon="chevron-left" onClick={()=>onNav('main')}>메인으로</Button><Button variant="primary" leadingIcon="download">내보내기</Button></>}
  kpis={<><KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(t)) + ' 억원'} /> …</>}  // ⚠ 옵션: HITL "포함" 선택 시에만 전달(미포함이면 kpis 생략) — "KPI 배지 행" 절 참조
  toolbarLeft={<><Icon name="file" size={16} /><span>… 집계</span></>}
  toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} />}
  footerLeft={<span>{'2010 ~ 2025년 · 총 ' + mn('16') + '개 연도'}</span>}>
  <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[880px]">…</table></div>
</GridFrame>
```

## 프레임 외관 규약 (2026-09-08 사용자 확정 — 자펀드관리에서 정립, GridFrame 전 페이지 공통)
- **카드 배경 = 페이지 배경, 테두리·그림자 없음.** `grid_frame.tsx`가 `Card`에 inline `background:'var(--frame-bg)', border:0, boxShadow:'none'`을 얹는다(inline이 Card의 `border bg-card` 클래스보다 우선). `--frame-bg`는 `tokens.css` 라이트/다크 모두 `var(--bg)` — **전체 색을 바꾸려면 이 토큰 한 줄**. sticky 푸터 배경도 같은 토큰(안 그러면 흰 띠).
- **`sub` 캡션은 쓰지 않는다.** 화면 설명 문구는 제거 대상(사용자 결정). 단위 표기는 **`toolbarRight` 맨 앞에 12px caption** `단위: 원`(비마스킹)으로.
- **푸터 골드 양식**(리스트형·매트릭스형 공통): `footerLeft` = `총 N개 중 M개 항목 표시 중` · `footerCenter` = `view==='list' && page.total>1`일 때만 페이저(`IconBtn chevron-left/right` + `PageBtn`) · `footerRight` = `SegTabs 리스트 뷰|카드뷰` + `IconBtn download / maximize(전체보기, list일 때만) / external(새 창)` + 상단 kebab이 화면 밖일 때만 `!topMoreVisible && <MoreMenu size={32}>` 폴백(정적 `IconBtn more`는 onClick 없는 죽은 버튼이라 폐기 — `subfund_manage.tsx`·`generic_list.tsx` 둘 다 폴백형). ⚠️ 관찰 effect의 미지원 가드는 **`setTopMoreVisible(false)` 후 return**이어야 한다 — 그냥 `return`하면 초기값 `true`가 굳어 푸터 kebab이 영원히 안 뜨고 내보내기·인쇄 접근이 끊긴다(`if (!el) return`과 분리해 쓸 것). `PageBtn`은 골드(`asset_funding.tsx`·`subfund_manage.tsx`)에 **로컬 복사**돼 있는 헬퍼다 — 공유 export 아님, 골드에서 복사.
- 카드뷰 전환·선택 동기화는 [[apfs-card-view]]. **카드뷰가 의미 없는 엔티티는 스키마 트랙에서 `hideCardView: true`로 끈다**(2026-09-11 신설) — 푸터 `SegTabs`를 렌더하지 않고 `view`를 `"list"` 파생값으로 고정해 `view === "list"` 게이트(페이저·전체보기·그리드 본체)가 모두 참이 된다. `viewState`는 남기되 화면엔 리스트만 나온다. 표현 전용 플래그 3종은 서로 독립: `hideKpis`(헤더 KPI 슬롯) · `hideMetrics`(금액 개념 전체) · `hideCardView`(푸터 뷰 토글). 첫 적용 정본 = `schemas/자펀드_공고_정보관리.ts`. **typed 페이지는 플래그가 아니라 직접 제거한다** — `subfund_manage.tsx`는 `footerRight`의 `SegTabs`를 지우고 `const [view, setView] = useState('list')`를 `const view = 'list'` 상수로 내렸다(setView 호출처가 SegTabs뿐이었다). 카드 렌더 분기(`view === 'detail'`)는 복구 대비로 남겨 둔다.

## 관리형 리스트 툴바·타이틀 규약 (2026-09-11 subfund_manage에서 정립)
리스트형(CRUD) 페이지 한정. 매트릭스/집계형은 위 골든(`headerActions` primary 내보내기)을 그대로 둔다.

- **1차 액션(등록)은 툴바 독립 버튼, 보조 액션은 kebab(⋯).** 2026-09-11 사용자 결정으로 *등록을 kebab 밖으로 승격*했다(이전 규약 "등록도 kebab 안에"를 뒤집음 — 진입 빈도가 높은데 2클릭이 걸렸다). 순서는 고정:
  ```
  toolbarRight:  단위: 원 │ ▣ 상세필터 │ ＋ 등록 │ ⟳ 새로고침 │ ⋯ kebab
                 caption    ghost         outline    IconBtn      MoreMenu
  ```
  등록 버튼은 `<Button variant="outline" size="sm" leadingIcon="plus">`— 주변 보조 액션이 ghost·아이콘이라 outline 하나만으로 위계가 선다(primary는 과함). 라벨은 도메인 액션명 그대로(`제안서접수 등록`), "등록"으로 줄이지 않는다.
- **kebab에 남는 것은 내보내기(Excel)·인쇄뿐.** **내보내기용 독립 "엑셀" 버튼을 `toolbarRight`에 따로 두지 않는다**(kebab 항목으로 흡수). 내보내기 진입점은 **kebab 항목 + 푸터 `IconBtn download` + 단축키 `⌥D`** 세 곳 — 중복 아님(위 39행 "한 곳에만"은 *툴바 독립 버튼*을 두지 말라는 뜻).
- **kebab 항목엔 단축키 힌트(`DropdownMenuShortcut`) 동반**: 내보내기 `HOTKEYS.export`(⌥D)·인쇄 `HOTKEYS.print`(⌘P). ⚠️ **등록 ⌘⏎(`HOTKEYS.register`)는 바인딩만 살아 있고 화면 힌트가 없다** — `Button`은 `forwardRef`/rest props가 없어 Radix `Tooltip asChild` 트리거로 못 쓰고 `title`도 안 먹기 때문(→ [[ui-button-not-radix-aschild-trigger]] 함정). 힌트를 살리려면 Button `children`에 `<span>{HOTKEYS.register.hint}</span>`를 덧붙이는 방법뿐. 단축키 시스템·mod/⌥ 2티어·Windows 함정은 → [[apfs-hotkeys]] (여기서 표 복제 금지, 링크만).
- **`MoreMenu`는 공유 컴포넌트가 아니다** — `generic_list.tsx`·`asset_funding.tsx`(`PoCMoreMenu`)·`subfund_manage.tsx`가 각자 **로컬 복사본**(`PageBtn`과 동일 방식, 공유 export 아님). 골드는 `subfund_manage.tsx`(Tooltip 래핑·`DropdownMenuShortcut`·`onExport/size` props — `onRegister`는 등록 승격으로 제거됨). 상단 `toolbarRight`의 `topMoreRef` + 화면 밖일 때 푸터 폴백 `!topMoreVisible && <MoreMenu>` 쌍으로 스크롤 중 접근 유지(등록은 툴바 버튼 + ⌘⏎로 접근하므로 폴백 대상이 아니다). 신규 페이지는 골드에서 복사하고 `onExport` 등 필요한 prop을 배선한다.
- ✅ **스키마 주도 트랙 반영 완료(2026-09-11)**: `generic_list.tsx`도 같은 규약이다 — 등록은 툴바 독립 버튼(`{editable && <Button variant="outline" leadingIcon="plus">{schema.entity + ' 등록'}</Button>}`, 라벨=스키마 `entity` 기반 도메인 액션명), kebab은 내보내기·인쇄만(+`DropdownMenuShortcut` 힌트·Tooltip 래핑·`size` prop). `topMoreRef`+IntersectionObserver 푸터 폴백, 핫키 3종(⌘⏎ 등록은 `enabled: editable && modal === null`), `IconBtn refresh` 라벨 `새로고침`, 푸터의 죽은 `IconBtn more`는 `MoreMenu` 폴백으로 교체까지 골드와 동형. `fields`가 없는 스키마(연도별투자현황·조합별 월간보고 현황)는 `editable=false`라 등록 버튼이 뜨지 않는다.
- **타이틀은 메뉴 리프와 일치.** `cardTitle`·`title`·`crumbs` 리프를 **`data.ts` 메뉴 리프 라벨 문자열 그대로**(띄어쓰기 포함) 맞춘다. `cardTitle`이 `title`과 같으면 생략 가능(H1=`cardTitle ?? title`). **"○○ 목록" 같은 임의 축약 금지**(2026-09-11 "자펀드 목록"→"자펀드 관리" 정정). 매트릭스/집계형이 문서 정식명칭을 카드 제목으로 쓰는 것(asset_funding "…현황표")은 예외.

## 검증
`npm run build`(exit 0) + `npm test`(스키마 zod) + 브라우저 라이트/다크·1280/768/400 시각 확인(responsive-ui 프로토콜) + 기존 페이지(generic_list 등) 무변경 회귀.
- 프레임: `getComputedStyle(section).backgroundColor === 페이지 배경` · `borderTopWidth==='0px'` · `boxShadow==='none'`(라이트/다크 둘 다).

## 참조
- UI/디자인 시스템 전반: [[dashboard-ui]]
- 반응형 체크리스트·검증: [[responsive-ui]]
- 캡처→매트릭스 escalate 경로: [[apfs-capture-schema]]
