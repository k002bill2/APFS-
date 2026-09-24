---
name: apfs-grid
description: APFS 대시보드 리스트/그리드/매트릭스 페이지의 공통 양식 규약. GridFrame 프레임 컴포넌트로 페이지 골격(PageHeader·카드헤더+KPI·툴바·푸터)을 통일한다. 리스트·테이블·그리드·매트릭스형 조회 화면을 새로 만들거나 기존 화면을 공통 양식에 맞출 때 사용. Use when building or unifying list/grid/matrix table pages with the shared GridFrame shell.
---

# apfs-grid Skill

## 컨텍스트
APFS 대시보드의 리스트/그리드/매트릭스 페이지는 **테이블 본체는 제각각**(리스트=체크박스·CRUD·페이지네이션, 매트릭스=2단헤더·합계행·조회전용)이지만 **바깥 양식은 동일**해야 한다. `GridFrame`이 그 양식 골격을 SSOT로 소유하고, 테이블 내용은 `children`으로 주입받는다. "양식은 강제(통일), 내용은 자유"가 원칙.

- 정본 컴포넌트: `src/dash/grid_frame.tsx` (`GridFrame`, `KpiBadge`, `FooterActions`)
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
  sub?: string;              // 카드헤더 타이틀 아래 캡션으로 렌더 (단위 범례 등)
  headerActions?: ReactNode; // PageHeader 우측 액션. 내보내기는 푸터 FooterActions 가 담당하므로 여기엔 보통 '메인으로'만 → 아래 "관리형 리스트 툴바·타이틀 규약"
  cardTitle?: string;        // 카드헤더 타이틀 (미지정 시 title 재사용)
  kpis?: ReactNode;          // 카드헤더 우측 KPI 배지군 (KpiBadge 나열)
  favRoute?: string;         // 즐겨찾기 별(★) 토글 활성 — 현재 페이지 라우트(onNav 인자와 동일 문자열).
                             // 지정 시 카드헤더 타이틀 옆에 별 렌더, 클릭=MenuStore 'fav' on/off(제한 없음).
                             // 키 도메인=ALLMENU(key=라우트, MENU 평탄화) — 라우트가 메뉴에 없으면 별 미렌더.
  toolbarLeft?: ReactNode;   // 툴바 좌: 칩이 아닌 컨텍스트 설명만 (기본 칩은 filterChips, 적용 칩은 appliedFilters, 선택 액션은 contextActions)
  appliedFilters?: readonly AppliedFilter[]; // 적용 칩({label,value,onClear?}[]) → "필터 툴바" 절
  filterChips?: readonly FilterChipItem[];   // 기본 필터 칩({key,label,count?,active,onSelect}[]) — 넘치면 +N 메뉴 → "필터 툴바" 절
  contextActions?: ReactNode;// 선택 컨텍스트 액션 묶음(수정·삭제·선택 해제·단계 전이…).
                             // 툴바 좌측에 렌더되다가 스크롤로 툴바가 가려지면 하단 플로팅 바로 **이동**한다.
                             // → 아래 "선택 액션 플로팅 바" 절. 안 넘기면 동작 변화 0.
  toolbarRight?: ReactNode;  // 툴바 우: 새로고침·상세필터 등
  footerLeft?: ReactNode;    // 푸터 좌: 건수 등 요약
  footerCenter?: ReactNode;  // 푸터 중: 페이지네이션
  footerRight?: ReactNode;   // 푸터 우: **<FooterActions/> 하나**(전체보기·새 창·내보내기·인쇄 4종 SSOT)
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
3. **반응형.** 모든 슬롯 행에 `flexWrap` 내장. 호출자는 슬롯 내부 묶음에도 좁을 때 적층되도록 둘 것. 입력이 있으면 폰트 ≥16px(responsive-ui).

## KPI 배지 행 (옵션 — 생성 스킬 HITL 결정, 기본 미포함)
카드헤더 우측 KPI 배지 행(`kpis` 슬롯)은 **옵션**이다(2026-09-11 규약 변경 — 이전 "기본 포함"에서 뒤집음). 페이지를 새로 생성할 때 [[apfs-capture-schema]]·[[apfs-manage-page]] SOP가 **HITL(`AskUserQuestion`)로 포함 여부를 먼저 묻고**, 사용자가 "포함"을 고른 경우에만 배지를 만든다. **기본값 = 미포함.** 포함 시 구성 = **전체 건수 + 도메인별 2지표**(3배지).
- **typed 페이지**(subfund_manage 등): 포함이면 `kpis={<><KpiBadge …/>…</>}`로 값을 직접 계산해 나열, 미포함이면 `kpis`를 넘기지 않는다(`GridFrame`이 `{kpis && …}`라 영역째 사라짐).
- **스키마 페이지**(GenericListPage/PageSchema):
  - 포함이면 `schema.countKpis`로 **선언만** 하면 자동 렌더되고 **필터 결과에 반응**한다(제네릭 금액 KPI를 대체).
    - `CountKpiSpec = { label; icon; color; column?; value? }` — `column+value`면 그 값과 일치하는 행 수, 없으면 전체 건수(`filtered` 파생).
    - 표준 팔레트: `layers`/`var(--primary)`(전체 건수) · `check-circle`/`var(--success)` · `wallet`/`var(--accent)`(도메인 2지표).
  - **미포함이면 `schema.hideKpis: true`** — 헤더 KPI 슬롯만 비운다. `countKpis`와 제네릭 금액 KPI(평균 변동률·합계 금액)를 **둘 다** 무력화한다(hideMetrics와 분리 — 금액 개념 자체는 남는다). ⚠️ 금액 컬럼이 있는 엔티티는 `countKpis`를 안 넣는 것만으로는 안 된다 — 제네릭 금액 KPI가 폴백으로 남으므로 `hideKpis:true`가 필수(`generic_list.tsx` `kpis={schema.hideKpis ? undefined : countKpiNodes ? … : hideMetrics ? undefined : 금액KPI}`).
  - **금액·변동률 개념 자체가 없는 엔티티**(공고 등)는 `hideMetrics: true`(제네릭 금액 KPI 제거 + 금액/상태 파생 표현 억제). KPI 행만 끄려면 `hideKpis`, 금액 개념 전체를 끄려면 `hideMetrics`.
