/* 조합원정보 상세조회 — 읽기전용 팝업 (출처: S1_15_조합원정보등록.html의 `openDetail`, 원래 별도 화면이던
   S1_16_조합원정보_상세조회를 흡수한 팝업) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - `.modal wide` 1020px        → Radix `Dialog` `max-w-[1020px] max-h-[88vh]`(골격은 골드
                                    `general_meeting_detail_modal.tsx` 복사, 헤더 블록은 `custody_confirm_detail_modal.tsx` 판)
   - `.sec-h 조합원 정보` + `dl`  → `Section` + `KvGrid`(한글 가로 라벨 150px — apfs-spec-popup "읽기전용 명세(kv)" 규약)
   - `.sec-h 거래내역` + `.acts` → `Section actions`에 `UnitSeg`(원/백만원/억원, 기본 원 — 목업 `dt-unit-seg` 동형)
   - `table.detgrid` 11열 + tfoot → 수제 표(TH/TD/CELL 헬퍼 복사) + 소계·합계 2행
   - `.modal-foot 닫기·엑셀`      → 푸터 `닫기`(outline) · `엑셀`(outline, download). 목업은 toast 목업이지만
                                    우리는 실제 SheetJS 내보내기(관리 페이지 엑셀과 동일 규약, 마스크 게이트 포함)
   목업의 스크림·포커스 트랩·scroll lock은 Radix Dialog가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - **팝업 데이터는 S1_16 실데이터 1건 고정**이다 — 운용사·자펀드·계정구분·조합원구분·약정금액·거래내역은
     선택 행과 연결된 값이 아니다(백엔드 없음, 목업이 상세 예시 1건만 담고 있어 값을 창작하지 않는다).
   - 다만 **조합원·조합원유형은 선택 행 값**(`row.name`·`row.ptype`)을 쓴다. 목업은 '최상엽'/'개인' 리터럴이라
     어느 행을 열어도 같은 이름이 나오는데 그건 명백한 오표시다(같은 배치 `gp_contribution_detail_modal.tsx`
     동일 결정 — "우리는 선택 행의 값을 쓴다").
   - ⚠ 목업 tfoot 소계·합계의 **보유잔액이 0**이다(본문 마지막 행 100,000,000과 불일치). 합계 계산식 오류로
     보이지만 **출처 값을 그대로 둔다**(`custody_confirm_detail_modal.tsx` 선례 — 실데이터 연동 시 계산식 확인 항목).
   - 배분 관련 값은 목업이 전부 '-'(납입만 발생) — `null`로 두고 '-'(muted)로 표시한다.
   - 엑셀은 **단위 토글과 무관하게 원 단위 숫자**로 직렬화한다(브리프 지시). 화면 단위는 표시 전용.
   ⚠검토필요 마커 0건(목업 이 팝업엔 `data-rec`/`data-dat` 없음 — 이 화면의 1건은 수정 모달 식별번호 라벨). */
import React, { useState } from 'react';
import { UI } from './components';
import { mn, MT, useMask } from './mask';
import { fmt } from './aggrid_theme';   // 숫자 표기 SSOT(정수=콤마) — 자체 포매터 재구현 금지
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import type { MemberRow } from './member_info_manage';   // ⚠ type-only — 값 import는 런타임 순환(manage→detail→manage)

const { Button, StatusBadge, SegTabs } = UI;

/* ── 금액 단위(골드 `subfund_spec_modal.tsx` 복사) ── */
type Unit = '원' | '백만원' | '억원';
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };

/* 금액 → 단위 환산 문자열(마스킹 포함). 억/백만은 소수 2자리까지. null='-' */
function money(won: number | null, unit: Unit): string {
  if (won == null) return '-';
  const v = won / UNIT_DIV[unit];
  return mn(unit === '원' ? fmt(won) : v.toLocaleString(undefined, { maximumFractionDigits: 2 }));
}

/* ── 프리미티브(골드 복사 — 공유 export 아님) ── */
/* 목업 `.sec-h .acts`(margin-left:auto) → actions 슬롯. 제목은 h3(preflight:false라 mt-0 명시) */
function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      {/* 목업 `.sec-h`는 div라 seg 버튼을 품어도 되지만 우리 Section 제목은 h3다 → 제목과 액션을 형제로 둔다.
          h3 안에 버튼을 넣으면 헤딩 접근名에 '원 백만원 억원'이 섞인다(골드 subfund_spec_modal도 컨트롤은 헤딩 밖).
          h3 `m-0`은 load-bearing — preflight:false라 지우면 UA 마진이 되살아난다. */}
      <div className="flex items-center gap-2 border-b-2 border-border pb-2 mb-3">
        <h3 className="m-0 text-lg font-bold">{title}</h3>
        {actions && <span className="ml-auto flex items-center gap-2">{actions}</span>}
      </div>
      {children}
    </section>
  );
}

