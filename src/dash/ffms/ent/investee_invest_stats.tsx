/* 투자실적 현황(투자기업) — 조회 전용 집계표 3장 (투자자산관리 > 투자기업정보,
   route `투자실적 현황(투자기업)`).
   출처: docs/mockups/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html (2026-09-15 파싱 실측)

   데이터·헤더 구조는 `investee_invest_stats_model.ts` 가 SSOT 다. 이 파일은 표현만 맡는다.

   왜 AG Grid 가 아닌 <table> 인가: 원문이 `구분` 열을 rowspan 으로 묶는 **블록 매트릭스**이고
   ②는 3단 헤더다. AG Grid 는 행 병합을 지원하지 않아(그리드는 평평한 행 모델) 블록 라벨을
   16번 반복하게 되는데, 그건 원문과 다른 표다. 정적 집계표라 정렬·필터도 필요 없다.
   표 마크업 프리미티브(TH/TD)는 `company_profile_model.tsx` 복사 관례(apfs-spec-popup).

   ⚠ 금액 단위: 원문 저장값이 **억원**이고(`data-eok` 55개) 원문 스스로 원/백만원/억원 토글을
     제공한다(`fmtEok(eok,unit)`: 억원 → 백만원 ×100 → 원 ×1e8). 그 환산을 그대로 옮긴다 —
     `schemas/unit.ts`(저장 단위=원)는 여기 쓰지 않는다. base 가 다르면 같은 함수가 값을 망친다.
   ⚠ 원문 `건수기준`(투자건수·투자금액) select 는 **동작이 배선돼 있지 않다**(스크립트에 블록
     전환 로직 없음 — 2026-09-16 실측). 두 블록은 항상 함께 그려진다. 한때 이 컨트롤로 블록을
     하나만 남겼었는데, 그건 원문에 없는 동작이고 보고서 절반을 숨겼다(Codex 3라운드 P1).
   ⚠ 표가 넓어 가로 스크롤은 **각 표의 래퍼 안에만** 둔다(페이지 전체가 가로로 밀리지 않게). */
import { useState, useMemo, useCallback } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { useHotkey, HOTKEYS } from '../../use-hotkey';   // ⌘P 인쇄 · ⌥D 내보내기(푸터 툴팁 힌트와 짝)
import { toast } from '../../ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본(로컬 복제 금지 — drawer_select.test.ts)
import { controlMinWidth } from '../../schemas/renderers';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import {
  SALES_SCALE_HEADERS, INVEST_TYPE_HEADERS, INVEST_TYPE_GROUPS, REGION_GROUPS,
  SALES_SCALE_ROWS, INVEST_TYPE_ROWS, REGION_ROWS, SOURCE_COUNTS,
} from './investee_invest_stats_model';
import type { MatrixRow, RegionRow } from './investee_invest_stats_model';

const { Button, IconBtn, SegTabs } = UI;

/* 표 밀도 — 투자기업정보(통합) 페이지(company_profile_model `page` variant)와 같은 시각 언어(2026-09-24).
   셀은 사방 테두리를 그대로 두고, 표를 `border-hidden` 으로 감싸 바깥 테두리만 지운다 —
   collapse 모델에서 table 의 hidden 이 바깥 셀 테두리를 이기므로 rowspan·3단 헤더에도 이중선이 안 생긴다.
   바깥선은 둥근 래퍼(TABLE_FRAME)가 그린다. */
const TH_BASE = 'border border-solid border-border bg-muted text-[12.5px] font-semibold text-muted-foreground whitespace-nowrap';
const TH = `${TH_BASE} text-left`;
const THR = `${TH_BASE} text-right`;
/* 2단 그룹 헤더(colSpan 묶음 제목)만 가운데 — 표 정렬 규약의 허용 예외 */
const THG = `${TH_BASE} text-center`;
const TD = 'border border-solid border-border text-[13.5px] text-foreground whitespace-nowrap';
const PAD = { padding: '10px 12px' } as const;
const TABLE_FRAME = 'overflow-x-auto border border-solid border-border rounded-[var(--radius-sm)]';
const ROW_HOVER = 'hover:[&>td]:bg-muted';
const num = (v: number | string) => (typeof v === 'number' ? v.toLocaleString('ko-KR') : v);
/* 블록별 포맷 — `투자건수` 블록은 건수(환산 대상 아님), `투자금액` 블록만 단위 환산한다.
   소재지별 표는 건수/금액이 한 행에 섞여 있어 열 인덱스로 가른다(0·1=건수, 2·3=금액). */
const fmtVal = (v: number | string, isAmount: boolean, unit: StatUnit) =>
  isAmount && typeof v === 'number' ? fmtEok(v, unit) : num(v);