- 정본: **현재 두 트랙 모두 "미포함"이 실제 화면이다**(2026-09-11 사용자 지시로 자펀드 공고 정보관리·자펀드 관리에서 KPI 행 제거). 스키마 트랙 = `schemas/자펀드_공고_정보관리.ts`(`countKpis` 3배지 삭제 → `hideKpis: true`), typed 트랙 = `subfund_manage.tsx`(`kpis` prop과 KPI 전용 파생값 `totalCommit`·`formedCount`를 함께 삭제 — GridFrame이 `{kpis && …}`라 슬롯째 사라진다). 포함 예시가 필요하면 이 커밋 이전 리비전을 참고.

## 리스트 vs 매트릭스 — 어떤 children인가
- **리스트**(항목 CRUD): 단일 헤더 + 체크박스 + 행 액션. 툴바=필터칩/선택, 푸터=건수+페이지네이션+뷰토글. 스키마 주도면 `generic_list.tsx`/PageSchema 트랙.
- **매트릭스/집계**(조회전용): 2단 중첩헤더(`colSpan`/`rowSpan`)+합계행. 체크박스·CRUD·페이지네이션 없음. 툴바=컨텍스트 설명+새로고침, 푸터=건수. 출처(목업 HTML·캡처)가 중첩헤더면 `apfs-capture-schema` SOP가 이쪽으로 escalate한다.

## 사용 예 (asset_funding 실증)
```tsx
<GridFrame
  crumbs={['홈','투자자산관리','모태펀드관리','모태펀드 조성 및 출자현황']}
  title="모태펀드 조성 및 출자현황"
  cardTitle="모태펀드 조성·출자 현황표"   // 매트릭스/집계형 예외: 문서 정식명칭을 카드 제목으로(리스트형은 메뉴 리프와 일치)
  headerActions={<><Button variant="outline" leadingIcon="chevron-left" onClick={()=>onNav('main')}>메인으로</Button><Button variant="primary" leadingIcon="download">내보내기</Button></>}
  kpis={<><KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={fmt(t) + ' 억원'} /> …</>}  // ⚠ 옵션: HITL "포함" 선택 시에만 전달(미포함이면 kpis 생략) — "KPI 배지 행" 절 참조
  toolbarLeft={<><Icon name="file" size={16} /><span>… 집계</span></>}
  toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} />}
  footerLeft={<span>{'2010 ~ 2025년 · 총 16개 연도'}</span>}>
  <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[880px]">…</table></div>
</GridFrame>
```

## 프레임 외관 규약 (2026-09-08 사용자 확정 — 자펀드관리에서 정립, GridFrame 전 페이지 공통)
- **카드 배경 = 페이지 배경, 테두리·그림자 없음.** `grid_frame.tsx`가 `Card`에 inline `background:'var(--frame-bg)', border:0, boxShadow:'none'`을 얹는다(inline이 Card의 `border bg-card` 클래스보다 우선). `--frame-bg`는 `tokens.css` 라이트/다크 모두 `var(--bg)` — **전체 색을 바꾸려면 이 토큰 한 줄**. sticky 푸터 배경도 같은 토큰(안 그러면 흰 띠).
- **카드헤더 타이틀 행 높이 = 60px 고정**(2026-09-11 사용자 확정). 구성은 `padding: '15px 18px'` + 가장 큰 자식(FavStar 버튼 30px) → `30 + 15×2 = 60`. 높이는 **패딩 한 숫자로만** 조절한다.
  - ⚠️ **`<h3>`에 `margin: 0`이 반드시 필요하다.** `tailwind.config.js`가 `corePlugins:{preflight:false}`라 브라우저 UA 기본 `h3{margin-block:1em}`이 살아 있고, `fontSize:20`이면 **위아래 20px씩 40px의 유령 마진**이 붙어 같은 패딩에도 행이 76px로 부푼다. `flex items-center`는 flex 아이템의 마진을 흡수하지 않으므로 정렬로는 해결되지 않는다. 정본: `<h3 className="font-bold" style={{ fontSize: 20, margin: 0, lineHeight: 1.4 }}>`.
  - 같은 함정이 `<p>`·`<ul>`·`<h1~h6>` 전반에 적용된다 — 이 저장소에서 시맨틱 태그를 새로 쓸 때는 `margin: 0`을 기본 반사로 붙인다(아래 `sub` 캡션이 `margin:'2px 0 0'`을 명시한 이유).
  - 툴바 행은 `padding: '6px 18px'`로 더 촘촘하다(의도된 위계 — 타이틀이 더 여유 있게). 타이틀 행만 바꿀 때 툴바를 따라 올리지 않는다.
