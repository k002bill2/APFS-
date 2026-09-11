/* 자펀드 명세 — 읽기전용 명세 팝업 (출처: S1_03_자펀드_명세.html, KRDS TO-BE 공통 팝업)
   구성: ① 금액 단위 토글(원/백만원/억원) ② 자펀드 개요 kv 그리드(37항목 + 문서 3슬롯)
        ③ 재무정보 요약(2단 헤더: 대차대조표 9 · 손익계산서 5) ④ 푸터: 재무제표 상세(중첩 팝업)·엑셀·닫기
   행(SubFundRow)에 있는 값은 행에서, 없는 항목(보수·담당자·재무)은 명세 데모값을 쓴다(백엔드 없음).
   섹션형 모달 규약(apfs-form-modal "확장" 절)과 동일 골격 — Radix Dialog 880px.

   ⚠ 2026-09-11 사용자 결정: 자펀드 관리(subfund_manage.tsx)에서 **언와이어**됨(툴바 '명세' 버튼·행 더블클릭 진입 제거).
      명세 팝업은 전 화면 opt-in 정책이다(investment_review_manage.tsx 상단 주석과 동일 결정).
      이 파일은 삭제하지 않고 유지한다 — `apfs-spec-popup`·`apfs-form-modal` 스킬의 골드 레퍼런스이며,
      다른 화면에서 명세 팝업이 필요해지면 이 골격을 재사용/재생성한다. 현재 import 하는 소비처는 없다. */
import React, { useState } from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { fmt } from './aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from './ui/sonner';
import type { SubFundRow } from './subfund_manage';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용

const { Button, SegTabs } = UI;

type Unit = '원' | '백만원' | '억원';
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };
const BASEYM = '2026-04';

/* 금액 → 단위 환산 문자열(마스킹 포함). 억/백만은 소수 2자리까지 */
function money(won: number | null, unit: Unit): string {
  if (won == null) return '-';
  const v = won / UNIT_DIV[unit];
  return mn(unit === '원' ? fmt(won) : v.toLocaleString(undefined, { maximumFractionDigits: 2 }));
}
const dash = (s: string | null | undefined) => (s == null || s === '' || s === '-' ? null : s);

/* 개요 항목 — { l, v } 텍스트 | { l, won } 금액 | full=2칸 */
type OvItem = { l: string; v?: string | null; won?: number | null; full?: boolean };
function buildOverview(r: SubFundRow): OvItem[] {
  const formed = r.stg === '결성';
  return [
    { l: '업무집행조합원1', v: dash(r.gp1) }, { l: '업무집행조합원2', v: dash(r.gp2) },
    { l: '조합명', v: r.fn, full: true },
    { l: '결성일', v: dash(r.fd) }, { l: '등록일', v: dash(r.rd) },
    { l: '만기예정일', v: dash(r.mat) }, { l: '청산예정일', v: dash(r.liq) },
    { l: '조합운영상태', v: dash(r.st) }, { l: '조합고유번호', v: formed ? '890-80-03566' : null },
    { l: '조합약정총액', won: r.c1 }, { l: '모태펀드약정액', won: r.c2 },
    { l: '조합납입총액', won: r.p1 }, { l: '모태펀드납입총액', won: r.p2 },
    { l: '1좌당출자금액', won: formed ? 1_000_000 : null }, { l: '결산월', v: formed ? '12월' : null },
    { l: '조합구분', v: dash(r.ctype) }, { l: '조합성격', v: dash(r.cg) },
    { l: '계정구분', v: '농식품투자계정' }, { l: '수탁기관', v: formed ? '농협' : null },
    { l: '납입방식', v: formed ? '분납' : null }, { l: '존속기간', v: r.dur == null ? null : `${r.dur}년` },
    { l: '기준수익률', v: r.rate == null ? null : `${r.rate}%` },
    { l: '관리보수', v: formed ? '조합 등록일~3년: 출자약정액의 연 2.5%, 3년 다음날~해산하는 날: 분기말 투자잔액의 연 2.5%' : null, full: true },
    { l: '성과보수', v: formed ? '기준수익률 초과수익의 20%' : null, full: true },
    { l: 'GP우선손실충당률', v: r.lgp == null ? null : `${r.lgp}%` }, { l: '모태우선손실충당률', v: dash(r.lmo) === 'N' ? '0%' : dash(r.lmo) },
    { l: '손실충당순서', v: null }, { l: '대표펀드매니저', v: null },
    { l: 'GP담당자 1', v: formed ? '유동기' : null }, { l: 'GP담당자 EMAIL 1', v: null },
    { l: 'GP담당자 2', v: null }, { l: 'GP담당자 EMAIL 2', v: null },
    { l: 'GP담당자 3', v: null }, { l: 'GP담당자 EMAIL 3', v: null },
    { l: '모태펀드담당자', v: '차경식' }, { l: '펀드담당자 EMAIL', v: 'chadeng' },
    { l: 'RISK관리담당자', v: '이성훈' }, { l: 'RISK담당자 EMAIL', v: 'leesh' },
  ];
}
const FILES: { l: string; f: string | null }[] = [
  { l: '사업계획서', f: null },
  { l: '조합규약서', f: '인라이트 농식품 청년기업 성장펀드 규약_251024.pdf' },
  { l: '결성총회의사록', f: null },
];