function UnitSeg({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <>
      <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
      <SegTabs size="sm" value={unit} onChange={(v: string) => onChange(v as Unit)}
        options={(['원', '백만원', '억원'] as Unit[]).map((u) => ({ value: u, label: u }))} />
    </>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };
/* 목업 `tfoot{border-top:2px solid ink}` → 합계행 공용 표기(형제 팝업 동형) */
const FOOT: React.CSSProperties = { ...CELL, borderTop: '2px solid var(--border-strong)' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/* ── 데이터(목업 `openDetail` 템플릿 값 그대로) ────────────────────────────────
   화면(JSX)과 엑셀이 **같은 배열**을 소비한다 — 한쪽에만 값을 적으면 화면=엑셀 불변식이 깨진다. */

/* kv 항목 — { v } 텍스트 | { won } 금액 | badge='info'(농식품)·'muted'(LP) | full=2칸 */
type KvItem = { l: string; v?: string; won?: number; full?: boolean; badge?: 'info' | 'muted' };

/* 조합원 정보 7항목 — 목업 dl 순서 그대로(끝의 `<dt>&nbsp;</dt><dd></dd>`는 2열 채움용 빈칸이라 이식하지 않는다).
   조합원·조합원유형만 선택 행 값, 나머지는 S1_16 실데이터 상수(파일 상단 '한계' 참조). */
const buildKv = (row: MemberRow): KvItem[] => [
  { l: '운용사', v: '인라이트벤처스(주)' },
  { l: '자펀드', v: '인라이트 애그테크클러스터펀드 2호', full: true },
  { l: '계정구분', v: '농식품', badge: 'info' },
  { l: '조합원', v: row.name },
  { l: '조합원구분', v: 'LP', badge: 'muted' },
  { l: '조합원유형', v: row.ptype },
  { l: '조합원약정금액', won: 100_000_000 },
];

/* 거래내역 — 금액 8열 순서: 납입금액·원금배분액·수익배분액·우선손실 충당액·기타배분액(이자 등)·원천징수세액·실 배분액·보유잔액.
   `null` = 목업의 '-'(배분 미발생) */
const TX_HEAD = ['거래구분', '상세구분', '거래일자', '납입금액', '원금배분액', '수익배분액', '우선손실 충당액', '기타배분액(이자 등)', '원천징수세액', '실 배분액', '보유잔액'];
type TxRow = { kind: string; sub: string; date: string; vals: (number | null)[] };
const TX_ROWS: TxRow[] = [
  { kind: '출자', sub: '설립출자', date: '2022-09-30', vals: [50_000_000, null, null, null, null, null, null, 50_000_000] },
  { kind: '출자', sub: '추가출자', date: '2023-11-17', vals: [50_000_000, null, null, null, null, null, null, 100_000_000] },
];
/* tfoot 소계·합계 — 목업 값 그대로(보유잔액 0은 본문과 불일치, 파일 상단 '한계' 참조). sub=소계(약한 톤) */
type FootRow = { l: string; vals: number[]; sub?: boolean };
const FOOT_ROWS: FootRow[] = [
  { l: '소계', vals: [100_000_000, 0, 0, 0, 0, 0, 0, 0], sub: true },
  { l: '합계', vals: [100_000_000, 0, 0, 0, 0, 0, 0, 0] },
];

/* ── 조합원 정보 kv 그리드 ── */
function KvGrid({ items, unit }: { items: KvItem[]; unit: Unit }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => {
        const isMoney = o.won != null;
        return (
          <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
            <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
            <dd className={`m-0 flex items-center min-w-0 ${isMoney ? 'justify-end tabular font-semibold' : ''}`}
              style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
              {isMoney ? money(o.won!, unit) : <KvValue item={o} />}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* kv 값 — 배지(계정구분·조합원구분)는 분류 표식이라 비마스킹("축은 두고 데이터는 가린다").
   ⚠ 'LP'는 중립 톤이라 StatusBadge에 대응 tone이 없다 → 같은 기하(md)의 muted 칩을 직접 만든다. */
function KvValue({ item }: { item: KvItem }) {
  if (item.badge === 'info') return <StatusBadge tone="info" label={item.v} size="md" dot={false} />;
  if (item.badge === 'muted') {
    return <span className="inline-flex items-center rounded-[7px] px-[9px] py-[3px] text-xs font-bold bg-muted text-muted-foreground">{item.v}</span>;
  }
  return <MT>{item.v}</MT>;
}

/* ── 거래내역 표 ── */
function TxTable({ unit }: { unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 1180 }}>
        {/* 목업 caption(visually-hidden) 원문 그대로 */}
        <caption className="sr-only">조합원 거래내역 — 출자·배분·잔액. 배분 관련 값은 아직 발생하지 않아 '-'로 표시(납입 전제)</caption>
        <thead>
          <tr>
            {TX_HEAD.map((h) => <th key={h} scope="col" className={TH} style={CELL}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {TX_ROWS.map((r) => (
            <tr key={r.sub}>
              {/* 거래구분은 분류 배지(목업 `tag b`) — 비마스킹 */}
              <td className={`${TD} text-center`} style={CELL}><StatusBadge tone="info" label={r.kind} size="md" dot={false} /></td>
              <td className={`${TD} text-center`} style={CELL}><MT>{r.sub}</MT></td>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(r.date)}</td>
              {r.vals.map((v, i) => (
                <td key={TX_HEAD[i + 3]} className={`${TD} tabular ${v == null ? 'text-center text-caption' : 'text-right'}`} style={CELL}>
                  {money(v, unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {FOOT_ROWS.map((f) => {
            /* 목업 tfoot: 소계는 약한 톤+1px 윗선(`tr.sub`), 합계는 진한 톤+2px 윗선.
               ⚠ 톤 차이는 `bg-muted/50` 같은 opacity 모디파이어로 만들 수 없다(토큰색엔 alpha 주입 불가) → color-mix. */
            const st: React.CSSProperties = f.sub
              ? { ...CELL, borderTop: '1px solid var(--border-strong)', background: 'color-mix(in srgb,var(--muted) 55%,transparent)' }
              : FOOT;
            return (
              <tr key={f.l} className={`font-bold ${f.sub ? '' : 'bg-muted'}`}>
                <th scope="row" colSpan={3} className={`${TD} text-center`} style={st}>{f.l}</th>
                {f.vals.map((v, i) => (
                  <td key={TX_HEAD[i + 3]} className={`${TD} text-right tabular`} style={st}>{money(v, unit)}</td>
                ))}
              </tr>
            );
          })}
        </tfoot>
      </table>
    </div>
  );
}

export function MemberInfoDetailModal({ row, onClose }: { row: MemberRow; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  const masked = useMask();
  const kv = buildKv(row);

  /* Excel(.xlsx) — kv 7행 + 빈 줄 + 거래내역 헤더/본문 2행/소계/합계.
     화면이 그리는 배열(kv·TX_ROWS·FOOT_ROWS) 그대로 직렬화한다(화면=엑셀 불변식).
     숫자는 **원 단위 고정**(표시 단위와 무관, 파일 상단 '한계'). 마스크 ON이면 숫자 0·텍스트 ''. */
  const excel = () => {
    const num = (v: number | null) => (v == null ? (masked ? '' : '-') : masked ? 0 : v);
    const txt = (v: string) => (masked ? '' : v);
    const aoa: (string | number)[][] = [
      ...kv.map((o) => [o.l, o.won != null ? (masked ? 0 : o.won) : txt(o.v ?? '')]),
      [],
      TX_HEAD,
      ...TX_ROWS.map((r) => [txt(r.kind), txt(r.sub), txt(r.date), ...r.vals.map(num)]),
      ...FOOT_ROWS.map((f) => [f.l, '', '', ...f.vals.map((v) => (masked ? 0 : v))]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = TX_HEAD.map((_, i) => ({ wch: i < 3 ? 16 : 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '조합원정보 상세조회');
    XLSX.writeFile(wb, '조합원정보_상세조회.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1020px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">조합원정보 상세조회</DialogTitle>
            {/* Radix Description은 <p> — preflight:false라 UA 기본 마진이 살아 있어 m-0을 명시한다(공용 dialog.tsx는 불변) */}
            <DialogDescription className="m-0 text-caption truncate min-w-0"><MT>{row.name}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Section title="조합원 정보"><KvGrid items={kv} unit={unit} /></Section>
          <Section title="거래내역" actions={<UnitSeg unit={unit} onChange={setUnit} />}><TxTable unit={unit} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="outline" size="sm" leadingIcon="download" onClick={excel}>엑셀</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