- **`sub` 캡션은 쓰지 않는다.** 화면 설명 문구는 제거 대상(사용자 결정). 단위 표기는 **`toolbarRight` 맨 앞에 12px caption** `단위: 원`으로.
- **푸터 골드 양식**(리스트형·매트릭스형 공통): `footerLeft` = `총 N개 중 M개 항목 표시 중` · `footerCenter` = `page.total>1`일 때만 페이저(`IconBtn chevron-left/right` + `PageBtn`) · `footerRight` = **`<FooterActions …/>` 하나**(`grid_frame.tsx` export).
  - **푸터 액션 4종은 항시 노출이며 순서가 고정이다(2026-09-17 사용자 결정): 전체보기(⛶) · 새 창(⧉) · 내보내기(⤓) · 인쇄(🖨).** 인쇄는 화면 전용 출력물이 있으면 `printItems` 로 `[🖨 │ ⌄]` combo 가 된다(아래 ✅ ②). 페이지가 직접 `IconBtn`을 나열하지 않는다 — `footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}` 한 줄.
  - `onToggleAll`을 안 넘기면 전체보기가 빠져 3개만 렌더된다 — **페이저가 없는 화면**(집계·매트릭스·master-detail 등 현재 10개)이 그 경우다. `onExport`를 안 넘기면 내보내기도 빠진다(투자기업정보(통합)·투자실적 현황(투자기업)).
  - ⛔ **kebab(⋯)은 전 화면에서 폐기됐다(2026-09-17).** 툴바 독립 kebab · 등록 combo의 `⌄` 절반 · 푸터 폴백 kebab(`!topMoreVisible && <MoreMenu>`) 셋 다 삭제했고, 그 안에 있던 내보내기·인쇄가 푸터 아이콘으로 항시 노출된다. `MoreMenu`/`MoreMenuItems`/`RegisterCombo`/`PoCMoreMenu` 로컬 복사본 39개와 `topMoreRef`/`topMoreVisible`/IntersectionObserver 폴백 배선(26파일)도 함께 제거됐다 — **다시 만들지 말 것.**
  - 툴바에 인쇄 `IconBtn`을 따로 두지 않는다(푸터와 중복 — investee_profile·investee_invest_stats에서 실제 2개가 됐다).
  - 단축키(⌥D 내보내기 · ⌘P 인쇄)는 그대로다 — 페이지의 `useHotkey` 소유이며 kebab 제거와 무관하다. 다만 힌트를 보여주던 `DropdownMenuShortcut`이 사라졌으므로 화면 힌트는 없다.
  - `PageBtn`은 골드(`asset_funding.tsx`·`subfund_manage.tsx`)에 **로컬 복사**돼 있는 헬퍼다 — 공유 export 아님, 골드에서 복사.
- ⛔ **카드뷰(리스트 뷰|카드뷰 토글)는 폐기됐다(2026-09-11 사용자 결정).** 신규 페이지에 뷰 토글 `SegTabs`·`view` state·카드 렌더 분기를 **만들지 않는다** — 리스트 뷰 단일 표현이다. 전용 스킬 `apfs-card-view`도 같은 날 삭제됐다.
  - 스키마 트랙은 `schema.hideCardView: true`로 끈다(`generic_list.tsx`가 푸터 `SegTabs`를 렌더하지 않고 `view`를 `"list"` 파생값으로 고정). 기존 카드 렌더 코드는 아직 남아 있으나 도달 불가다.
  - typed 트랙은 플래그 없이 직접 제거한다 — `subfund_manage.tsx`가 `SegTabs`를 지우고 `const view = 'list'` 상수로 내린 형태가 정본.
  - 표현 전용 플래그 4종은 서로 독립: `hideKpis`(헤더 KPI 슬롯) · `hideMetrics`(금액 개념 전체) · `hideCardView`(푸터 뷰 토글) · `hideRowSelection`(행 선택 체크박스 컬럼).
- **행 선택 체크박스 제거** — 다건 선택/선택삭제가 없는 조회 전용 화면은 `schema.hideRowSelection: true`(현행 예시 `schemas/전체_투자실적.ts`).
  ⚠️ 이 절이 오래 인용해 온 "2026-09-12 자펀드 공고 정보관리" 사례는 **2026-09-17 사용자 결정으로 뒤집혔다** — 그 화면은 체크박스를 되살리고 툴바에서 수정·삭제를 실행한다. 단건 CRUD라는 이유만으로 선택을 끄지 않는다는 뜻이고, 판별 기준은 [[apfs-aggrid]] "체크박스" 절(=선택이 액션을 만드는가)이다.
  선택은 **체크박스로만** on/off 한다 — 행 본문 클릭 선택은 전 페이지에서 해제됐다(2026-09-22 사용자 결정, 09-17 의 클릭 누적선택 규약을 뒤집음. 규약·역사는 → [[apfs-aggrid]] "체크박스" 절). `generic_list.tsx`가 `rowSelection` prop 자체를 `undefined`로 넘겨 **선택 컬럼이 생성되지 않는다**(체크만 푸는 게 아니다). 선택이 없어지면 툴바의 `삭제`/`선택 해제` 분기(`selCount > 0`)도 자동으로 도달 불가가 된다 — 수정은 행 더블클릭·Enter, 삭제는 우클릭 메뉴가 대체 경로다. ⚠️ `rowSelection` 객체는 **모듈 상수**여야 한다([[apfs-aggrid]] ⑦ — 인라인 리터럴은 렌더마다 컬럼 재생성 → 폭 되돌림).
