/* 관리보수보고 상세조회 — 읽기전용 상세 팝업 (관리보수관리 그리드의 `지급일자` 링크로 진입).
   출처: docs/mockups/01_투자자산관리/S1_43_관리보수관리.html `openDetail(i,tr)` (2026-09-16 파싱 실측)
   원문 데이터·상수는 `mgmt_fee_detail_model.ts` 가 SSOT 다(RATE·FORMULA·CALC_BY_NO·BASE_NOTE).

   구성(목업 → 우리 규약):
   - `.modal` + 스크림·포커스트랩·scroll lock → Radix `Dialog`(크롬은 Radix 소유, 이식하지 않는다)
   - `dl.dl` 9항목            → `KvGrid`(골드 `gp_contribution_detail_modal.tsx` 복사 관례)
   - `table.grid` 7컬럼 1행   → 수제 표(TH/TD/CELL 헬퍼 복사). 합계행 없음 — 원문에 tfoot 이 없다.
   - 푸터 `닫기` 하나         → 목업 동일(저장·엑셀 없음 — 팝업은 읽기전용이다)

   원문 그대로 둔 것
   - 섹션 제목이 팝업 제목과 **같은 문자열**로 한 번 더 나온다(원문 `modal-head h2` + 첫 `sec-title`).
     중복처럼 보이지만 원문이 그렇다 — 임의로 지우지 않는다. `<>` 꺾쇠는 원문의 장식이라 h3 로 대체한다.
   - `지출내역`·`삭감내역` 은 원문이 리터럴 `-` 다(값 없음이 아니라 "없음"이 원문 값).

   마스크 경계("축은 두고 데이터는 가린다")
   - 가린다: 운용사·자펀드·보고구분·지급구분(MT) · 지급일자·금액·일자·일수·기준금액·관리보수금액(mn)
   - 안 가린다: `산출내역`/`계산산식`/`보수율` — 상수 RATE 에서 파생된 **산식 정의**라 행마다 같고
     엔티티 데이터가 아니다(단위 표기와 같은 부류). 셋 중 하나만 가리면 같은 값이 한 화면에서
     가려진 채로도 드러난 채로도 보이게 된다. */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { fmt } from './aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { ReviewMarker } from './review_marker';
import { PCT_LABEL, FORMULA, CALC_BY_NO, BASE_NOTE, baseAmount } from './mgmt_fee_detail_model';

const { Button } = UI;

/* ── 프리미티브(골드 `gp_contribution_detail_modal.tsx` 복사 — 공유 export 아님) ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">{title}</h3>
      {children}
    </section>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/* kind: 'text'=MT 마스킹 · 'num'=mn 마스킹 · 'plain'=비마스킹(산식 정의) · 'empty'=원문 리터럴 '-' */
type KvItem = { l: string; v: string; full?: boolean; kind: 'text' | 'num' | 'plain' | 'empty' };

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.kind === 'empty' ? 'text-caption' : ''}`}
            style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {o.kind === 'empty' ? '-' : o.kind === 'num' ? mn(o.v) : o.kind === 'plain' ? o.v : <MT>{o.v}</MT>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 원문 `dl.dl` 9항목 — 라벨·순서·`full` 폭 모두 원문 그대로 */
const buildItems = (r: Record<string, unknown>): KvItem[] => [
  { l: '운용사',   v: String(r.gp ?? ''),      full: true, kind: 'text' },
  { l: '자펀드',   v: String(r.subFund ?? ''), full: true, kind: 'text' },
  { l: '보고구분', v: String(r.reportType ?? ''), kind: 'text' },
  { l: '지급구분', v: String(r.payType ?? ''),    kind: 'text' },
  { l: '지급일자', v: String(r.payDate ?? ''),    kind: 'num' },
  { l: '금액',     v: fmt(Number(r.amount ?? 0)) + ' 원', kind: 'num' },
  { l: '지출내역', v: '', full: true, kind: 'empty' },
  { l: '산출내역', v: FORMULA, full: true, kind: 'plain' },
  { l: '삭감내역', v: '', full: true, kind: 'empty' },
];

/* 원문 `<관리보수 산출내역>` 표 — 7컬럼 1행.
   ⚠ `기준금액` 헤더의 검토필요 마커는 **baseConfirmed 가 false 일 때만** 뜬다(원문 `baseMark`).
     현재 유일한 원문 행(no:1)은 true 라 마커가 없고 실캡처 값이 그대로 나온다 — 뒤집으면
     역산값이 경고 없이 표시된다(mgmt_fee_detail_model.ts 상단 참조). */
function CalcTable({ row }: { row: Record<string, unknown> }) {
  const calc = CALC_BY_NO[String(row.no ?? '')];
  const amount = Number(row.amount ?? 0);
  const base = baseAmount(calc, amount);
  if (!calc || base == null) {
    // 원문에 산출내역이 없는 행 — 값을 지어내지 않는다(목업이 추정 19건을 뺀 판단과 같은 이유)
    return <p className="text-caption m-0" style={{ padding: '10px 2px' }}>산출내역 원문 미확인 — 표시할 값이 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 820 }}>
        <caption className="sr-only">관리보수 산출내역 — 기준·일자·기준금액·일수·보수율·관리보수금액·계산산식</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ ...CELL, width: 88 }}>기준</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 180 }}>일자</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 150 }}>
              <span className="inline-flex items-center gap-1">기준금액{!calc.baseConfirmed && <ReviewMarker {...BASE_NOTE} label="기준금액" />}</span>
            </th>
            <th scope="col" className={TH} style={{ ...CELL, width: 68 }}>일수</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 74 }}>보수율</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 140 }}>관리보수금액</th>
            <th scope="col" className={TH} style={CELL}>계산산식</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${TD} text-center`} style={CELL}><MT>투자잔액</MT></td>
            <td className={`${TD} text-center tabular`} style={CELL}>{mn(calc.span)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(base))}</td>
            <td className={`${TD} text-center tabular`} style={CELL}>{mn(String(calc.days))}</td>
            <td className={`${TD} text-center tabular`} style={CELL}>{PCT_LABEL}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(amount))}</td>
            <td className={TD} style={CELL}>{FORMULA}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function MgmtFeeDetailModal({ row, onClose }: { row: Record<string, unknown>; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">관리보수보고 상세조회</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">
              <MT>{String(row.subFund ?? '')}</MT> · {mn(String(row.payDate ?? ''))}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Section title="관리보수보고 상세조회"><KvGrid items={buildItems(row)} /></Section>
          <Section title="관리보수 산출내역"><CalcTable row={row} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
