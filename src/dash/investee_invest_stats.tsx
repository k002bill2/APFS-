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
import { UI } from './components';
import { GridFrame, FooterActions } from './grid_frame';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import {
  SALES_SCALE_HEADERS, INVEST_TYPE_HEADERS, INVEST_TYPE_GROUPS, REGION_GROUPS,
  SALES_SCALE_ROWS, INVEST_TYPE_ROWS, REGION_ROWS, SOURCE_COUNTS,
} from './investee_invest_stats_model';
import type { MatrixRow, RegionRow } from './investee_invest_stats_model';

const { Button, IconBtn, SegTabs } = UI;

const TH = 'border border-border bg-muted text-[11.5px] font-bold text-muted-foreground whitespace-nowrap';
const TD = 'border border-border text-[12px] text-foreground';
const PAD = { padding: '7px 8px' } as const;
const num = (v: number | string) => (typeof v === 'number' ? v.toLocaleString('ko-KR') : v);
/* 블록별 포맷 — `투자건수` 블록은 건수(환산 대상 아님), `투자금액` 블록만 단위 환산한다.
   소재지별 표는 건수/금액이 한 행에 섞여 있어 열 인덱스로 가른다(0·1=건수, 2·3=금액). */
const fmtVal = (v: number | string, isAmount: boolean, unit: StatUnit) =>
  isAmount && typeof v === 'number' ? fmtEok(v, unit) : num(v);

/* 원문 검색조건 중 **화면을 바꾸는** 두 컨트롤(2026-09-16 Codex 지적으로 복원).
   나머지(모펀드·계정구분·연도기준·데이터기준·기준일자)는 원문에서도 값 도메인이 비어 있어
   컨트롤을 만들지 않는다 — 없는 선택지를 지어내지 않는다. */
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