- **툴바 칩의 '전체'는 `필터명: 전체`로 쓴다** (2026-09-24 사용자 규칙, 필터명 뒤 콜론 `:` + 공백). 예: `등급: 전체 21` · `심사단계: 전체` · `사용자 구분: 전체`. 칩 줄 앞에는 깔때기 아이콘만 있고 필터 이름이 보이지 않아서, 맨 `전체`만 있으면 무엇의 전체인지 알 수 없다.
  - 필터명은 그 화면 **상세필터 드로어 라벨**(`DrawerField label`)을 띄어쓰기까지 그대로 쓴다. 드로어에 없으면 목업 검색항목명이나 컬럼 헤더명을 쓴다. 이름을 새로 짓지 않는다.
  - **값이 `'전체'` 문자열 자체**인 칩(`schedule.tsx` 종류, `main_widgets.tsx` 펀드)은 값을 그대로 두고 **표시 라벨만** 분기한다: `{k === "전체" ? "종류: 전체" : k}`. 배열 값을 바꾸면 `=== "전체"` 비교가 조용히 깨진다.
  - 대상은 **툴바 `FilterChip`만**이다. 드로어 select의 `전체` 옵션은 위에 라벨이 있으므로 그대로 둔다. 적용 필터가 없을 때 보이는 `전체` 안내 문구, 그리고 '전체'가 "모두"가 아니라 도메인 값인 칩(`apfs_contribution_manage` 조회기준)도 대상이 아니다.
  - 가드 테스트: `src/dash/filter_chip_all_label.test.ts`. `>전체</FilterChip>`, `'전체'}</FilterChip>`, `['', '전체']` 패턴이 있으면 실패한다.
- **상태별 건수는 툴바 요약 문장이 아니라 필터 칩 안에.** `UI.FilterChip`의 `count` prop(라벨 뒤 11.5px 볼드 `tabular-nums`, **색은 칩 라벨과 동일 — 별도 `opacity`를 주지 않는다**)에 건수를 넘긴다 — 칩 = "이 상태를 몇 건 보게 되는지"를 누르기 전에 보여주는 곳이고, 툴바 우측 요약은 **총 건수 한 줄**(`기간 내 … N건`, `aria-live="polite"`)만 남긴다(2026-09-15 사용자 지시, `permission_history.tsx`·`audit_log.tsx`).
  - ⚠️ **건수는 facet count로 센다** — 그 칩이 거는 필터**만 빼고** 나머지 필터를 적용한 모집단 기준. 화면에 이미 있는 `visible`(전 필터 적용)로 세면 칩 하나를 누른 순간 나머지 칩이 전부 `0`이 돼 비교 기능이 죽는다. 별도 `facet` memo를 하나 더 둔다(`전체` 칩 = `facet.length`).
  - ⚠️ **건수를 `opacity`로 흐리게 하지 말 것** — 건수는 장식이 아니라 읽어야 하는 데이터고 11.5px는 WCAG "큰 텍스트"가 아니라 4.5:1이 필요하다. 실측(2026-09-15): `opacity .62` → 라이트 **2.58:1** · 다크 3.12~3.41:1 로 AA 미달. opacity를 지우면 라이트 4.96~5.60 · 다크 6.28~6.73 으로 통과한다. 위계는 **크기 차(12.5 → 11.5px)만으로** 낸다. 측정은 opacity를 배경과 합성한 실효색으로: 훅 없이 `getComputedStyle(span).opacity` 를 곱해 계산(→[[web-a11y]]).
- **첨부파일은 컬럼을 만들지 않고 제목 뒤 칩으로** — `ColumnSpec.attachFrom: '<필드키>'`(예: `title` 컬럼 + `attachFrom:'attachment'`). `schemas/renderers.tsx`의 `AttachChips`가 CSV 값(`"a.pdf, b.xlsx"`)을 확장자 칩(아이콘+색은 `ui/attachment.tsx`의 `glyphFor` SSOT, 라벨은 회색)으로 렌더하고 4개째부터 `+N`으로 접는다.

## master-detail 2단 레이아웃 (2026-09-15 `code_manage.tsx`에서 정립)
좌(master) 목록에서 고른 행이 우(detail) 그리드를 채우는 화면의 바깥 골격.

```tsx
<div className="grid grid-cols-1 gap-3 lg:grid-cols-[440px_minmax(0,1fr)]">
  <section aria-label="…목록" className="min-w-0">   {/* 구분선 없음 — 여백이 구분자 */}
  <section aria-label="…목록" className="min-w-0">
```
- **두 그리드 사이는 `gap-3`(12px).** 맞붙여 두면 우측 표가 좌측 표의 연장처럼 읽힌다. `gap-5`(20px)는 과하다는 사용자 판단 — 12px가 정본.
- **여백이 구분자다 → 선을 함께 두지 않는다.** 종전의 세로 구분선(`lg:border-r`)·적층 시 가로선(`border-t lg:border-t-0`)은 제거했다. 선+여백 이중 분리는 과하고, 각 패널이 이미 자체 `PaneBar`(하단 테두리)와 그리드 테두리로 경계를 가진다.
- **각 `<section>`에 `min-w-0` 필수** — 없으면 그리드 아이템 기본 `min-width:auto`가 내용 폭에 눌려 AG Grid 내부 가로 스크롤이 죽고 레이아웃이 비어져 나온다.
- 좁은 화면은 `grid-cols-1`로 세로 적층(→[[responsive-ui]]). `gap-3`이 가로·세로 양쪽에 걸리므로 적층 간격도 함께 해결된다.
- 좌 그리드의 **선택 규약(해제 불가 = 라디오)**과 선택 건수 오탐 함정은 → [[apfs-aggrid]].

