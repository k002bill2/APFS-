/* 조기경보 관리 — 관리형 리스트 페이지 (조기경보 > 조기경보 > 조기경보 관리, route `risk-manage`).
   출처: S2_51_조기경보_조회.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.
   골드 레퍼런스: `regular_report_manage.tsx`(월 범위 PeriodPicker · 합계행/행선택 없음 · 드로어+적용칩).

   구성(목업 → 우리 규약):
   - 검색박스(운용사·자펀드·기간(시작~종료)·등급 멀티셀렉트)
       → **툴바 좌 = `전체` + 등급 3칩** + 상세필터 드로어(Sheet). 드로어 항목은
         목업 검색박스 순서 그대로(운용사·자펀드·**기간**) — 목업도 `<label for="f-from">기간</label>` 한 줄이라
         시작~종료 두 컨트롤을 `~`로 묶은 **1항목**이다. 검색어는 OFF(목업에 없음).
         목업의 [조회] 버튼은 즉시 반영형이라 페이지엔 만들지 않는다(골드 동일 판단).
       ⚠ **등급 3칩은 단일선택이 아니라 다중 토글이다.** 목업이 체크박스 멀티셀렉트(`gradeSel`)이고
         초기값이 3개 전부 ON, **전부 끄면 0행**이 정상 동작이라 그 semantics를 보존한다.
         **"비어 있으면 전체" 폴백은 두지 않는다**(목업 "선택 안함"=0행).
         칩 행 외관·체감은 감사로그 툴바(`audit_log.tsx:191-204`)를 정본으로 맞췄다(2026-09-21 사용자 지시):
         **맨 앞 `전체` 칩** + 색점(`dot`) 없음. `전체` 칩이 **0행에서 빠져나갈 복구 경로를 겸한다**
         (종전 맨텍스트 `전체 선택` 버튼은 제거).
         ⚠ `전체` count를 상수로 박지 않는다 — 운용사·자펀드 필터가 걸리면 facet이 줄므로 **합으로 파생**해야
           "전체 = 각 칩의 합" 불변식이 유지된다.
       ⚠ **참조(단일선택)와의 절충 — 무엇을 따르고 무엇을 남겼나**(2026-09-21 사용자 결정):
         · 따른 것 = **표시**: `전체`가 활성이면 등급 3칩은 **비활성으로 보인다**(`active={!allGradesOn && grades[g]}`).
           참조처럼 "활성 칩은 항상 하나처럼" 읽히게 한다. 상태 `grades`는 3개 다 true 그대로다(표시만 분리).
         · 따른 것 = **첫 클릭 체감**: `전체` 활성 상태에서 등급을 누르면 **그 등급만** 선택된다
           (참조의 "차단 클릭 → 차단만"). 단순 토글로 두면 *누른 칩이 꺼지고 안 누른 둘이 켜지는* 역설이 생긴다.
         · 남긴 것 = **다중 선택**: 그 외 상태에서는 단순 토글이라 `주의`+`경고` 동시 조회가 된다.
           목업 `gradeSel`의 멀티셀렉트 능력을 버리지 않기 위함이며, 순수 단일선택으로 바꾸지 않는다.
         필터 대상은 목업대로 **`fng`(자펀드 등급)** 이다 — `gpg`가 아니다.
   - ⚠ **기준년월은 행 필터가 아니라 조회 기준 컨텍스트**다. 목업 `render()`는 `gp`·`fn`·`gradeSel[r.fng]`만
       행을 거르고 기간은 `viewlbl` 캡션(`'· '+from+' ~ '+to`)에만 쓴다. 더미가 전부 `2026-07`이라
       행 필터로 배선하면 월을 바꾸는 순간 그리드가 통째로 빈다 → `passes`에 넣지 않는다.
       선례 `custody_confirm_manage.tsx`(기준일자)와 동일 판단이고, 같은 선례를 따라 **빈 값을 허용하지 않는다**
       (PeriodPicker 재클릭 해제 시 목업 기본값 `2026-07`로 복귀).
       표시 위치는 **툴바 우측 캡션 → 칩 행 인라인 적용칩**으로 옮겼다(2026-09-21 사용자 지시).
       값이 늘 있으므로 **기본값(`2026-07 ~ 2026-07`)과 다를 때만** 칩을 띄우고, ×는 '제거'가 아니라
       **기본값 복귀**다(행을 거르지 않으므로 aria-label도 `기준년월 기본값으로`라고 사실대로 말한다).
   - 목록 그리드 → AG Grid **단일 헤더 7컬럼**(목업 `render()` head 그대로).
       합계행 없음(가산 가능한 금액 컬럼이 없다) · 2단 그룹헤더 없음 · **행 선택 없음**(읽기전용 모니터링
       화면이라 선택이 만들 액션이 0 — apfs-aggrid "조회 전용 화면은 rowSelection 자체를 두지 않는다").
       → selbar·신규 등록·편집/삭제 모달·명세 팝업·`onRowDoubleClicked`·카드뷰 토글도 없다.
   - 종합등급 셀 → `StatusBadge size="lg" dot={false}`. 톤은 목업 `GRADE_TAG` 매핑 그대로
       정상→success · 주의→warning · 경고→danger.
   - 목업 [차트] 버튼 → 툴바 우측 `차트` 버튼 → `EarlyWarningTrendModal`(S2_52 시계열 차트 팝업).
   - 목업 [엑셀]/[출력] 버튼 → 툴바에 두지 않는다. 엑셀은 푸터 `FooterActions` 내보내기 + `⌥D`,
       출력은 푸터 인쇄 아이콘(`window.print()`)이 흡수한다(apfs-grid 푸터 골드 양식, kebab 폐기).
   - KPI 배지 행 → **미포함**(사용자 결정) → `kpis` prop을 아예 넘기지 않는다.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정(결정 기록)
   - 더미 21행: 목업 DATA 4행(유니·한투)은 **값까지 그대로** 옮기고, 페이저·건수가 의미를 갖도록
     저장소에 이미 쓰는 이름으로 17행을 더했다(운용사 = `risk_manage.tsx`의 조기경보 GP 로스터,
     자펀드 = `custody_confirm_manage.tsx`·`fund_cash_forecast_manage.tsx`의 조합명).
     ⚠ 운용사↔자펀드 짝은 **이 화면의 데모 조합**이다 — 저장소 어디에도 정본 매핑이 없다(파일마다 다른 짝을 쓴다).
   - `gpg`(운용사 종합등급)는 운용사 단위 등급이므로 **같은 운용사면 항상 같은 값**으로 맞췄다(행마다 다르면 데이터 모순).
   - `ym`은 전 행 `2026-07` 고정(목업 동일) — 기준년월이 조회 기준 컨텍스트라는 위 결정과 짝이다.
   - `no`는 **행에 고정된 값**이다. 목업 `render()`는 필터 후 1부터 다시 매기지만, 정렬 가능한 그리드에서
     연번을 재계산하면 정렬과 싸운다(골드 `regular_report_manage`와 동일 결정).
   - 운용사·자펀드 셀은 목업에서도 링크가 아니다(명세 팝업 opt-in 미요청 — apfs-spec-popup). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { EarlyWarningTrendModal } from './early_warning_trend_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 — 등급 도메인은 목업 `GRADES` 3값
────────────────────────────── */
export type EarlyWarningGrade = '정상' | '주의' | '경고';
const GRADES: EarlyWarningGrade[] = ['정상', '주의', '경고'];

