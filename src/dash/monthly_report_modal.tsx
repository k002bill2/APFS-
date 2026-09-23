/* 월간보고 — 읽기전용 정기보고서 원문 팝업 (출처: S1_06_01_월간보고.html, KRDS TO-BE)
   진입: 정기보고 목록(GenericListPage)의 **보고구분 셀 링크**(월간보고 행) — 원문 설계 메모의
   "보고구분(월간보고서 태그) 또는 상세조회 클릭으로만 진입하는 하위 상세 화면"을 모달로 옮긴 것이다.
   구성(원문 1~6 섹션 순서 그대로): ① 펀드개요(결성일·존속기간·결성액 + 조합구성)
     ② 투자 진행상황(투자집행 업체현황 2단 헤더 · 사후관리 등급 · 등급분류기준 · 회수내역 · 수시보고 내역)
     ③ 미투자자산 운용현황(예금내역) ④ 수입내역 ⑤ 비용내역 ⑥ 누적분배내역
   골격·크롬(Dialog · px-[46px] 정렬 · Section 헬퍼 · UnitSeg)은 `subfund_spec_modal.tsx`(골드) 복사 관례.

   ⚠ 금액 단위 토글은 **둔다** — 원문 설계 메모가 "상세는 조회 전용이라 금액 단위전환(원/백만원/억원) 적용"을
     명시한다(apfs-spec-popup 규약 2). 데이터는 원 단위 정수(monthly_report_data.ts), 변환은 money() 한 곳.
   ⚠ 엑셀은 **두지 않는다** — 렌더 소스가 10개 배열(조합구성·투자집행·사후관리등급·등급분류기준·회수내역·
     수시보고내역·예금·수입·비용·누적분배)이라 "화면=엑셀 불변식"(규약 6)을 지키기 어렵고, 원문 상세 화면의
     크롬도 `‹ 이전` + 단위 토글뿐이다(엑셀 없음). 같은 판단을 `occasional_report_modal.tsx`가 5개 배열에서 했다.
   ⚠ 한계: 원문 보고서 실데이터가 1건(AJ-ISU경기도애그리푸드투자조합 2026.01.31 현재)뿐이라 정기보고 목록의
     어느 월간보고 행을 열어도 같은 내용이 나온다. 헤더 대상명도 행이 아니라 원문 값을 쓴다 — 행의 합성
     운용사명("운용사 003")을 얹으면 본문(AJ-ISU)과 어긋나기 때문이다. 실데이터 연동 시 `row`로 조회하도록 바꾼다.
     (동일 한계·동일 처리: occasional_report_modal.tsx) */
import React, { useState } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { fmt } from './aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import {
  RPT_META, MEMBERS, MEMBERS_TOTAL, INVEST, INVEST_TOTAL, GRADES, GRADE_CRITERIA,
  RECOVERY, RECOVERY_TOTAL, OCC_NOTES, DEPOSITS, DEPOSITS_TOTAL,
  INCOME, INCOME_TOTAL, EXPENSE, EXPENSE_TOTAL, DISTRIB, DISTRIB_TOTAL, NOTES,
} from './monthly_report_data';

const { Button, SegTabs, StatusBadge } = UI;

type Unit = '원' | '백만원' | '억원';
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };

/* 금액 → 단위 환산 문자열. 억/백만은 소수 2자리까지 — 골드 subfund_spec_modal.money와 동일 계약 */
function money(won: number | null | undefined, unit: Unit): string {
  if (won == null) return '-';
  const v = won / UNIT_DIV[unit];
  return String(unit === '원' ? fmt(won) : v.toLocaleString(undefined, { maximumFractionDigits: 2 }));
}
const negStyle = (v: number): React.CSSProperties | undefined => (v < 0 ? { color: 'var(--danger-text)' } : undefined);
/* 사후관리 등급 → 톤. 등급분류기준(AA~D)이 상태 도메인이라 StatusBadge로 렌더한다. */
const GRADE_TONE: Record<string, Tone> = { AA: 'success', A: 'success', B: 'info', C: 'warning', D: 'danger' };

/* ── 표 프리미티브 ── */
const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center whitespace-nowrap';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '6px 10px' };
const SUM_ROW = 'bg-muted font-bold';