## 필터 툴바 — 한 줄, 넘치는 만큼만 `+N` 메뉴 (2026-09-24 사용자 결정 — 전 화면 공통)
툴바는 **한 줄만** 쓴다. 둘째 줄·가로 스크롤은 폐기(같은 날 두 차례 시도 후 사용자가 교체).

```
[깔때기] [기본 필터 칩…] [적용 칩(값 ×)…] [전체 해제] [+N ▾] ········ [우측 액션]
```
- **넘치는 만큼만 뒤에서부터 `+N ▾` 드롭다운으로 접는다** — 앞쪽 칩은 그대로. 판정은 `applied_filters.tsx` 의 순수 함수 `planChips`(그리디, 넘치면 트리거 폭 예약 후 재계산) + 보이지 않는 측정용 사본(전 항목 + `+99`)의 폭. 측정이 보이는 배치와 무관해 진동 없음.
- **숨겨질 선택 칩은 첫 자리로 끌어올린다** — 메뉴에서 고른 칩이 active 가 되면 다음 렌더에서 slot 0 으로. 다중 선택(조기경보 등급)은 선택 칩이 하나라도 숨겨지면 **선택 칩 전부**를 원래 순서대로 앞에 모은다. **DOM 순서 자체를 바꾼다**(CSS `order` 금지 — 탭 순서 ≠ 보이는 순서, WCAG 2.4.3).
- 메뉴: 기본 칩(✓ 선택 표시 + 건수) · 구분선 · 적용 칩(값 + × = 해제) · `전체 해제`. 숨긴 항목 중 걸린 필터가 있으면 `+N` 을 primary 틴트로. 트리거는 plain `<button>`(UI.Button 은 asChild 트리거 불가), 메뉴는 Radix 포털. 닫힌 뒤 초점은 트리거로(없어졌으면 행의 마지막 칩으로) — Radix 자동 복귀는 필터 변경 재렌더로 body 에 떨어졌다(실측).
- **페이지는 데이터만 넘긴다**: `filterChips={X.map((v) => ({ key, label, count, active, onSelect }))}` + `appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}`. 페이지가 `<FilterChip>`·깔때기·적용 칩 마크업을 그리지 않는다 — 가드 `applied_filters.test.ts`(GridFrame/RiskPage 소비 파일의 `<FilterChip`·`<Icon name="filter"`·'필터 제거'·`AppliedChip`/`FilterPill` 사본 금지). `toolbarLeft` 는 칩이 아닌 내용(캡션 등)만.
- 행 선택 중(선택 액션 바가 좌측 차지): 깔때기를 빼고 칩은 전부 `+N` 안으로 접는다 — 페이지가 `selCount>0 ? null` 로 칩을 끌 필요 없음.
- 우측 액션 `shrink-0` 고정. ≤640px 만 좌측 `basis-full` 로 좌/우 두 줄 적층(칩 행 폭 = 남은 폭이라 판정이 자동으로 맞는다).
- 보이는 캡션 없음(`role="group" aria-label="필터"`). 적용 칩 = 값만·240px 말줄임·title/aria 에 항목명. 해제 가능 ≥2 이면 `전체 해제`.
- ⚠️ **`전체 해제` = 칩별 `onClear` 를 한 이벤트에서 연달아 호출** → 클로저의 객체 state 를 복사해 지우는 onClear 는 마지막만 남는다. 반드시 함수형 업데이트. 실제 사례: `generic_list.removeFilter`.
- 칩 행 컨테이너는 `overflow:hidden` 이라 세로 3px 패딩+음수 마진으로 focus 링 여유를 둔다.

## 관리형 리스트 툴바·타이틀 규약 (2026-09-11 subfund_manage에서 정립)
리스트형(CRUD) 페이지 한정. 매트릭스/집계형은 위 골든(`headerActions` primary 내보내기)을 그대로 둔다.