/* 원문 투자실적구분 — 화면(표)을 실제로 전환하는 유일한 검색조건. 툴바 칩과 드로어가 이 state 를 공유한다. */
const VIEWS = [
  { key: 'salesScale', label: '경영체매출액별' },
  { key: 'investType', label: '투자형태별' },
  { key: 'region',     label: '소재지별' },
] as const;
type ViewKey = typeof VIEWS[number]['key'];

/* 원문 금액단위 토글 — 저장 base 가 **억원**이다(`fmtEok`). unit.ts(base=원)와 다른 축이라 여기 둔다. */
const STAT_UNITS = ['원', '백만원', '억원'] as const;
type StatUnit = typeof STAT_UNITS[number];
const fmtEok = (eok: number, unit: StatUnit) =>
  (unit === '억원' ? eok : unit === '백만원' ? eok * 100 : eok * 1e8).toLocaleString('ko-KR');

/* 상세필터 옵션 — 원문 목업이 **런타임 스크립트**로 주입하는 값 그대로(정적 <select> 파싱으론 0개로 보였다).
   `chipGroup('f-acc'|'f-yb'|'f-src', …)` + `#f-mf`·`#f-cnt` <option>. 철자도 원문(출자사업년도) 그대로. */
const MOTHER_FUNDS = ['농식품모태펀드', 'MOAF'];
const ACCOUNTS = ['농식품', '수산'];                       // 원문 '전체'는 DrawerSelect 기본 '전체'(="")가 대신한다
const YEAR_BASES = ['출자사업년도', '결성연도', '등록연도'];
const COUNT_BASES = ['투자건수', '투자금액'];
const DATA_BASES = ['운용사보고', '월말확정'];

/* 드로어 항목 래퍼 — fund_invest_status.tsx 와 같은 모양(공용 export 가 없어 같은 관례로 둔다).
   noop = 행 데이터와 미연동 → `· 데이터 연동 후 적용` 캡션(무신호 무효 필터 금지). */
function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}

function Section({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-[14px] flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* preflight:false라 h3/p에 UA 기본 마진이 살아 있다 → margin:0 명시(preflight-off-ua-margin-trap) */}
        <h3 className="t-cardtitle text-foreground" style={{ margin: 0 }}>{title}</h3>
        <p className="text-[12.5px] text-caption" style={{ margin: 0 }}>{caption}</p>
      </div>
      <div className={TABLE_FRAME}>{children}</div>
    </section>
  );
}