/* 가로 스크롤은 표마다 자기 래퍼가 갖는다 — 모달 본문은 어떤 폭에서도 가로 스크롤되지 않는다(responsive 규약) */
function Tbl({ caption, minWidth, children }: { caption: string; minWidth: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth, fontSize: 13 }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
function Section({ title, unitNote, notes, children }: { title: string; unitNote?: string; notes?: string[]; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">
        {title}{unitNote && <span className="ml-auto text-caption font-semibold" style={{ fontSize: 12.5 }}>{unitNote}</span>}
      </h3>
      {children}
      {notes?.map((t) => <p key={t} className="text-caption mt-2 mb-0" style={{ fontSize: 12 }}>{t}</p>)}
    </section>
  );
}
/* 섹션 안의 하위 표 제목(가. 나. 다.) — 섹션 제목(18)보다 한 단 아래 */
function SubTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-bold mt-0 mb-2" style={{ fontSize: 14 }}>{children}</h4>;
}
function UnitSeg({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 mb-3">
      <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
      <SegTabs size="sm" value={unit} onChange={(v: string) => onChange(v as Unit)}
        options={(['원', '백만원', '억원'] as Unit[]).map((u) => ({ value: u, label: u }))} />
    </div>
  );
}

/* ── 1. 펀드개요 ── */
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
function FundOverview({ unit }: { unit: Unit }) {
  const items: { l: string; v: React.ReactNode }[] = [
    { l: '가. 결성일', v: String(RPT_META.formedAt) },
    { l: '나. 존속기간', v: `${String(RPT_META.termFrom)} ~ ${String(RPT_META.termTo)} (${String(RPT_META.termYears)}년)` },
    { l: '다. 결성액', v: `${money(RPT_META.fundAmount, unit)} ${unit}` },
  ];
  return (
    <dl className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden m-0 mb-4" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className="grid bg-card" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className="m-0 flex items-center min-w-0" style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>{o.v}</dd>
        </div>
      ))}
    </dl>
  );
}
function MembersTable({ unit }: { unit: Unit }) {
  return (
    <Tbl caption="조합구성 — 조합원별 출자금액·출자비율" minWidth={560}>
      <thead><tr>
        {['NO', '조합원', '출자금액', '출자비율', '비고'].map((h) => (
          <th key={h} scope="col" className={TH} style={CELL}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {MEMBERS.map((m) => (
          <tr key={m.no}>
            <td className={`${TD} text-center`} style={CELL}>{m.no}</td>
            <td className={TD} style={CELL}>{m.name}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(m.won, unit)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{String(m.rate)} %</td>
            <td className={`${TD} text-center`} style={CELL}>{m.note}</td>
          </tr>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={2} className={`${TD} text-center`} style={CELL}>합 계</th>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(MEMBERS_TOTAL.won, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{String(MEMBERS_TOTAL.rate)} %</td>
          <td className={TD} style={CELL} />
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 2-가. 투자집행 업체현황(2단 헤더: 투자내역 colSpan 7 + 합계 rowSpan 2) ── */
const INV_SUB = [
  ['common', '보통주'], ['pref', '우선주'], ['cb', '전환사채'], ['bw', '신주인수권부사채'],
  ['project', '프로젝트'], ['etc', '기타'], ['sub', '합계'],
] as const;
function InvestTable({ unit }: { unit: Unit }) {
  return (
    <Tbl caption="투자집행 업체현황 — 투자내역은 2단 헤더" minWidth={1480}>
      <thead>
        <tr>
          {['NO', '투자기업', '대표자', '소재지', '제품', '투자시점'].map((h) => (
            <th key={h} rowSpan={2} scope="col" className={TH} style={CELL}>{h}</th>
          ))}
          <th colSpan={INV_SUB.length} scope="colgroup" className={TH} style={CELL}>투자내역</th>
          <th rowSpan={2} scope="col" className={TH} style={CELL}>합계</th>
        </tr>
        <tr>{INV_SUB.map(([k, l]) => <th key={k} scope="col" className={TH} style={{ ...CELL, fontWeight: 600 }}>{l}</th>)}</tr>
      </thead>
      <tbody>
        {INVEST.map((r) => (
          <tr key={r.no}>
            <td className={`${TD} text-center`} style={CELL}>{r.no}</td>
            <td className={TD} style={CELL}>{r.co}</td>
            <td className={`${TD} text-center`} style={CELL}>{r.ceo}</td>
            <td className={`${TD} text-center`} style={CELL}>{r.loc}</td>
            <td className={TD} style={{ ...CELL, minWidth: 220 }}>{r.product}</td>
            <td className={`${TD} text-center`} style={CELL}>{String(r.at)}</td>
            {INV_SUB.map(([k]) => <td key={k} className={`${TD} text-right tabular`} style={CELL}>{money(r[k], unit)}</td>)}
            <td className={`${TD} text-right tabular font-semibold`} style={CELL}>{money(r.total, unit)}</td>
          </tr>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={6} className={`${TD} text-center`} style={CELL}>합계</th>
          {INV_SUB.map(([k]) => <td key={k} className={`${TD} text-right tabular`} style={CELL}>{money(INVEST_TOTAL[k], unit)}</td>)}
          <td className={`${TD} text-right tabular`} style={CELL}>{money(INVEST_TOTAL.total, unit)}</td>
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 2-나. 사후관리 등급 + 등급분류기준 ── */
function GradeTable() {
  return (
    <Tbl caption="투자집행 업체 사후관리 등급" minWidth={1020}>
      <colgroup><col style={{ width: 52 }} /><col style={{ width: 132 }} /><col style={{ width: 104 }} /><col /><col style={{ width: 300 }} /></colgroup>
      <thead><tr>
        {['NO', '투자기업', '사후관리 등급', '등급부여 근거', '비고'].map((h) => (
          <th key={h} scope="col" className={TH} style={CELL}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {GRADES.map((g) => (
          <tr key={g.no}>
            <td className={`${TD} text-center align-top`} style={CELL}>{g.no}</td>
            <td className={`${TD} align-top`} style={CELL}>{g.co}</td>
            <td className={`${TD} text-center align-top`} style={CELL}><StatusBadge size="sm" tone={GRADE_TONE[g.grade] ?? 'info'} label={g.grade} dot={false} /></td>
            <td className={`${TD} align-top`} style={{ ...CELL, lineHeight: 1.6 }}>{g.basis}</td>
            <td className={`${TD} align-top`} style={{ ...CELL, lineHeight: 1.6 }}>{g.note}</td>
          </tr>
        ))}
      </tbody>
    </Tbl>
  );
}
function CriteriaTable() {
  return (
    <Tbl caption="사후관리 등급분류기준" minWidth={560}>
      <colgroup><col style={{ width: 80 }} /><col /></colgroup>
      <thead><tr>
        <th scope="col" className={TH} style={CELL}>등급</th>
        <th scope="col" className={TH} style={CELL}>구분기준</th>
      </tr></thead>
      <tbody>
        {GRADE_CRITERIA.map((c) => (
          <tr key={c.grade}>
            <th scope="row" className={`${TD} text-center font-bold align-top`} style={CELL}>{c.grade}</th>
            {/* 원문 <br> 줄바꿈은 pre-line으로 보존 */}
            <td className={`${TD} align-top`} style={{ ...CELL, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{c.desc}</td>
          </tr>
        ))}
      </tbody>
    </Tbl>
  );
}

/* ── 2-다. 회수내역 — 업체별 그룹(rowSpan은 legs 길이에서 파생) + 소계 + 합계 ── */
const REC_HEAD = ['NO', '투자기업', '투자시점', '투자금액', '회수완료 여부', '회수일자', '회수원금(A)', '회수금액(B)', '수익금액(B-A)', '감액금액', '회수 상태', '비고'];
function RecoveryTable({ unit }: { unit: Unit }) {
  return (
    <Tbl caption="회수내역 — 업체별 회수 다리와 소계" minWidth={1400}>
      <thead><tr>{REC_HEAD.map((h) => <th key={h} scope="col" className={TH} style={CELL}>{h}</th>)}</tr></thead>
      <tbody>
        {RECOVERY.map((g) => (
          <React.Fragment key={g.co + g.at}>
            {g.legs.map((L, i) => (
              <tr key={L.no}>
                <td className={`${TD} text-center`} style={CELL}>{L.no}</td>
                {i === 0 && (
                  <>
                    <td rowSpan={g.legs.length} className={`${TD} align-middle`} style={CELL}>{g.co}</td>
                    <td rowSpan={g.legs.length} className={`${TD} text-center align-middle`} style={CELL}>{String(g.at)}</td>
                    <td rowSpan={g.legs.length} className={`${TD} text-right tabular align-middle`} style={CELL}>{money(g.amount, unit)}</td>
                    <td rowSpan={g.legs.length} className={`${TD} text-center align-middle`} style={CELL}>{String(g.done)}</td>
                  </>
                )}
                <td className={`${TD} text-center`} style={CELL}>{String(L.date)}</td>
                <td className={`${TD} text-right tabular`} style={CELL}>{money(L.principal, unit)}</td>
                <td className={`${TD} text-right tabular`} style={CELL}>{money(L.recovered, unit)}</td>
                <td className={`${TD} text-right tabular`} style={CELL}>{money(L.profit, unit)}</td>
                <td className={`${TD} text-right tabular`} style={{ ...CELL, ...negStyle(L.impair) }}>{money(L.impair, unit)}</td>
                <td className={`${TD} text-center`} style={CELL}>{L.state}</td>
                <td className={`${TD} text-center`} style={CELL}>{L.note}</td>
              </tr>
            ))}
            <tr className={SUM_ROW}>
              <th scope="row" colSpan={3} className={`${TD} text-center`} style={CELL}>소 계</th>
              <td className={`${TD} text-right tabular`} style={CELL}>{money(g.amount, unit)}</td>
              <td colSpan={2} className={TD} style={CELL} />
              <td className={`${TD} text-right tabular`} style={CELL}>{money(g.sub.principal, unit)}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{money(g.sub.recovered, unit)}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{money(g.sub.profit, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ ...CELL, ...negStyle(g.sub.impair) }}>{money(g.sub.impair, unit)}</td>
              <td colSpan={2} className={TD} style={CELL} />
            </tr>
          </React.Fragment>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={3} className={`${TD} text-center`} style={CELL}>합 계</th>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(RECOVERY_TOTAL.amount, unit)}</td>
          <td colSpan={2} className={TD} style={CELL} />
          <td className={`${TD} text-right tabular`} style={CELL}>{money(RECOVERY_TOTAL.principal, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(RECOVERY_TOTAL.recovered, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(RECOVERY_TOTAL.profit, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(RECOVERY_TOTAL.impair, unit)}</td>
          <td colSpan={2} className={TD} style={CELL} />
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 2-라. 수시보고 내역 — 업체별 그룹(rowSpan은 items 길이에서 파생) ── */
function OccTable() {
  return (
    <Tbl caption="수시보고 내역 — 업체별 누적 요약" minWidth={720}>
      <colgroup><col style={{ width: 52 }} /><col style={{ width: 180 }} /><col style={{ width: 120 }} /><col /></colgroup>
      <thead><tr>
        {['NO', '투자기업', '보고일자', '수시보고 내역 요약'].map((h) => (
          <th key={h} scope="col" className={TH} style={CELL}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {OCC_NOTES.map((g) => g.items.map((it, i) => (
          <tr key={it.no}>
            <td className={`${TD} text-center`} style={CELL}>{it.no}</td>
            {i === 0 && <td rowSpan={g.items.length} className={`${TD} align-middle`} style={CELL}>{g.co}</td>}
            <td className={`${TD} text-center`} style={CELL}>{String(it.date)}</td>
            <td className={TD} style={CELL}>{it.summary}</td>
          </tr>
        )))}
      </tbody>
    </Tbl>
  );
}

/* ── 3. 예금내역 ── */
function DepositTable({ unit }: { unit: Unit }) {
  return (
    <Tbl caption="미투자자산 운용현황 — 예금내역" minWidth={720}>
      <thead><tr>
        {['NO', '계좌번호(기관)', '예금액', '만기일', '이자율', '비고'].map((h) => (
          <th key={h} scope="col" className={TH} style={CELL}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {DEPOSITS.map((d) => (
          <tr key={d.no}>
            <td className={`${TD} text-center`} style={CELL}>{d.no}</td>
            <td className={TD} style={CELL}>{d.account}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(d.won, unit)}</td>
            <td className={`${TD} text-center`} style={CELL}>{d.due ? String(d.due) : '-'}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{String(d.rate)} %</td>
            <td className={`${TD} text-center`} style={CELL}>{d.note}</td>
          </tr>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={2} className={`${TD} text-center`} style={CELL}>합 계</th>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(DEPOSITS_TOTAL, unit)}</td>
          <td colSpan={3} className={TD} style={CELL} />
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 4·5. 수입·비용 내역(동일 골격) ── */
function LedgerTable({ caption, rows, total, unit }: { caption: string; rows: typeof INCOME; total: number; unit: Unit }) {
  return (
    <Tbl caption={caption} minWidth={620}>
      <colgroup><col style={{ width: 52 }} /><col style={{ width: 140 }} /><col style={{ width: 180 }} /><col /></colgroup>
      <thead><tr>
        {['NO', '일자', '금액', '내역'].map((h) => <th key={h} scope="col" className={TH} style={CELL}>{h}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.no}>
            <td className={`${TD} text-center`} style={CELL}>{r.no}</td>
            <td className={`${TD} text-center`} style={CELL}>{String(r.date)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(r.won, unit)}</td>
            <td className={TD} style={CELL}>{r.note}</td>
          </tr>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={2} className={`${TD} text-center`} style={CELL}>합 계</th>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(total, unit)}</td>
          <td className={TD} style={CELL} />
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 6. 누적분배내역 ── */
function DistribTable({ unit }: { unit: Unit }) {
  return (
    <Tbl caption="누적분배내역" minWidth={780}>
      <thead><tr>
        {['NO', '일자', '분배원금', '분배수익', '분배총액', '잔여원금'].map((h) => (
          <th key={h} scope="col" className={TH} style={CELL}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {DISTRIB.map((d) => (
          <tr key={d.no}>
            <td className={`${TD} text-center`} style={CELL}>{d.no}</td>
            <td className={`${TD} text-center`} style={CELL}>{String(d.date)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(d.principal, unit)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(d.profit, unit)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(d.total, unit)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(d.rest, unit)}</td>
          </tr>
        ))}
        <tr className={SUM_ROW}>
          <th scope="row" colSpan={2} className={`${TD} text-center`} style={CELL}>합 계</th>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(DISTRIB_TOTAL.principal, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(DISTRIB_TOTAL.profit, unit)}</td>
          <td className={`${TD} text-right tabular`} style={CELL}>{money(DISTRIB_TOTAL.total, unit)}</td>
          <td className={TD} style={CELL} />
        </tr>
      </tbody>
    </Tbl>
  );
}

/* ── 팝업 본체 ── */
export function MonthlyReportModal({ onClose }: { onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  const un = `(단위: ${unit})`;
  const dlgRef = React.useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1100px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">월간보고</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">
              {RPT_META.fundName} · {String(RPT_META.asOf)} 현재
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <UnitSeg unit={unit} onChange={setUnit} />
          <Section title="1. 펀드개요" unitNote={un}>
            <FundOverview unit={unit} />
            <SubTitle>라. 조합구성</SubTitle>
            <MembersTable unit={unit} />
          </Section>
          <Section title="2. 투자 진행상황" unitNote={un}>
            <SubTitle>가. 투자집행 업체현황</SubTitle>
            <InvestTable unit={unit} />
            <p className="text-caption mt-2 mb-4" style={{ fontSize: 12 }}>{NOTES.invest}</p>
            <SubTitle>나. 투자집행 업체 사후관리 등급</SubTitle>
            <GradeTable />
            <p className="text-caption mt-2 mb-0" style={{ fontSize: 12 }}>{NOTES.grade}</p>
            <p className="text-caption mt-1 mb-3" style={{ fontSize: 12 }}>{NOTES.gradeAction}</p>
            <SubTitle>&lt;등급분류기준&gt;</SubTitle>
            <CriteriaTable />
            <div className="mt-4"><SubTitle>다. 회수내역</SubTitle></div>
            <RecoveryTable unit={unit} />
            <p className="text-caption mt-2 mb-4" style={{ fontSize: 12 }}>{NOTES.recovery}</p>
            <SubTitle>라. 수시보고 내역</SubTitle>
            <OccTable />
            <p className="text-caption mt-2 mb-0" style={{ fontSize: 12 }}>{NOTES.occ}</p>
            <p className="text-caption mt-1 mb-0" style={{ fontSize: 12 }}>{NOTES.occEtc}</p>
          </Section>
          <Section title="3. 미투자자산 운용현황" unitNote={un}>
            <SubTitle>예금내역</SubTitle>
            <DepositTable unit={unit} />
          </Section>
          <Section title="4. 수입내역 (일자별 발생내역)" unitNote={un}>
            <LedgerTable caption="수입내역 — 일자별 발생내역" rows={INCOME} total={INCOME_TOTAL} unit={unit} />
          </Section>
          <Section title="5. 비용내역 (일자별 발생내역)" unitNote={un} notes={[NOTES.expense]}>
            <LedgerTable caption="비용내역 — 일자별 발생내역" rows={EXPENSE} total={EXPENSE_TOTAL} unit={unit} />
          </Section>
          <Section title="6. 누적분배내역" unitNote={un}>
            <DistribTable unit={unit} />
          </Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