- 🔀 **툴바 형태는 하나다(2026-09-17 사용자 결정 — combo 폐기, 단 2026-09-24 허용 예외 2종은 아래 ✅).** 1차 액션(등록)이 있으면 **단독 outline 버튼**, 없으면 아무것도 두지 않는다. 보조 액션(내보내기·인쇄)은 툴바가 아니라 **푸터 `FooterActions`**가 항시 노출한다.
  ```
  등록 O:  단위: 원 │ ▣ 상세필터 │ ＋ <도메인 액션명> 등록 │ ⟳ 새로고침
  등록 X:  단위: 원 │ ▣ 상세필터 │ ⟳ 새로고침
  ```
  - 등록 버튼 = `<Button variant="outline" size="sm" leadingIcon="plus" onClick={…}>{라벨}</Button>`. 라벨은 도메인 액션명 그대로(`제안서접수 등록`·`공고 등록`), "등록"으로 줄이지 않는다. 스키마 트랙은 `editable = schema.fields.length > 0` 으로 자동 분기(`generic_list.tsx`).
  - ⛔ **폐기된 형태 2종 — 되돌리지 말 것**: ① `RegisterCombo`(등록+`⌄` split 버튼, 2026-09-11~09-17) ② 툴바 kebab 단독. 둘 다 보조 액션을 숨기는 구조였고, 그 항목이 이제 푸터에 상시 노출된다.
  - ✅ **허용되는 combo = 공용 `SplitButton`(`ui/split-button.tsx`) 2가지뿐 (2026-09-24 사용자 결정, 등록원부관리).** 위 폐기는 "보조 액션(내보내기·인쇄)을 `⌄` 안에 숨기는" combo 에 대한 것이다 — 아래 둘은 보조 액션을 숨기지 않으므로 허용:
    ① **툴바 — 같은 1차 액션의 대체 경로 묶음**: `[+ 등록원부입력 │ ⌄ 등록원부업로드]`(본체 = 가장 잦은 경로 1클릭, `⌄` = 일괄 업로드 등). 서로 다른 성격의 액션(등록+내보내기 등)을 섞지 않는다. 등록+업로드 조합은 `trust_upload_forms.tsx` `RegisterCombo`(= SplitButton 래퍼, [[apfs-manage-page]] 파일 업로드 행)도 같은 부품이다.
    ② **푸터 인쇄 combo — 화면 전용 출력물**: `FooterActions`/`RiskPage` 에 `printItems` 를 넘기면 인쇄 아이콘이 `[🖨 │ ⌄]`(`SplitButton iconOnly`)가 된다. 본체 = 화면 인쇄(⌘P), `⌄` = 원문 목록바 `[출력▾]` 항목(등록원부 출력·발급이력 출력). **툴바에 별도 `[출력▾]` 을 두지 않는다.**
    - 새 combo 를 페이지에서 손으로 만들지 말 것 — 아래 함정 4건을 `SplitButton` 이 이미 피한다(가운데 구분선은 inline box-shadow 가 아닌 border, 래퍼 `overflow-hidden` 없음 → focus 링 보존 — 2026-09-24 두 번 다시 밟아 실측 확인).
  - 복원이 필요해질 때만 참조할 combo 구현 함정 4건(모두 실제로 밟았던 버그): `topMoreRef`는 실제 렌더되는 쪽이 들어야 함 · `UI.Button`으로 split을 만들 수 없음([[ui-button-not-radix-aschild-trigger]]) · 컨테이너 `overflow-hidden` 금지(focus 링 잘림) · 트리거에 `.apfs-menu-trigger` 금지([[global-focus-overhaul-exception-surfaces]]).
- **내보내기 진입점은 푸터 아이콘 + ⌥D 두 곳.** 툴바에 독립 "엑셀" 버튼을 두지 않는다(종전 규약 유지 — 그 자리는 이제 kebab이 아니라 푸터다).
- **타이틀은 메뉴 리프와 일치.** `cardTitle`·`title`·`crumbs` 리프를 **`data.ts` 메뉴 리프 라벨 문자열 그대로**(띄어쓰기 포함) 맞춘다. `cardTitle`이 `title`과 같으면 생략 가능(H1=`cardTitle ?? title`). **"○○ 목록" 같은 임의 축약 금지**(2026-09-11 "자펀드 목록"→"자펀드 관리" 정정). 매트릭스/집계형이 문서 정식명칭을 카드 제목으로 쓰는 것(asset_funding "…현황표")은 예외.

## 선택 액션 플로팅 바 (2026-09-15 사용자 지시, `contextActions` 슬롯 — 전 페이지 공통)

긴 목록을 스크롤하면 상단 툴바가 화면 밖으로 나가 **선택한 행에 쓸 액션(수정·삭제·선택 해제·단계 전이)에 닿을 수 없다.** 그래서 GridFrame 이 그 묶음을 툴바 좌측 ↔ 떠 있는 바 사이로 옮긴다.

