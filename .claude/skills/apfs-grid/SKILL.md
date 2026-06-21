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
  headerActions?: ReactNode; // PageHeader 우측 액션 — 내보내기 등 주 액션은 여기 한 곳에만(중복 금지)
  cardTitle?: string;        // 카드헤더 타이틀 (미지정 시 title 재사용)
  kpis?: ReactNode;          // 카드헤더 우측 KPI 배지군 (KpiBadge 나열)
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

## 리스트 vs 매트릭스 — 어떤 children인가
- **리스트**(항목 CRUD): 단일 헤더 + 체크박스 + 행 액션. 툴바=필터칩/선택, 푸터=건수+페이지네이션+뷰토글. 스키마 주도면 `generic_list.tsx`/PageSchema 트랙.
- **매트릭스/집계**(조회전용): 2단 중첩헤더(`colSpan`/`rowSpan`)+합계행. 체크박스·CRUD·페이지네이션 없음. 툴바=컨텍스트 설명+새로고침, 푸터=건수. 캡처가 중첩헤더면 `apfs-capture-schema` SOP가 이쪽으로 escalate한다.

## 사용 예 (asset_funding 실증)
```tsx
<GridFrame
  crumbs={['홈','투자자산관리','모태펀드관리','모태펀드 조성 및 출자현황']}
  title="모태펀드 조성 및 출자현황"
  sub="… 단위: 금액 억원(추정) / 조합수 개"
  cardTitle="모태펀드 조성·출자 현황표"
  headerActions={<><Button variant="outline" leadingIcon="chevron-left" onClick={()=>onNav('main')}>메인으로</Button><Button variant="primary" leadingIcon="download">내보내기</Button></>}
  kpis={<><KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(t)) + ' 억원'} /> …</>}
  toolbarLeft={<><Icon name="file" size={16} /><span>… 집계</span></>}
  toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} />}
  footerLeft={<span>{'2010 ~ 2025년 · 총 ' + mn('16') + '개 연도'}</span>}>
  <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[880px]">…</table></div>
</GridFrame>
```

## 검증
`npm run build`(exit 0) + `npm test`(스키마 zod) + 브라우저 라이트/다크·1280/768/400 시각 확인(responsive-ui 프로토콜) + 기존 페이지(generic_list 등) 무변경 회귀.

## 참조
- UI/디자인 시스템 전반: [[dashboard-ui]]
- 반응형 체크리스트·검증: [[responsive-ui]]
- 캡처→매트릭스 escalate 경로: [[apfs-capture-schema]]