/* 목업 `GRADE_TAG`(g/amber/d) → 우리 톤. 배지 글자는 StatusBadge가 -text 토큰을 쓴다(color-tokens). */
const GRADE_TONE: Record<EarlyWarningGrade, Tone> = { 정상: 'success', 주의: 'warning', 경고: 'danger' };

export interface EarlyWarningRow {
  id: string; no: number;
  mf: string;                 // 모펀드
  ym: string;                 // 기준년월 'YYYY-MM'
  gp: string;                 // 운용사
  gpg: EarlyWarningGrade;     // 종합등급(운용사) — 운용사 단위라 같은 운용사면 동일 값
  fn: string;                 // 자펀드
  fng: EarlyWarningGrade;     // 종합등급(자펀드) — 등급 칩이 거르는 대상
}

/* 목업 검색박스 기본값 `2026-07 ~ 2026-07`(= 조회 기준 컨텍스트). 초기화·해제도 이 값으로 되돌린다. */
const BASE_FROM = '2026-07';
const BASE_TO = '2026-07';

const MF = '농식품모태펀드';
const YM = '2026-07';

/* 데모 데이터 — [운용사, 운용사등급, 자펀드, 자펀드등급].
   1~4행 = 목업 DATA 원문 그대로. 5행부터는 저장소에 이미 쓰는 이름으로 확장(파일 상단 '한계' 참조). */