### 소비처 계약 — 이것만 지키면 된다
```tsx
const selActions = selected ? (            // 또는 selCount > 0 ?
  <>
    <StatusBadge … />
    <Button …>수정</Button><Button …>삭제</Button>
    <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
  </>
) : null;

<GridFrame
  toolbarLeft={selected ? null : (<>필터칩…</>)}   // ← 선택 시 **비운다**
  contextActions={selActions}
  … />
```
- **`toolbarLeft` 와 `contextActions` 에 같은 노드를 동시에 넘기지 않는다.** 두 곳에 렌더하면 화면 밖 원본이 탭 순서에 남아 키보드 초점이 **보이지 않는 버튼으로 뛴다**(Codex P2). GridFrame 은 둘 중 **한 곳에만** 렌더한다 — 복제가 아니라 이동이다. 검증: `수정` 버튼이 DOM 전체에 항상 **1개**.
- `contextActions` 를 넘기지 않는 페이지는 동작이 전혀 바뀌지 않는다(IntersectionObserver 도 안 걸린다).
- **되돌리기 레버**: `grid_frame.tsx` 의 `const FLOATING_ACTIONS = true` → `false` 한 줄로 전 화면 무효.
- 적용 완료(2026-09-15): `menu_manage` · `user_manage` · `subfund_manage` · `program_manage` · `user_permission_manage` · `user_invite_manage` · `investment_review_manage` · `generic_list`(스키마 주도 전 페이지) · ~~`asset_funding`~~(2026-09-17 선택 제거로 이탈).
  `code_manage` 는 대상 아님 — 좌 그리드가 "우측 패널의 데이터 소스"라 해제 개념이 없고 툴바가 무조건 렌더다.
  ⚠️ `asset_funding` 은 배선해도 처음엔 **도달 불가**였다 — `rowSelection={{mode:'multiRow', checkboxes:false}}` 에
  `enableClickSelection`(AG Grid 기본 **false**)이 빠져 체크박스도 행 클릭도 선택을 만들지 못했다(주석엔
  "행 클릭으로 선택 유지"로 적혀 있던 선행 버그). 2026-09-15 사용자 결정으로 그 옵션을 켰고, 같이 `rowSelection` 을
  **모듈 상수로 호이스팅**했다 — 선택이 살아나면 선택마다 리렌더가 나므로 인라인 리터럴은 컬럼 폭을 되돌린다
  (→[[apfs-aggrid]] ⑦). **교훈: `checkboxes:false` 로 체크박스 열을 지울 때 `enableClickSelection:true` 를 같이
  켜지 않으면 선택 수단이 0이 된다** — "행 클릭으로 선택"은 기본 동작이 아니다.
  ⚠️ 이 교훈은 2026-09-22 부터 **역사로만 유효**하다 — 행 본문 클릭 선택이 전 페이지에서 해제돼 `checkboxes:false`+선택 구성 자체가 없어졌다(선택이 필요하면 체크박스, 아니면 `rowSelection` 제거. →[[apfs-aggrid]]).
  **후일담(2026-09-17)**: `asset_funding` 은 결국 선택을 통째로 걷어냈다(체크박스 없는 화면의 선택 툴바는 군더더기 —
  사용자 판정). 이 화면은 더 이상 `contextActions` 소비처가 아니다.

### 값 쌍 일괄 변경 = 콤보 버튼 `ConfirmCombo` (2026-09-24 사용자 결정 — 정기보고·조합원총회)
선택 바에서 체크한 행의 **상태값을 두 값 중 하나로 일괄 지정**하는 액션(확정/미확정 등)은 버튼 2개를 따로 두지 않고
**붙은 세그먼트 콤보 `[확정|미확정]`** 한 묶음으로 둔다 — 공용 `src/dash/confirm_combo.tsx`(`ConfirmCombo` + `uniformConfirm`).
- **활성 세그먼트 = 선택 행의 현재 값**(primary 채움 + ✓). 전부 같은 값이면 그 값, **섞였거나 빈값('')·null 이 끼면 둘 다 비활성**.
  ✗ 종전 `확정=primary` 고정 / `미확정=outline` 고정은 "지금 상태"처럼 읽혀 오인을 부른다(사용자 지적 — 미확정 행을 골라도 확정이 켜져 보였다).
- 클릭 = **"이 값으로 변경" 액션**(토글 아님). 활성 세그먼트를 다시 눌러도 같은 값을 재적용하고, 게이트·toast 는 호출부 `bulk*` 가 그대로 맡는다.
- 활성값은 **파생**한다 — `useMemo(() => uniformConfirm(rows.filter(r => selIds.includes(r.id)).map(r => r.<필드>)), [rows, selIds])`. 별도 state 금지(→[[apfs-aggrid]] "선택 상태는 selIds 하나로").
- 필드가 둘이면 콤보도 둘, 앞에 짧은 라벨: `<ConfirmCombo label="일정" …/> <ConfirmCombo label="결과" …/>`(조합원총회). 라벨은 그룹 `aria-label`(`일정 확정여부`)에도 쓰인다.
- 접근성: 그룹 `role="group"`, 세그먼트 `aria-pressed` 가 현재 값을 알린다.
- 구현 함정(이미 컴포넌트가 피한다 — 손으로 다시 만들지 말 것): 세그먼트 구분선은 **inline `borderLeft`**(`border-0`+`border-l` 유틸 겹치면 CSS 순서로 무음 소실), 래퍼 `overflow-hidden` 금지(focus 링 잘림), `UI.Button` 으로 조립 금지(세그먼트 모양 불가).
- 확정/미확정 외의 두 값 쌍(사용/미사용 등)이 생기면 `ConfirmCombo` 에 옵션을 받도록 넓힌다 — 페이지별 사본 금지.
- 적용: `regular_report_manage` · `general_meeting_manage`. ⚠ **단계 전이(심사단계·승인상태)는 이 패턴이 아니다** — 행 단계에 따라 버튼이 사라지는 [[apfs-stage-workflow]](`investment_review`·`subfund_manage`)를 따른다. 기준: 두 값을 **아무 방향으로나 자유롭게** 오갈 수 있으면 콤보, 순서가 있는 전이면 stage-workflow.

