---
name: apfs-multi-grid
description: APFS "여러 표 세로 쌓기"(멀티 그리드) 조회 화면 규약 — 한 GridFrame 안에 표 2장 이상을 섹션 제목으로 나눠 쌓는 레이아웃(기준 화면 예외사항레포트). 공용 골격 TablesPage(설정만 작성) + 공용 SectionHead(번호 칩·건수 없음, padding 16px 18px 12px 4px). 신규 페이지를 기본 레이아웃(단일 그리드 GridFrame/GenericListPage)이 아닌 여러 표 레이아웃으로 만들 때, 표 여러 개·섹션 제목·섹션 헤더·SectionHead·TablesPage 작업 시 사용. Use when creating or editing a read-only page that stacks multiple grids under section titles in one GridFrame.
---

# apfs-multi-grid Skill

## 언제 쓰나 — 레이아웃 2택
| 레이아웃 | 언제 | 진입점 | 스킬 |
|---|---|---|---|
| **기본(단일 그리드)** | 표 1장 · CRUD · 페이지네이션 · 행 선택 | `GridFrame` / 스키마 `GenericListPage` | `apfs-grid`, `apfs-capture-schema` |
| **여러 표 세로 쌓기** | 조회 전용 · 한 검색조건으로 표 2~N장 · 표마다 원문 섹션 제목 | `TablesPage` + `TablesPageConfig` | **이 스킬** |

바깥 프레임(PageHeader·툴바·푸터)은 `apfs-grid` 가 SSOT다. 이 스킬은 **그 안에 표를 여러 장 쌓는 규약**만 다룬다.

- 기준 화면: **예외사항레포트** (route `예외사항리포트`, 설정 `src/dash/risk_table_pages.tsx` `EXCEPTION`, 표 `risk_valuation_data.ts` `EXC_TABLES`)
- 골격: `src/dash/risk_tables_page.tsx` (`TablesPage`, `TablesPageConfig`, `FilterDef`)
- 섹션 헤더: `src/dash/risk_grid.tsx` `SectionHead` (공용 **하나뿐** — 페이지 로컬 복사 금지)
- 표 본체: `risk_grid.tsx` `ReadGrid` + `risk_table_meta.ts` `TableMeta`/`ColMeta`
- 가드 테스트: `src/dash/section_head_rule.test.ts`

## 섹션 헤더 규약 (2026-09-24 사용자 결정)
```
┌ border-top ─────────────────────────────────────────┐
│ ␣␣␣␣평가방법론이 변경된 내역      (설명 캡션·선택)   [actions] │  ← padding 16px 18px 12px 4px
├─ AG Grid border-top = 그리드 상단 라인 ──────────────┤
│ ReadGrid (AG Grid)                                   │
```
- **번호 칩(블릿) 없음** — `SectionHead` 에 `n` prop 자체가 없다. ①②③ 같은 번호를 제목 문자열에 넣지도 않는다.
- **건수 없음** — `cap={<>총 N건</>}` 금지. 건수는 **푸터(`footerLeft`)에만** 둔다(TablesPage 가 자동으로 `표제목 N건 · …`).
- **그리드 상단 라인** — 제목이 아니라 **바로 뒤 AG Grid** 에 긋는다: `aggrid_shared.css` 의 `.apfs-section-head + * .ag-root-wrapper { border-top }`. 제목에 `border-bottom` 을 주면 차트·카드 섹션(운용사 유형별 지표)에도 선이 생긴다 — 금지. 그래서 섹션 헤더 **바로 다음 형제** 안에 그리드를 둬야 선이 붙는다.
- padding `16px 18px 12px 4px` 고정(공용 컴포넌트가 소유 — 호출부에서 덮어쓰지 않는다).
- `cap` 은 **설명 문구만** 허용(예: `기준년월 2025-12`, `운용사 장부 ↔ 수탁기관 보관내역 대사`, `미투자자산·기타자산·기타부채는 셀을 눌러 입력`).
- `actions` 슬롯 = 섹션 우측 버튼(예: 조기경보 결과정보 관리 `전체권한부여`).
- 제목은 `h4.m-0` — preflight:false 라 UA 마진이 살아 있다(메모리 `preflight-off-ua-margin-trap`).

## 신규 페이지 생성 절차 (TablesPage)
1. **표 정의** — 데이터 파일(`*_data.ts`)에 표마다 `TableMeta` 를 만든다. `title` = 원문 섹션 제목(필수 — 2장 이상이면 섹션 헤더가 된다), `cols: ColMeta[]`(`kind`: text·center·date·amount·number·badge, 2단 헤더는 연속 컬럼에 같은 `group`), `rows`, 합계가 있으면 `totalLabel` + 컬럼 `total`, 0행 문구는 `empty`.
2. **설정 작성** — 설정 파일에 `TablesPageConfig`:
   ```ts
   const MY_PAGE: TablesPageConfig = {
     group: '가치평가', label: '<메뉴 라벨>', route: '<메뉴 path>',
     tables: [T1, T2, T3],        // 표 순서 = 화면 순서
     unit: true,                  // 금액 단위 토글(원/백만원/억원) — amount 컬럼이 있으면
     filters: [{ label: '평가년월', kind: 'month', def: BASE_YM, key: 'ym' }],
   };
   export function MyPage({ onNav }: P) { return <TablesPage cfg={MY_PAGE} onNav={onNav} />; }
   ```
   - `filters[].key` 가 있으면 **그 키를 가진 표의 행만** 거른다. 키가 없거나 어떤 표에도 없으면 `· 데이터 연동 후 적용`(무신호 무효 필터 금지).
3. **라우트 배선** — `app.tsx` 에 import + `else if (route === "<path>") page = <MyPage onNav={onNav} />;`. route 는 `data.ts` MENU 리프의 `path`(없으면 label). 메뉴 리프는 임의 추가 금지(정본=메뉴구성도 시트).
4. **표가 1장뿐이면** 이 스킬이 아니다 — 섹션 헤더 없이 표만 그려진다(기본 레이아웃 쪽이 맞는지 먼저 판단).

엑셀은 TablesPage 가 **표 N장 → 시트 N장**으로 자동 처리한다(`risk_excel.ts`, 화면 단위·필터 결과 그대로).

## TablesPage 로 못 담는 화면
표 사이에 차트·도넛·입력 셀·섹션 버튼이 끼는 화면은 `RiskPage`(또는 `GridFrame`)를 직접 쓰고 **공용 `SectionHead` 만 import** 한다 — 예: `subfund_grade_trend.tsx`(표+도넛), `gp_type_indicator_trend.tsx`(차트), `mother_fund_valuation.tsx`(입력 셀), `ew_result_manage.tsx`(섹션 actions), `custody_verify_manage.tsx`. 섹션 헤더 규약은 동일하다.

## 검증
1. `npx vitest run src/dash/section_head_rule.test.ts` — 로컬 SectionHead·`n=`·`총 N건` 캡션·padding 가드.
2. `npx vitest run` + `npx vite build` (tsc 는 기존 에러로 red — 게이트 아님).
3. 브라우저(ego-browser): 라이트/다크 + 400px 폭 — 섹션 제목이 표 위에 붙고 가로 넘침이 없는지(`responsive-ui`).