const RAW: [string, EarlyWarningGrade, string, EarlyWarningGrade][] = [
  ['(주)유니창업투자', '주의', '유니 수산식품 투자조합1호', '경고'],
  ['(주)유니창업투자', '주의', '유니 농식품 투자조합2호', '주의'],
  ['한국투자파트너스', '정상', '한투 청년농식품투자조합', '정상'],
  ['한국투자파트너스', '정상', '한투 수산벤처투자조합', '주의'],
  ['그린루트벤처스', '경고', '스마트네이처투자조합1호', '경고'],
  ['그린루트벤처스', '경고', '농식품혁신스타트업투자조합', '경고'],
  ['그린루트벤처스', '경고', '세종 농식품바이오 투자조합1호', '주의'],
  ['그린루트벤처스', '경고', '블루6차산업화투자조합1호', '정상'],
  ['코어밸류파트너스', '주의', '메가농식품벤처투자조합3호', '주의'],
  ['코어밸류파트너스', '주의', 'TWI농식품상생투자조합', '주의'],
  ['코어밸류파트너스', '주의', '엘앤에스농식품6차산업화투자조합', '정상'],
  ['코어밸류파트너스', '주의', '센트럴생거진천농식품투자조합', '경고'],
  ['코어밸류파트너스', '주의', 'CKD Smart Farm 1호 농식품투자조합', '정상'],
  ['아그리벤처스', '정상', '컴퍼니케이 애그로씨드투자조합', '정상'],
  ['아그리벤처스', '정상', '미시간글로벌식품산업투자조합2호', '정상'],
  ['아그리벤처스', '정상', '캐피탈원농림수산식품 투자조합2호', '주의'],
  ['아그리벤처스', '정상', 'KB 신자산어보 투자조합', '정상'],
  ['바이오팜캐피탈', '정상', '블루오션수산투자조합2호', '주의'],
  ['바이오팜캐피탈', '정상', '롯데농식품테크펀드1호', '정상'],
  ['바이오팜캐피탈', '정상', '마그나 FRESH펀드', '정상'],
  ['바이오팜캐피탈', '정상', '농식품새싹키움매칭펀드', '경고'],
];

const DEMO: EarlyWarningRow[] = RAW.map(([gp, gpg, fn, fng], i) => ({
  id: 'ew-' + (i + 1), no: i + 1, mf: MF, ym: YM, gp, gpg, fn, fng,
}));

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 `render()` 헤더 순서·집합 그대로(단일 헤더 7컬럼):
     No · 모펀드 · 기준년월 · 운용사 · 종합등급(운용사) · 자펀드 · 종합등급(자펀드)
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음). 7컬럼 내용 폭 합이 프레임(1280)보다 좁아
     내용 맞춤을 쓰면 우측에 빈 공간이 남는다(apfs-aggrid "좁은 매트릭스/집계 그리드" 규약).
   ⚠ 좌측 고정은 No만 — 다른 컬럼에 `pinned`를 주면 목업 순서가 깨진다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다 */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const gradeCell = (p: { value: EarlyWarningGrade }) => <StatusBadge tone={GRADE_TONE[p.value]} label={p.value} size="lg" dot={false} />;

const COLUMNS: ColDef<EarlyWarningRow>[] = [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'mf', headerName: '모펀드', flex: 1, minWidth: 150, width: 150, cellStyle: flexCenter, cellRenderer: textCell },
  /* 기준년월 — 날짜성 값(행 데이터) */
  { field: 'ym', headerName: '기준년월', width: 110, minWidth: 110, cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'gp', headerName: '운용사', flex: 1.3, minWidth: 180, width: 180, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'gpg', headerName: '종합등급(운용사)', width: 150, minWidth: 150, cellStyle: flexMid, cellRenderer: gradeCell },
  { field: 'fn', headerName: '자펀드', flex: 1.8, minWidth: 220, width: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'fng', headerName: '종합등급(자펀드)', width: 150, minWidth: 150, cellStyle: flexMid, cellRenderer: gradeCell },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 단일 헤더라 병합 없음. */
type XCol = { header: string; get: (r: EarlyWarningRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '모펀드', get: (r) => r.mf },
  { header: '기준년월', get: (r) => r.ym },
  { header: '운용사', get: (r) => r.gp },
  { header: '종합등급(운용사)', get: (r) => r.gpg },
  { header: '자펀드', get: (r) => r.fn },
  { header: '종합등급(자펀드)', get: (r) => r.fng },
];

/* ── 로컬 UI 조각(공유 export 아님 — 골드에서 복사하는 것이 규약) ── */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

const ALL_GRADES_ON: Record<EarlyWarningGrade, boolean> = { 정상: true, 주의: true, 경고: true };

/* 기간 PeriodPicker 래퍼 — 트리거가 `w-full`이라 감싸지 않으면 드로어 전 폭으로 늘어난다(apfs-datepicker).
   폭 하한은 공용 SSOT `controlMinWidth`(month는 select/enum과 같은 130). 참조 `audit_log.tsx:85` 동형. */
const monthWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' };

/* ⚠ `overlayNoRowsTemplate`은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 된 경우는 AG Grid가
   별도 오버레이(`noMatchingRows`)를 띄워 기본 영문 "No Matching Rows"가 그대로 노출된다(v35 실측).
   이 화면은 **등급 칩을 전부 끄면 0행**이 목업이 정의한 정상 경로라 문구를 한글로 덮는다.
   객체 prop이므로 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림, apfs-aggrid ⑦).
   ※ 이 영문 노출은 외부필터를 쓰는 저장소 전 그리드의 잠재 결함이지만, 공유 인프라 수정은 이번 범위 밖이라
     이 페이지에만 지역 적용한다. */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조회 조건에 해당하는 자료가 없습니다.',
  noMatchingRows: '조회 조건에 해당하는 자료가 없습니다.',
};

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function EarlyWarningManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<EarlyWarningRow> | null>(null);
  const [rows, setRows] = useState<EarlyWarningRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [chartOpen, setChartOpen] = useState(false);

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 SSOT — 등급(다중 토글, 초기 3개 ON) · 운용사 · 자펀드 · 기준년월(행 필터 아님) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [grades, setGrades] = useState<Record<EarlyWarningGrade, boolean>>(ALL_GRADES_ON);
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fFrom, setFFrom] = useState(BASE_FROM);
  const [fTo, setFTo] = useState(BASE_TO);
  /* 등급 칩 클릭 — 참조(감사로그)의 "누른 것만 활성" 체감을 첫 클릭에만 적용하고 다중 선택은 남긴다.
     · `전체` 활성(3개 모두 ON) 상태에서 누르면 → **그 등급만** 선택(단순 토글이면 "누른 칩이 꺼지고
       안 누른 둘이 켜지는" 역설이 생긴다 — `전체`만 활성으로 보이는 새 외관과 어긋난다)
     · 그 외 상태 → 단순 토글(추가/해제). `주의`+`경고` 동시 조회가 이 경로로 성립한다.
     · 마지막 1개를 해제하면 0행(목업 "선택 안함") — `전체` 칩으로 복구한다.
     ⚠ `allGradesOn`(렌더 파생값) 대신 **updater 인자 `p`로 재판정**한다(연속 클릭에서도 최신 상태 기준). */
  const toggleGrade = (g: EarlyWarningGrade) => setGrades((p) => (
    GRADES.every((x) => p[x])
      ? { 정상: g === '정상', 주의: g === '주의', 경고: g === '경고' }
      : { ...p, [g]: !p[g] }
  ));
  const allGradesOn = GRADES.every((g) => grades[g]);
  const clearFilters = () => { setGrades(ALL_GRADES_ON); setFGp(''); setFFund(''); setFFrom(BASE_FROM); setFTo(BASE_TO); };

  /* 목업 `render()`의 술어 그대로: gp·fn·gradeSel[r.fng]. 기간은 들어가지 않는다(조회 기준 컨텍스트). */
  const passes = useCallback((r: EarlyWarningRow) => {
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    if (!grades[r.fng]) return false;
    return true;
  }, [fGp, fFund, grades]);
  /* 등급 칩을 하나라도 끄면 외부 필터가 "있다"고 알려야 AG Grid가 doesExternalFilterPass를 부른다 */
  const filterActive = Boolean(fGp || fFund) || !allGradesOn;
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<EarlyWarningRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  /* 목업 `refreshTarget()` 동형 — 옵션은 행 데이터에서 유도(AND 조건) */
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);
  /* 칩 건수 = facet count — **등급 필터만 빼고** 나머지를 적용한 모집단 기준(apfs-grid).
     화면에 보이는 행으로 세면 칩 하나를 누른 순간 나머지가 전부 0이 돼 비교 기능이 죽는다. */
  const gradeFacet = useMemo(() => {
    const base = rows.filter((r) => (!fGp || r.gp === fGp) && (!fFund || r.fn === fFund));
    return GRADES.reduce((acc, g) => { acc[g] = base.filter((r) => r.fng === g).length; return acc; },
      {} as Record<EarlyWarningGrade, number>);
  }, [rows, fGp, fFund]);

  const onGridReady = useCallback((e: GridReadyEvent<EarlyWarningRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return v;
      return v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '자펀드' ? 34 : c.header === '운용사' || c.header === '모펀드' ? 22 : c.header === 'No' ? 6 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '조기경보');
    XLSX.writeFile(wb, '조기경보 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  /* `전체` 칩 건수 = 등급 facet의 합(상수 금지 — 운용사·자펀드 필터가 걸리면 함께 줄어야 한다) */
  const gradeTotal = GRADES.reduce((s, g) => s + gradeFacet[g], 0);
  /* 기준년월 칩 노출 조건 — 값이 늘 있으므로 **목업 기본값과 다를 때만** 띄운다(선례 custody_confirm_manage) */
  const periodChanged = fFrom !== BASE_FROM || fTo !== BASE_TO;

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보 관리']}
      title="조기경보 관리"
      favRoute="risk-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 전체+등급 칩 + 적용 중인 값 칩. 외관 정본은 감사로그 툴바(`audit_log.tsx:191-204`).
         행 선택이 없어 selbar는 존재하지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {/* `전체` 칩 — 3칩 모두 ON일 때 활성이고, 누르면 3개를 한 번에 켠다(0행 상태의 복구 경로를 겸한다).
              멱등이라 이미 전부 켜진 상태에서 눌러도 무해. count는 세 facet의 합(상수 금지). */}
          <FilterChip active={allGradesOn} onClick={() => setGrades(ALL_GRADES_ON)} count={String(gradeTotal)}>전체</FilterChip>
          {/* ⚠ `전체`가 활성이면 등급 칩은 **비활성으로 보인다** — 상태(`grades`)는 3개 다 true지만
              참조처럼 "활성 칩은 하나"로 읽히게 표시만 분리한다(파일 상단 '절충' 참조). */}
          {GRADES.map((g) => (
            <FilterChip key={g} active={!allGradesOn && grades[g]} onClick={() => toggleGrade(g)}
              count={String(gradeFacet[g])}>{g}</FilterChip>
          ))}
          {/* 적용 필터 칩 — 값만 표시(접두사 없음) + ×.
              ⚠ 기준년월은 행을 거르지 않는 조회 기준이라 값이 늘 있다 → **기본값과 다를 때만** 칩을 띄우고,
                ×는 '제거'가 아니라 **기본값 복귀**다(aria-label도 그렇게 말한다). */}
          {([
            { key: '운용사', on: !!fGp, value: <>{fGp}</>, aria: '운용사 필터 제거', clear: () => setFGp('') },
            { key: '자펀드', on: !!fFund, value: <>{fFund}</>, aria: '자펀드 필터 제거', clear: () => setFFund('') },
            { key: '기준년월', on: periodChanged, value: String(fFrom) + ' ~ ' + String(fTo), aria: '기준년월 기본값으로', clear: () => { setFFrom(BASE_FROM); setFTo(BASE_TO); } },
          ] as { key: string; on: boolean; value: React.ReactNode; aria: string; clear: () => void }[]).filter((c) => c.on).map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {c.value}
              <button type="button" onClick={c.clear} aria-label={c.aria} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <Button variant="outline" size="sm" leadingIcon="chart" onClick={() => setChartOpen(true)}>차트</Button>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(filteredRows.length) + '개 중 ' + String(Math.min(shown, filteredRows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<EarlyWarningRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          localeText={NO_ROWS_LOCALE}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 자료가 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(운용사·자펀드·기준년월 시작·기준년월 종료).
             검색어는 미사용(OFF, 목업에 없음). 등급은 툴바 칩이 소유한다(드로어 중복 배치 금지) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조기경보 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            {/* 기간 — 목업 `<label for="f-from">기간</label>` 한 줄(시작 `~` 종료). 마크업은 감사로그
                드로어(`audit_log.tsx:244-250`)를 그대로 따르되 **`mode`만 `month`**다: 목업이
                `aria-label="기간 시작 (기준월)"`로 월 단위이고 행 데이터·그리드 컬럼도 `YYYY-MM`이라
                일 단위로 바꾸면 조회 기준이 행과 어긋난다.
                행을 거르지 않는 조회 기준이라 빈 값을 허용하지 않고 해제 시 목업 기본값으로 되돌린다
                (선례 custody_confirm_manage 기준일자). PeriodPicker는 `<label>`로 명명되지 않으므로
                `plain` + `ariaLabel`, 트리거가 `w-full`이라 fit-content 래퍼가 필수. */}
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={monthWrap}><PeriodPicker mode="month" value={fFrom} onChange={(v) => setFFrom(v || BASE_FROM)} ariaLabel="기간 시작" /></div>
                <span className="text-caption">~</span>
                <div style={monthWrap}><PeriodPicker mode="month" value={fTo} onChange={(v) => setFTo(v || BASE_TO)} ariaLabel="기간 종료" /></div>
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {chartOpen && <EarlyWarningTrendModal onClose={() => setChartOpen(false)} />}

    </GridFrame>
  );
}
