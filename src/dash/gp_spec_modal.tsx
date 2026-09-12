/* 운용사 명세 — 읽기전용 명세 팝업 (출처: S1_02_운용사_명세.html, S1_04_수시보고.html이 그대로 이식한 공통 팝업)
   구성: ① 금액 단위 토글(원/백만원/억원) ② 자펀드 현황 표(10컬럼 + tfoot 합계)
        ③ 운용사 개요 kv 그리드 ④ 재무정보 표(14컬럼) ⑤ 푸터: 닫기
   골격·크롬(Dialog 880px · px-[46px] 정렬 · Section 헬퍼 · KvGrid)은 `subfund_spec_modal.tsx`(골드) 복사 관례.
   `MoreMenu`·`PageBtn`과 같은 로컬 복사다 — 공유 export 아님(apfs-spec-popup).

   ⚠ 한계(목업 원문 주석 그대로): S1_02의 실데이터가 인라이트벤처스(주) 1건뿐이라 어느 행의 운용사를
      눌러도 같은 회사가 표시된다. 실데이터 연동 시 `row`를 받아 조회하도록 바꾼다.
   ⚠ 출처 충실(apfs-spec-popup 규약 7): 자펀드 현황 tfoot 합계 25,100,000,000은 보이는 1개 행
      (6,500,000,000)과 맞지 않는다 — S1_02 원문이 여러 자펀드를 갖고 목업이 1건만 이식한 결과다.
      계산으로 고쳐 쓰지 않고 원문 값을 보존한다. */
import React, { useState } from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { fmt } from './aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';

const { Button, SegTabs, StatusBadge } = UI;

type Unit = '원' | '백만원' | '억원';
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };

/* 금액 → 단위 환산 문자열(마스킹 포함). 억/백만은 소수 2자리까지 */
function money(won: number | null, unit: Unit): string {
  if (won == null) return '-';
  const v = won / UNIT_DIV[unit];
  return mn(unit === '원' ? fmt(won) : v.toLocaleString(undefined, { maximumFractionDigits: 2 }));
}

/* ── 출처 데이터(S1_02 원문) ── */
const GP_NAME = '인라이트벤처스(주)';

type FundRow = { no: number; fn: string; acc: string; fd: string; rd: string; mat: string; liq: string | null; amt: number; moa: number; st: string };
const GP_FUNDS: FundRow[] = [
  { no: 1, fn: '인라이트8호 애그테크플러스펀드', acc: '농식품', fd: '2020-09-11', rd: '2020-09-11', mat: '2028-09-10', liq: null, amt: 6_500_000_000, moa: 5_000_000_000, st: '운영중' },
];
const GP_FUNDS_TOTAL = 25_100_000_000;   // ⚠ 출처 값 보존(위 파일 주석 참조) — GP_FUNDS 합계가 아니다

type OvItem = { l: string; v: string | null; full?: boolean };
const GP_OVERVIEW: OvItem[] = [
  { l: '운용사명', v: GP_NAME }, { l: '운용사종류', v: '벤처투자회사' },
  { l: '대표자1', v: '박문수' }, { l: '대표자2', v: null },
  { l: '대표자1 메일', v: 'munavi@enlightvc.com' }, { l: '대표자2 메일', v: null },
  { l: '사업자번호', v: '575-81-00764' }, { l: '법인등록번호', v: '170114-0011530' },
  { l: '홈페이지', v: 'www.enlightvc.com' }, { l: '지역구분', v: '지방' },
  { l: '설립일자', v: '2017-07-10' }, { l: '결산월', v: '12 월' },
  { l: '본점 주소', v: '(41585) 대구광역시 북구 호암로 51 메이커스페이스동 206호(침산동, 대구삼성창조캠퍼스)', full: true },
];