function Section({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      {/* preflight:false라 h3/p에 UA 기본 마진이 살아 있다 → margin:0 명시(preflight-off-ua-margin-trap) */}
      <h3 className="text-[13.5px] font-bold text-foreground" style={{ margin: '0 0 3px' }}>{title}</h3>
      <p className="text-[11.5px] text-muted-foreground" style={{ margin: '0 0 8px' }}>{caption}</p>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/* 블록 매트릭스 — 같은 block 의 첫 행에만 rowSpan 셀을 낸다(원문 구조 그대로). */
function BlockMatrix({ rows, headers, head, unit }: { rows: MatrixRow[]; headers: readonly string[]; head: React.ReactNode; unit: StatUnit }) {
  let prev = '';
  return (
    <table className="w-full border-collapse" style={{ minWidth: 60 * headers.length + 240 }}>
      <thead>{head}</thead>
      <tbody>
        {rows.map((r) => {
          const first = r.block !== prev;
          const span = rows.filter((x) => x.block === r.block).length;
          prev = r.block;
          const total = r.label.replace(/\s/g, '') === '합계';
          return (
            <tr key={r.block + r.label}>
              {first && <th scope="rowgroup" rowSpan={span} className={TH} style={PAD}>{r.block}</th>}
              <th scope="row" className={`${TD} text-center ${total ? 'font-bold bg-muted' : ''}`} style={PAD}>
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
    <table className="w-full border-collapse" style={{ minWidth: 560 }}>
      <thead>
        <tr>
          <th scope="col" rowSpan={2} className={TH} style={PAD}>NO</th>
          <th scope="col" rowSpan={2} className={TH} style={PAD}>소재지</th>
          {REGION_GROUPS.map((g) => <th key={g.label} scope="colgroup" colSpan={2} className={TH} style={PAD}>{g.label}</th>)}
        </tr>
        <tr>
          {REGION_GROUPS.flatMap((g) => g.children.map((c) => <th key={g.label + c} scope="col" className={TH} style={PAD}>{c}</th>))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const total = r.region === '합계';
          return (
            <tr key={r.region}>
              {total
                ? <th scope="row" colSpan={2} className={`${TD} text-center font-bold bg-muted`} style={PAD}>합계</th>
                : (<>
                    <td className={`${TD} text-center tabular`} style={PAD}>{r.no}</td>
                    {/* 소재지는 행 축이다 — 차트 축·표 헤더와 같은 부류라 마스킹하지 않는다
                        (CLAUDE.md 데이터 마스크 규약: "축은 두고 데이터는 가린다"). 가리면 어느 지역
                        숫자인지 알 수 없어 표 자체가 판독 불가가 된다(2026-09-16 Codex 지적). */}
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

  const isMatrix = view !== 'region';
  // 두 블록(투자건수·투자금액)은 **함께** 그린다 — 원문이 그렇고, 하나만 남기면 보고서 절반이 사라진다.
  const rows = view === 'salesScale' ? SALES_SCALE_ROWS : INVEST_TYPE_ROWS;
  const headers = view === 'salesScale' ? SALES_SCALE_HEADERS : INVEST_TYPE_HEADERS;
  const meta = VIEWS.find((v) => v.key === view)!;

  /* 엑셀 — 원문 툴바의 `엑셀` 액션. 화면에 보이는 표를 **현재 단위 그대로** 내보낸다.
     마스크 경계는 엑셀까지 같되 **축(연도·NO·소재지)은 남긴다**(축까지 비우면 빈 격자가 된다). */
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

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자실적현황(투자기업)']}
      title="투자실적현황(투자기업)"
      favRoute="투자실적 현황(투자기업)"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={(
        <>
          {/* 원문 `투자실적구분` — 이것만이 실제로 그리드를 전환한다(원문 스크립트 `.gridblock` 토글).
              나머지 검색조건(계정구분·연도기준·데이터기준·기준일자)은 **원문 select 에 옵션이 0개**라
              컨트롤을 만들지 않는다 — 빈 select 는 고를 것이 없고, 값을 지어내면 창작이 된다.
              `모펀드`는 APFS 단일값이라 푸터 캡션으로 둔다. */}
          <span className="text-caption" style={{ fontSize: 12 }}>투자실적구분</span>
          <SegTabs options={VIEWS.map((v) => ({ value: v.key, label: v.label }))} value={view}
            onChange={(v: string) => setView(v as ViewKey)} />
        </>
      )}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
        <SegTabs size="sm" options={STAT_UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as StatUnit)} />
        <IconBtn icon="download" label="내보내기 (Excel)" size={34} onClick={exportExcel} />
      </>}
      footerLeft={<span>{`모펀드 농식품모태펀드 · 매출액별 ${SOURCE_COUNTS.salesScale}행 · 투자형태별 ${SOURCE_COUNTS.investType}행 · 소재지별 ${SOURCE_COUNTS.region}행 (원문 그대로)`}</span>}
      footerRight={<FooterActions />}>
      <div style={{ padding: '4px 2px 8px', minHeight: 320 }}>
        {view === 'salesScale' && (
          <Section title="경영체 매출액별 투자실적" caption={`투자건수·투자금액 2개 블록 · 연도(2010~2025)+합계 · 금액 단위: ${unit}`}>
            <BlockMatrix rows={rows} headers={SALES_SCALE_HEADERS} unit={unit}
              head={(
                <tr>
                  <th scope="col" colSpan={2} className={TH} style={PAD}>
                    구분
                  </th>
                  {SALES_SCALE_HEADERS.map((h) => <th key={h} scope="col" className={TH} style={PAD}>{h}</th>)}
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
                  <th scope="colgroup" colSpan={INVEST_TYPE_GROUPS[0].span} className={TH} style={PAD}>{INVEST_TYPE_GROUPS[0].label}</th>
                  <th scope="colgroup" colSpan={INVEST_TYPE_GROUPS[1].span} className={TH} style={PAD}>{INVEST_TYPE_GROUPS[1].label}</th>
                  <th scope="col" rowSpan={3} className={TH} style={PAD}>프로젝트</th>
                  <th scope="col" rowSpan={3} className={TH} style={PAD}>합계</th>
                </tr>
                <tr>
                  <th scope="colgroup" colSpan={2} className={TH} style={PAD}>보통주</th>
                  <th scope="col" rowSpan={2} className={TH} style={PAD}>전환우선주</th>
                  <th scope="col" rowSpan={2} className={TH} style={PAD}>BW</th>
                  <th scope="col" rowSpan={2} className={TH} style={PAD}>CB</th>
                </tr>
                <tr>
                  <th scope="col" className={TH} style={PAD}>신주</th>
                  <th scope="col" className={TH} style={PAD}>구주</th>
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
    </GridFrame>
  );
}