/* 블록 매트릭스 — 같은 block 의 첫 행에만 rowSpan 셀을 낸다(원문 구조 그대로). */
function BlockMatrix({ rows, headers, head, unit }: { rows: MatrixRow[]; headers: readonly string[]; head: React.ReactNode; unit: StatUnit }) {
  let prev = '';
  return (
    <table className="w-full border-collapse border-hidden" style={{ minWidth: 60 * headers.length + 240 }}>
      <thead>{head}</thead>
      <tbody>
        {rows.map((r) => {
          const first = r.block !== prev;
          const span = rows.filter((x) => x.block === r.block).length;
          prev = r.block;
          const total = r.label.replace(/\s/g, '') === '합계';
          return (
            <tr key={r.block + r.label} className={total ? '' : ROW_HOVER}>
              {first && <th scope="rowgroup" rowSpan={span} className={TH} style={PAD}>{r.block}</th>}
              <th scope="row" className={`${TD} text-left ${total ? 'font-bold bg-muted' : ''}`} style={PAD}>
                {r.label}
              </th>
              {r.values.map((v, i) => (
                <td key={headers[i]} className={`${TD} text-right tabular ${total ? 'font-bold bg-muted' : ''}`} style={PAD}>
                  {String(fmtVal(v, r.block === '투자금액', unit))}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RegionTable({ rows, unit }: { rows: RegionRow[]; unit: StatUnit }) {
  return (
    <table className="w-full border-collapse border-hidden" style={{ minWidth: 560 }}>
      <thead>
        <tr>
          <th scope="col" rowSpan={2} className={TH} style={PAD}>NO</th>
          <th scope="col" rowSpan={2} className={TH} style={PAD}>소재지</th>
          {REGION_GROUPS.map((g) => <th key={g.label} scope="colgroup" colSpan={2} className={THG} style={PAD}>{g.label}</th>)}
        </tr>
        <tr>
          {REGION_GROUPS.flatMap((g) => g.children.map((c) => <th key={g.label + c} scope="col" className={THR} style={PAD}>{c}</th>))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const total = r.region === '합계';
          return (
            <tr key={r.region} className={total ? '' : ROW_HOVER}>
              {total
                ? <th scope="row" colSpan={2} className={`${TD} text-left font-bold bg-muted`} style={PAD}>합계</th>
                : (<>
                    <td className={`${TD} tabular`} style={PAD}>{r.no}</td>
                    <th scope="row" className={`${TD} text-left font-normal`} style={PAD}>{r.region}</th>
                  </>)}
              {/* values = [투자건수, 건수비율, 투자금액, 금액비율] — 인덱스 2만 금액이라 환산 대상이다 */}
              {r.values.map((v, i) => (
                <td key={i} className={`${TD} text-right tabular ${total ? 'font-bold bg-muted' : ''}`} style={PAD}>
                  {String(fmtVal(v, i === 2, unit))}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function InvesteeInvestStats({ onNav }: { onNav?: (r: string) => void }) {
  const [view, setView] = useState<ViewKey>(VIEWS[0].key);
  const [unit, setUnit] = useState<StatUnit>('억원');   // 원문 기본값 = 저장 base
  useHotkey(HOTKEYS.print.combo, () => window.print());

  /* 상세필터 — 원문 검색박스 7항목. 투자실적구분(=view)만 표를 바꾸고 나머지 6종은 noop:
     집계표 원천이 고정 상수라 거를 차원이 없다(값을 지어내 행을 바꾸지 않는다).
     ⚠ 건수기준은 noop 이어야 한다 — 블록 숨김에 배선하면 보고서 절반이 사라진다(상단 ⚠, Codex P1).
     기준일자 기본값(원문 2026-07-31)은 적용하지 않는다 — 자펀드 투자실적현황과 같은 열린 경계. */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');       // 모펀드
  const [fAcc, setFAcc] = useState('');     // 계정구분
  const [fYBase, setFYBase] = useState(''); // 연도기준
  const [fCnt, setFCnt] = useState('');     // 건수기준
  const [fDBase, setFDBase] = useState(''); // 데이터기준
  const [fAsOf, setFAsOf] = useState('');   // 기준일자
  const resetFilters = () => { setFMf(''); setFAcc(''); setFYBase(''); setFCnt(''); setFDBase(''); setFAsOf(''); setView(VIEWS[0].key); };
  /* 조회 — 원천이 정적 상수라 재조회할 원본이 없다. 알림만(가짜 데이터 갱신 금지) */
  const refresh = () => toast.success('조회되었습니다');

  const isMatrix = view !== 'region';
  // 두 블록(투자건수·투자금액)은 **함께** 그린다 — 원문이 그렇고, 하나만 남기면 보고서 절반이 사라진다.
  const rows = view === 'salesScale' ? SALES_SCALE_ROWS : INVEST_TYPE_ROWS;
  const headers = view === 'salesScale' ? SALES_SCALE_HEADERS : INVEST_TYPE_HEADERS;
  const meta = VIEWS.find((v) => v.key === view)!;

  /* 엑셀 — 원문 툴바의 `엑셀` 액션. 화면에 보이는 표를 **현재 단위 그대로** 내보낸다. */
  const exportExcel = useCallback(() => {
    const head = isMatrix
      ? ['구분', '연도', ...headers]
      : ['NO', '소재지', ...REGION_GROUPS.flatMap((g) => g.children.map((c) => `${g.label} ${c}`))];
    const body = isMatrix
      ? rows.map((r) => [r.block, r.label, ...r.values.map((v) => (fmtVal(v, r.block === '투자금액', unit)))])
      : REGION_ROWS.map((r) => [r.no, r.region, ...r.values.map((v, i) => (fmtVal(v, i === 2, unit)))]);
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, meta.label);
    XLSX.writeFile(wb, `투자실적현황(투자기업)_${meta.label}_${unit}.xlsx`);
    toast.success(`${meta.label} 표를 Excel로 내보냈습니다 (단위: ${unit})`);
  }, [isMatrix, headers, rows, meta, unit]);
  useHotkey(HOTKEYS.export.combo, () => exportExcel());   // ⌥D — 푸터 내보내기 툴팁 힌트와 짝

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자실적현황(투자기업)']}
      title="투자실적현황(투자기업)"
      favRoute="투자실적 현황(투자기업)"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 원문 `투자실적구분` — 이것만이 실제로 그리드를 전환한다(원문 스크립트 `.gridblock` 토글).
         모드 전환이라 기본 필터 칩으로 둔다(2026-09-24 — 한 줄 툴바, 넘치면 +N 메뉴).
         나머지 검색조건(모펀드·계정구분·연도기준·건수기준·데이터기준·기준일자)은 상세필터 드로어에 둔다
         (자펀드 투자실적현황과 같은 패턴). 전부 noop 이라 적용 칩은 만들지 않는다. */
      filterChips={VIEWS.map((v) => ({ key: v.key, label: v.label, active: view === v.key, onSelect: () => setView(v.key) }))}
      toolbarRight={<>
        <span className="text-muted-foreground" style={{ fontSize: 13 }}>금액 단위</span>
        <SegTabs size="sm" options={STAT_UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as StatUnit)} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{`모펀드 농식품모태펀드 · 매출액별 ${SOURCE_COUNTS.salesScale}행 · 투자형태별 ${SOURCE_COUNTS.investType}행 · 소재지별 ${SOURCE_COUNTS.region}행 (원문 그대로)`}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>
      <div style={{ padding: '20px 2px 8px', minHeight: 320 }}>
        {view === 'salesScale' && (
          <Section title="경영체 매출액별 투자실적" caption={`투자건수·투자금액 2개 블록 · 연도(2010~2025)+합계 · 금액 단위: ${unit}`}>
            <BlockMatrix rows={rows} headers={SALES_SCALE_HEADERS} unit={unit}
              head={(
                <tr>
                  <th scope="col" colSpan={2} className={TH} style={PAD}>
                    구분
                  </th>
                  {SALES_SCALE_HEADERS.map((h) => <th key={h} scope="col" className={THR} style={PAD}>{h}</th>)}
                </tr>
              )} />
          </Section>
        )}

        {view === 'investType' && (
          <Section title="투자형태별 투자실적" caption={`투자건수·투자금액 2개 블록 · 주식(보통주 신주·구주 / 전환우선주)·채권(BW·CB)·프로젝트 3단 헤더 · 금액 단위: ${unit}`}>
            <BlockMatrix rows={rows} headers={INVEST_TYPE_HEADERS} unit={unit}
              head={(<>
                <tr>
                  <th scope="col" colSpan={2} rowSpan={3} className={TH} style={PAD}>
                    구분
                  </th>
                  <th scope="colgroup" colSpan={INVEST_TYPE_GROUPS[0].span} className={THG} style={PAD}>{INVEST_TYPE_GROUPS[0].label}</th>
                  <th scope="colgroup" colSpan={INVEST_TYPE_GROUPS[1].span} className={THG} style={PAD}>{INVEST_TYPE_GROUPS[1].label}</th>
                  <th scope="col" rowSpan={3} className={THR} style={PAD}>프로젝트</th>
                  <th scope="col" rowSpan={3} className={THR} style={PAD}>합계</th>
                </tr>
                <tr>
                  <th scope="colgroup" colSpan={2} className={THG} style={PAD}>보통주</th>
                  <th scope="col" rowSpan={2} className={THR} style={PAD}>전환우선주</th>
                  <th scope="col" rowSpan={2} className={THR} style={PAD}>BW</th>
                  <th scope="col" rowSpan={2} className={THR} style={PAD}>CB</th>
                </tr>
                <tr>
                  <th scope="col" className={THR} style={PAD}>신주</th>
                  <th scope="col" className={THR} style={PAD}>구주</th>
                </tr>
              </>)} />
          </Section>
        )}

        {view === 'region' && (
          <Section title="소재지별 투자실적" caption={`투자건수·투자금액 각 건수/비율 2단 헤더 · 금액 단위: ${unit}`}>
            <RegionTable rows={REGION_ROWS} unit={unit} />
          </Section>
        )}
      </div>

      {/* ── 상세필터 드로어 — 원문 검색박스 순서 그대로(모펀드·계정구분·연도기준·투자실적구분·건수기준·데이터기준·기준일자).
             투자실적구분만 표시를 바꾸고 나머지는 noop 캡션. 검색어는 OFF(만들지 않는다). ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">투자실적 현황(투자기업) 조회 조건을 고르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={MOTHER_FUNDS} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={ACCOUNTS} /></DrawerField>
            <DrawerField label="연도기준" noop><DrawerSelect value={fYBase} onChange={setFYBase} options={YEAR_BASES} /></DrawerField>
            {/* 투자실적구분 — 툴바 칩과 같은 state 공유. 항상 3뷰 중 하나라 '전체' 옵션이 없다 */}
            <DrawerField label="투자실적구분">
              <DrawerSelect value={view} onChange={(v: string) => setView(v as ViewKey)} options={VIEWS.map((v) => ({ value: v.key, label: v.label }))} all={null} />
            </DrawerField>
            <DrawerField label="건수기준" noop><DrawerSelect value={fCnt} onChange={setFCnt} options={COUNT_BASES} /></DrawerField>
            <DrawerField label="데이터기준" noop><DrawerSelect value={fDBase} onChange={setFDBase} options={DATA_BASES} /></DrawerField>
            {/* 기준일자 — PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker), fit-content 래퍼로 폭 고정 */}
            <DrawerField label="기준일자" noop plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fAsOf} onChange={setFAsOf} ariaLabel="기준일자" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </GridFrame>
  );
}