/* 재무정보 요약(2단 헤더) — 결성 조합만 값, 그 외 0.
   ⚠ 출처 명세(S1_03) 값을 그대로 옮김: 영업이익 20,101,573은 수익−비용(−56,573,707)과 맞지 않는다(출처 자체 불일치).
   실데이터 연동 시 계산식(영업이익=영업수익−영업비용) 확인 필요 — 목업 단계에선 출처 충실 원칙으로 보존. */
const FIN_BS: [string, number][] = [
  ['자산총계', 3_526_783_806], ['유동자산', 3_526_783_806], ['농식품(수산)투자자산', 0],
  ['비유동자산', 0], ['부채총계', 0], ['유동부채', 0], ['비유동부채', 0],
  ['자본총계', 3_526_783_806], ['자본-출자금', 3_630_000_000],
];
const FIN_IS: [string, number][] = [
  ['영업수익', 20_101_573], ['영업비용', 76_675_280], ['영업이익', 20_101_573],
  ['법인세비용', 0], ['당기순이익', -56_573_707],
];

/* 재무제표 상세 — g=그룹행, lv=들여쓰기 레벨, b=굵게, t=합계 */
type FsRow = { l: string; v?: number; g?: boolean; lv?: number; b?: boolean; t?: boolean };
const BS: FsRow[] = [
  { l: '자산', g: true },
  { l: '유동자산', v: 3_526_783_806, lv: 1, b: true },
  { l: '단기매매증권', v: 0, lv: 2 }, { l: '미수금', v: 0, lv: 2 }, { l: '미수수익', v: 0, lv: 2 }, { l: '선급금', v: 0, lv: 2 },
  { l: '선급비용', v: 0, lv: 2 }, { l: '선급법인세', v: 0, lv: 2 }, { l: '미수법인세환급액', v: 0, lv: 2 },
  { l: '농식품(수산)투자자산', v: 0, lv: 1, b: true },
  { l: '주목적투자자산', v: 0, lv: 2 }, { l: '비목적투자자산', v: 0, lv: 2 }, { l: '구조조정투자자산', v: 0, lv: 2 },
  { l: '비유동자산', v: 0, lv: 1, b: true }, { l: '기타자산', v: 0, lv: 2 },
  { l: '자산총계', v: 3_526_783_806, lv: 1, t: true },
  { l: '부채', g: true },
  { l: '유동부채', v: 0, lv: 1, b: true }, { l: '미지급배당금', v: 0, lv: 2 },
  { l: '비유동부채', v: 0, lv: 1, b: true }, { l: '기타부채', v: 0, lv: 2 },
  { l: '부채총계', v: 0, lv: 1, t: true },
  { l: '자본', g: true },
  { l: '자본-출자금', v: 3_630_000_000, lv: 1 }, { l: '자본잉여금', v: 0, lv: 1 }, { l: '자본조정', v: 0, lv: 1 },
  { l: '기타포괄손익누계액', v: 0, lv: 1 }, { l: '이익잉여금', v: -103_216_194, lv: 1 }, { l: '기타자본', v: 0, lv: 1 },
  { l: '자본총계', v: 3_526_783_806, lv: 1, t: true },
];
const IS: FsRow[] = [
  { l: '손익', g: true },
  { l: '영업수익', v: 20_101_573, lv: 1, b: true },
  { l: '투자수익', v: 0, lv: 2 }, { l: '운용투자수익', v: 0, lv: 3 }, { l: '구조조정투자수익', v: 0, lv: 3 },
  { l: '기타영업수익', v: 20_101_573, lv: 2 },
  { l: '영업비용', v: 76_675_280, lv: 1, b: true },
  { l: '관리보수', v: 75_625_000, lv: 2 }, { l: '성과보수', v: 0, lv: 2 }, { l: '수탁관리보수', v: 0, lv: 2 }, { l: '회계감사수수료', v: 0, lv: 2 },
  { l: '투자비용', v: 75_625_000, lv: 2 }, { l: '운용투자비용', v: 0, lv: 3 }, { l: '구조조정투자비용', v: 0, lv: 3 },
  { l: '기타의영업비용', v: 0, lv: 2 }, { l: '판매비와관리비', v: 1_050_280, lv: 2 },
  { l: '영업이익', v: 20_101_573, lv: 1, t: true },
  { l: '영업외수익', v: 0, lv: 1 }, { l: '영업외비용', v: 0, lv: 1 },
  { l: '법인세차감전순이익', v: 20_101_573, lv: 1, b: true }, { l: '법인세비용', v: 0, lv: 1 },
  { l: '당기순이익', v: -56_573_707, lv: 1, t: true }, { l: '손익총계', v: 80_406_292, lv: 1, t: true },
];