const GP_BASEYM = '2020-04';
/* 재무정보 1행(기준년월 + 14항목). 음수는 --danger-text */
const GP_FIN: [string, number][] = [
  ['유동자산', 2_503_372_986], ['비유동자산', 811_923_290], ['자산총계', 3_315_296_276],
  ['유동부채', 187_236_058], ['비유동부채', 980_988_084], ['부채총계', 1_168_224_142],
  ['자본금', 349_000_000], ['자본총계', 2_147_072_134],
  ['매출액', 1_314_563_418], ['매출원가', 772_765_299], ['일반관리비', 733_204_688],
  ['경상이익', -193_116_752], ['당기순이익', 540_087_936],
];

/* ── 프리미티브(골드 복사) ── */
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
function KvGrid({ items }: { items: OvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.v == null ? 'text-caption' : ''}`}
            style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {o.v == null ? '-' : <MT>{o.v}</MT>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center whitespace-nowrap';
const TD = 'border border-border whitespace-nowrap';
const negStyle = (v: number): React.CSSProperties | undefined => (v < 0 ? { color: 'var(--danger-text)' } : undefined);

/* 자펀드 현황 — 가로 스크롤은 자체 래퍼 책임(Card/Dialog가 overflow:hidden) */
function FundTable({ unit }: { unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 880 }}>
        <caption className="sr-only">운용사가 운용 중인 자펀드 현황</caption>
        <thead>
          <tr>
            {['NO', '자펀드', '계정구분', '결성일자', '등록일자', '만기일자', '청산일자', '결성액', '모펀드약정액', '상태'].map((h) => (
              <th key={h} scope="col" className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GP_FUNDS.map((f) => (
            <tr key={f.no}>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(String(f.no))}</td>
              <td className={TD} style={{ padding: '7px 8px', whiteSpace: 'normal' }}><MT>{f.fn}</MT></td>
              <td className={`${TD} text-center`} style={{ padding: '7px 8px' }}><MT>{f.acc}</MT></td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(f.fd)}</td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(f.rd)}</td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(f.mat)}</td>
              <td className={`${TD} text-center text-caption`} style={{ padding: '7px 8px' }}>{f.liq ? mn(f.liq) : '-'}</td>
              <td className={`${TD} text-right tabular font-semibold`} style={{ padding: '7px 8px' }}>{money(f.amt, unit)}</td>
              <td className={`${TD} text-right tabular font-semibold`} style={{ padding: '7px 8px' }}>{money(f.moa, unit)}</td>
              <td className={`${TD} text-center`} style={{ padding: '7px 8px' }}><StatusBadge tone="success" label={f.st} size="sm" dot={false} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--muted)' }}>
            <td className={`${TD} text-center font-bold`} colSpan={7} style={{ padding: '7px 8px' }}>합계</td>
            <td className={`${TD} text-right tabular font-bold`} style={{ padding: '7px 8px' }}>{money(GP_FUNDS_TOTAL, unit)}</td>
            <td className={`${TD} text-center`} style={{ padding: '7px 8px' }}>-</td>
            <td className={`${TD} text-center`} style={{ padding: '7px 8px' }}>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* 재무정보 — 기준년월 + 14항목 1행 */
function FinTable({ unit }: { unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 1100 }}>
        <caption className="sr-only">운용사 재무정보</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ padding: '7px 8px' }}>기준년월</th>
            {GP_FIN.map(([l]) => <th key={l} scope="col" className={TH} style={{ padding: '7px 8px' }}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(GP_BASEYM)}</td>
            {GP_FIN.map(([l, v]) => (
              <td key={l} className={`${TD} text-right tabular`} style={{ padding: '7px 8px', ...negStyle(v) }}>{money(v, unit)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function GpSpecModal({ onClose }: { onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">운용사 명세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{GP_NAME}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <UnitSeg unit={unit} onChange={setUnit} />
          <Section title="자펀드 현황" unitNote={`(단위: ${unit})`}><FundTable unit={unit} /></Section>
          <Section title="운용사 개요"><KvGrid items={GP_OVERVIEW} /></Section>
          <Section title="재무정보" unitNote={`(기준년월 ${mn(GP_BASEYM)} · 단위: ${unit})`}><FinTable unit={unit} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