### 프레임 쪽 구현 계약 (건드릴 때 반드시 읽을 것)
- **body Portal 필수.** GridFrame 루트에 `animation: dashFade … both` 가 걸려 있어 종료 상태가 항등행렬로 굳고, 그 transform 이 (a) 새 쌓임맥락 (b) `fixed` 의 컨테이닝블록을 만든다. 포털 없이 `fixed` 를 쓰면 좌표가 뷰포트가 아니라 **카드 기준**이 되고 z 도 갇힌다(→[[z-index]] 규칙 3·5의 문서화된 버그와 동일 원인).
- **z = 55 (raw 정수, 토큰 아님).** 오버레이가 아니라 셸 chrome 계층(≤60) 소속 — sticky 푸터(20) 위, FAB(60) 아래, 모달(80)이 항상 덮는다.
- **좌표는 전부 실측, 하드코딩 0.** CSS 변수(`--fab-left`/`--fab-top`)로 넘긴다 — inline `left` 로 주면 미디어쿼리를 inline 이 덮는다.
  - `left` = **체크박스 열 왼쪽 경계**. `[col-id="ag-Grid-SelectionColumn"]` → 첫 `.ag-header-cell` → 프레임+18 3단 폴백. `--fab-left` 는 바의 **왼쪽 엣지**이므로 CSS 에 `translateX(-50%)` 를 두지 않는다(하나만 바꾸면 바가 폭의 절반만큼 밀린다).
  - `top` = **선택된 행 바로 위**(`.ag-row-selected` 실측 − 바높이 − 8). 상단 clamp = 그리드 헤더 실측 하단+8, 하단 clamp = 뷰포트 하단−바높이−12 → 선택 행이 화면 밖이어도 조작 가능.
  - 그리드 헤더 위치는 `top:58` 에 닿기 전까지 변하므로 **실측**한다. `gnb + 헤더높이` 고정값은 스크롤 도중 아직 보이는 헤더를 덮는다(Codex P2).
- **표시/숨김은 이력(hysteresis) — 기준선이 둘이다.** 액션 호스트 안의 1px absolute 센티넬 2개(`top:0`, `top:50%`)를 IO(`rootMargin: -GNB높이`)로 본다.
  - **표시 = 중앙(50%) 센티넬이 가려질 때.** 하단 기준이면 그 전에 "절반 이상 가려졌는데 바는 없는" 구간이 남는다.
  - **숨김 = 상단 센티넬이 드러날 때.** 하단 기준으로 숨기면 올라올 때 바는 사라졌는데 버튼은 아직 GNB 뒤인 **조작 불가 구간**이 생긴다(Codex P2).
  - 센티넬을 쓰는 이유: 툴바 전체를 보면 좁은 폭 2줄 감김에서 액션 줄만 숨어도 안 뜨고, 액션 호스트를 직접 보면 액션이 빠진 뒤 높이가 0으로 붕괴해 안 닫힌다. absolute 라 flex·gap·툴바 높이(48px)에 영향 0.
- **초점 이월**: 이동으로 언마운트되는 버튼의 순번을 IO 콜백(**리렌더 전**이라 `activeElement` 가 아직 이동 전 버튼)에 적어 두고 `useLayoutEffect` 에서 같은 순번으로 복귀. `focus({preventScroll:true})` 필수 — 없으면 브라우저가 초점 요소를 보이게 스크롤해 사용자 스크롤과 싸운다.
- ⚠️ **선택 변경 감지 = 의존성 배열 없는 `useLayoutEffect`(매 렌더 재측정) + 값 비교 가드.** `contextActions` 는 렌더마다 새 ReactNode 라 의존성으로 쓸 수 없다. 가드 없이 매 렌더 `setState({…})` 하면 **무한 루프**(→[[aggrid-onpaginationchanged-render-loop]] 와 동형) — `prev` 를 그대로 돌려 React 가 렌더를 건너뛰게 한다.
- 프레임 위치 추적은 `ResizeObserver(root **+ 부모**)` + `window resize` + (바 표시 중) rAF 스크롤. 부모까지 봐야 하는 이유: 1280 캡 상태에서 LNB 를 접으면 **폭은 그대로인데 left 만 이동**해 root 관찰만으로는 안 울린다.

### 검증 (브라우저 실측 필수 — 빌드 green 은 무의미)
- 임계: 스크롤 y 를 10px 간격으로 **양방향** 훑어 "바가 있거나 버튼 절반 이상이 보인다" 불변식 위반 0건.
- 탭스톱 1벌(`수정` 버튼 수 = 1) · 바 버튼 Enter 로 모달 개폐 · 초점 양방향 이월 · 왕복 2회 고착/깜빡임 없음.
- `leftDelta = 바 left − 선택열 left = 0` · `border-radius: 12px` · LNB 접기/펼치기 추적 · 라이트/다크.
- ⚠️ **콘텐츠가 창보다 짧으면 바가 뜰 수 없다** — 검증 실패로 오진하기 쉽다. 먼저 `document.scrollingElement.scrollHeight > innerHeight` 를 확인하고(메뉴관리는 "전체 펼치기"로 행을 늘린다), 페이지 스크롤러는 `window` 다(조상 전부 `overflow: visible`).

## 검토필요 마커 — 폐기 (2026-09-24)
2026-09-24: 검토필요 마커(ReviewMarker·note 필드·*_NOTE)는 전부 삭제됐다. 목업의 `.review`/`.rpop` 은 이식하지 않는다(2026-09-12 '이식' 규약 폐기).

## 검증
`npm run build`(exit 0) + `npm test`(스키마 zod) + 브라우저 라이트/다크·1280/768/400 시각 확인(responsive-ui 프로토콜) + 기존 페이지(generic_list 등) 무변경 회귀.
- 프레임: `getComputedStyle(section).backgroundColor === 페이지 배경` · `borderTopWidth==='0px'` · `boxShadow==='none'`(라이트/다크 둘 다).

## 참조
- UI/디자인 시스템 전반: [[dashboard-ui]]
- 반응형 체크리스트·검증: [[responsive-ui]]
- 출처→매트릭스 escalate 경로: [[apfs-capture-schema]]