/* ── 프리미티브 ── */
function Section({ title, unitNote, children }: { title: string; unitNote?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">
        {title}{unitNote && <span className="ml-auto text-caption font-semibold" style={{ fontSize: 12.5 }}>{unitNote}</span>}
      </h3>
      {children}
    </section>
  );
}
function UnitSeg({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 mb-3">
      <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
      <SegTabs size="sm" value={unit} onChange={(v: string) => onChange(v as Unit)} options={(['원', '백만원', '억원'] as Unit[]).map((u) => ({ value: u, label: u }))} />
    </div>
  );
}
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
/* kv 그리드 — dt/dd 2열, full=행 전체. 값 없음 '-'(muted) */
function KvGrid({ items, unit }: { items: OvItem[]; unit: Unit }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => {
        const isMoney = 'won' in o;
        const empty = isMoney ? o.won == null : o.v == null;
        return (
          <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
            <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
            <dd className={`m-0 flex items-center min-w-0 ${isMoney ? 'justify-end tabular font-semibold' : ''} ${empty ? 'text-caption' : ''}`}
              style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
              {empty ? '-' : isMoney ? money(o.won!, unit) : <MT>{o.v}</MT>}
            </dd>
          </div>
        );
      })}
      {FILES.map((f) => (
        <div key={f.l} className="grid bg-card sm:col-span-2" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{f.l}</dt>
          <dd className={`m-0 flex items-center ${f.f ? '' : 'text-caption'}`} style={{ padding: '8px 12px', fontSize: 14 }}>
            {f.f ? (
              <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 border border-border bg-muted no-underline" style={{ padding: '5px 10px', borderRadius: 6, fontSize: 13, color: 'inherit' }}>
                <span className="font-extrabold" style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--danger)', color: 'var(--destructive-foreground)', fontSize: 10 }}>PDF</span>
                <MT>{f.f}</MT>
              </a>
            ) : '미첨부'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
const negStyle = (v: number): React.CSSProperties | undefined => (v < 0 ? { color: 'var(--danger-text)' } : undefined);

/* 재무정보 요약 — 2단 헤더 표(기준년월 rowSpan + 대차대조표 9 + 손익 5). 가로는 자체 스크롤 */
function FinGrid({ unit, zero }: { unit: Unit; zero: boolean }) {
  const th = 'border border-border bg-[color:var(--grid-header)] font-bold text-center whitespace-nowrap';
  const cols = [...FIN_BS, ...FIN_IS];
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ minWidth: 1180, fontSize: 13 }}>
        <caption className="sr-only">재무정보 요약 — 대차대조표·손익계산서 2단 헤더</caption>
        <thead>
          <tr>
            <th rowSpan={2} scope="col" className={th} style={{ padding: '6px 10px' }}>기준년월</th>
            <th colSpan={FIN_BS.length} scope="colgroup" className={th} style={{ padding: '6px 10px' }}>대차대조표</th>
            <th colSpan={FIN_IS.length} scope="colgroup" className={th} style={{ padding: '6px 10px' }}>손익계산서</th>
          </tr>
          <tr>{cols.map(([l]) => <th key={l} scope="col" className={th} style={{ padding: '6px 10px', fontWeight: 600 }}>{l}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border text-center" style={{ padding: '6px 10px' }}>{BASEYM}</td>
            {cols.map(([l, v]) => {
              const val = zero ? 0 : v;
              return <td key={l} className="border border-border text-right tabular" style={{ padding: '6px 10px', ...negStyle(val) }}>{money(val, unit)}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
/* 재무제표 상세 표 — 항목/금액 2열, 그룹행·들여쓰기·합계 강조 */
function FsTable({ rows, unit }: { rows: FsRow[]; unit: Unit }) {
  return (
    <table className="w-full border-collapse" style={{ minWidth: 380, fontSize: 14 }}>
      <thead><tr>
        <th scope="col" className="text-left font-bold bg-[color:var(--grid-header)] text-muted-foreground border-b border-border" style={{ padding: '6px 12px' }}>항목</th>
        <th scope="col" className="text-right font-bold bg-[color:var(--grid-header)] text-muted-foreground border-b border-border" style={{ padding: '6px 12px' }}>금액</th>
      </tr></thead>
      <tbody>
        {rows.map((r) => r.g ? (
          <tr key={r.l}><th scope="colgroup" colSpan={2} className="text-left font-extrabold bg-muted border-t border-b border-border" style={{ padding: '6px 12px' }}>{r.l}</th></tr>
        ) : (
          <tr key={r.l} className={r.t ? 'bg-muted' : ''}>
            <th scope="row" className="text-left border-b border-border" style={{ padding: '6px 12px', paddingLeft: 12 + (r.lv ?? 0) * 16, fontWeight: r.t ? 800 : r.b ? 700 : 500, color: (r.lv ?? 0) >= 2 ? 'var(--muted-foreground)' : undefined }}>{r.l}</th>
            <td className="text-right tabular border-b border-border" style={{ padding: '6px 12px', fontWeight: r.t ? 800 : 500, ...negStyle(r.v!) }}>{money(r.v!, unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── 팝업 2: 재무제표 상세(중첩) ── */
function FsDetailModal({ fn, unit: initUnit, onClose }: { fn: string; unit: Unit; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>(initUnit);
  const excel = () => {
    const line = (r: FsRow) => (r.g ? [r.l, ''] : ['  '.repeat(r.lv ?? 0) + r.l, r.v]);
    const ws = XLSX.utils.aoa_to_sheet([['대차대조표', '금액(원)'], ...BS.map(line), [], ['손익계산서', '금액(원)'], ...IS.map(line)]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '재무제표'); XLSX.writeFile(wb, `재무제표_${BASEYM}.xlsx`);
    toast.success('재무제표 엑셀을 내려받았습니다');
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">재무제표 상세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">기준년월 {BASEYM} · <MT>{fn}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <UnitSeg unit={unit} onChange={setUnit} />
          <Section title="대차대조표" unitNote={`(단위: ${unit})`}><FsTable rows={BS} unit={unit} /></Section>
          <Section title="손익계산서" unitNote={`(단위: ${unit})`}><FsTable rows={IS} unit={unit} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={excel}>엑셀</Button>
            <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── 팝업 1: 자펀드 명세 ── */
export function SubFundSpecModal({ row, onClose }: { row: SubFundRow; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  const [fsOpen, setFsOpen] = useState(false);
  const ov = buildOverview(row);
  const formed = row.stg === '결성';   // 미결성 조합은 재무정보 0
  const excel = () => {
    // ⚠ 화면(KvGrid)이 그리는 소스는 ov + FILES 둘 다. export도 둘 다 직렬화한다
    //   (한쪽만 넣으면 화면엔 보이는데 엑셀엔 빠지는 누락 발생 — 문서 3슬롯이 그 사례였음)
    const rows: (string | number)[][] = ov.map((o) => [o.l, 'won' in o ? (o.won ?? '') : (o.v ?? '')]);
    FILES.forEach((f) => rows.push([f.l, f.f ?? '미첨부']));
    rows.push([], ['기준년월', BASEYM], ...[...FIN_BS, ...FIN_IS].map(([l, v]) => [l, formed ? v : 0]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '자펀드 명세'); XLSX.writeFile(wb, `자펀드명세_${row.fn}.xlsx`);
    toast.success('자펀드 명세 엑셀을 내려받았습니다');
  };
  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        {/* 중첩 팝업이 열려 있을 때는 바깥 클릭이 부모까지 닫지 않도록 차단 */}
        <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => { if (fsOpen) e.preventDefault(); }}>
          <DialogHeader className="px-[46px]">
            <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
              <DialogTitle className="shrink-0">자펀드 명세</DialogTitle>
              <DialogDescription className="text-caption truncate min-w-0"><MT>{row.fn}</MT></DialogDescription>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto p-[46px]">
            <UnitSeg unit={unit} onChange={setUnit} />
            <Section title="자펀드 개요"><KvGrid items={ov} unit={unit} /></Section>
            <Section title="재무정보" unitNote={`(기준년월 ${BASEYM} · 단위: ${unit})`}><FinGrid unit={unit} zero={!formed} /></Section>
          </div>
          <DialogFooter className="px-[46px]">
            <div />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" leadingIcon="file" onClick={() => setFsOpen(true)}>재무제표 상세</Button>
              <Button variant="outline" size="sm" leadingIcon="download" onClick={excel}>엑셀</Button>
              <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {fsOpen && <FsDetailModal fn={row.fn} unit={unit} onClose={() => setFsOpen(false)} />}
    </>
  );
}
