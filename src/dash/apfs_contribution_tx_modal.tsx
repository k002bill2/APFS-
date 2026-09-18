/* 배분거래등록/수정 · 출자거래 수정 — (농금원)출자배분관리 그리드에서 뜨는 편집 팝업 2종.
   출처: S1_21__농금원_출자배분관리.html의 `openTxModal(gi,mode)` / `openInvestModal()` → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - `.scrim` + `.modal`      → Radix `Dialog` `max-w-[1100px] max-h-[88vh]`(스크림·포커스 트랩·scroll lock은 Radix가 소유)
   - `.msec` frow 4개(readonly) → `KvGrid`(150px 라벨, apfs-form-modal "읽기전용 명세(kv) 그리드" 규약)
   - `.sublabel` + `.mtable`  → `Section` + 수제 표(`tableLayout:'fixed'` + `overflow-x-auto` 래퍼 + minWidth)
   - `.ci` 숫자 입력          → 로컬 `AmountInput`(SchemaField `base`와 같은 34px 규격을 복제 —
                                SchemaField `number`는 `<input type=number>`라 콤마·blur 정규화를 못 쓴다)
   - `.ci` select/텍스트      → 로컬 `SelectInput`/`TextInput`(표 셀에는 보이는 라벨이 없어 개별 `aria-label`이 필요한데
                                SchemaField는 aria-label을 받지 않는다)
   - tfoot 합계               → 목업 `recalcModal`과 동일하게 **입력값에서 실시간 재계산**
   - `#tx-save`/`#iv-save`    → 저장(닫기 + toast). 목업 동일.

   한계·가정(결정 기록)
   - **실 입금액 = 원금+수익+성과보수+우선손실충당+기타+원천징수** (목업 `recalcModal`의 net 식 그대로).
     GROUPS의 기존 netin 값이 이 식과 전부 일치함을 확인하고 저장 시 재계산한다(값 창작 아님).
   - **`chk` 편집 도메인이 행 도메인보다 넓다**: 표 select는 일치/확인/**미확인** 3값인데 행 타입(`TxMember['chk']`)은
     `'' | '일치' | '확인'`이다(그리드에서 `''`가 '-' 분기를 담당). 행 타입을 넓히지 않고 모달 안에서만
     `'' ↔ '미확인'`으로 매핑한다.
   - **마스크 경계**: 입력 컨트롤(`<input>`)의 값은 가릴 수 없다 → 입력값과 그로부터 파생되는 실 입금액·합계는
     비마스킹이다. 읽기전용 셀(조합원·약정금액·수탁납입금액 등)과 상단 kv는 규약대로 `<MT>`/`mn()`으로 가린다.
   - **출자거래 수정은 그리드와 무관한 별 자펀드 데이터**(목업 `INVEST_GROUP` — 나이스투자파트너스 8명).
     사용자 제공 실 화면 캡처 기반이라 목록의 어느 그룹과도 연결되지 않는다 → 저장은 로컬 편집만 되돌리고 닫는다.
   - 목업 tfoot의 납입금액 합계는 입력이 바뀌어도 갱신되지 않는데(이벤트 미배선), 명백한 누락이라 실시간 합계로 고친다.
   ⚠검토필요 마커 0건(이 파일 범위의 목업 원문에 `data-rec`/`data-dat` 없음 — 2건은 모두 검색박스라 목록 파일). */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { Icon } from './icons';
import { toast } from './ui/sonner';
import type { TxGroup, TxMember } from './apfs_contribution_manage';

const { Button, StatusBadge } = UI;
const { useState, useMemo } = React;

/* ──────────────────────────────
   숫자 문자열 변환 — 목업 `toNum`/`toFmt` 그대로(콤마·음수 허용, 정수만)
────────────────────────────── */
const toNum = (v: string): number => {
  const s = String(v).replace(/[^0-9-]/g, '');
  return s === '' || s === '-' ? 0 : parseInt(s, 10) || 0;
};
const toFmt = (n: number): string => (n < 0 ? '-' : '') + Math.abs(Number(n) || 0).toLocaleString('en-US');

/* ──────────────────────────────
   공통 프리미티브 — 골드(`gp_contribution_detail_modal.tsx`·`subfund_form_modal.tsx`)에서 복사. 공유 export 아님
────────────────────────────── */
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
const CELL: React.CSSProperties = { padding: '6px 8px' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/** `numeric`(날짜·금액) → `mn()` · `raw`(분류 라벨 = 축) → 그대로 · 그 외 텍스트 → `<MT>` */
type KvItem = { l: string; v: string; numeric?: boolean; raw?: boolean };

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0 mb-5" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className="grid bg-card" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.v ? '' : 'text-caption'}`} style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {!o.v ? '-' : o.raw ? o.v : o.numeric ? mn(o.v) : <MT>{o.v}</MT>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 조합원구분(GP/LP/SP) 칩 — 목업 `.tag.n`(중립 회색). Tone에 중립 톤이 없어 직접 만든다
   (기하는 StatusBadge size="lg"와 동일). 분류 표식이라 마스킹하지 않는다 */
function GradeChip({ v }: { v: string }) {
  return <span className="inline-flex items-center rounded-[7px] bg-muted px-[10px] py-[4px] text-[13px] font-bold leading-tight text-muted-foreground">{v}</span>;
}

const dash = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* 표 안 컨트롤 — SchemaField `base`(34px 규격)를 복제한다. 포커스 단서도 같은 방식(테두리 --ring + 글로우).
   ⚠ `fontFamily`(longhand)로 패밀리만 상속 — `font` 단축 속성은 fontSize까지 되돌린다 */
const controlBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: 14, lineHeight: '20px', height: 34, minHeight: 34,
  fontFamily: 'inherit', border: '1px solid var(--border-strong)', borderRadius: 9,
  background: 'var(--card)', color: 'var(--foreground)', transition: 'border-color .12s, box-shadow .12s',
};
const focusStyle: React.CSSProperties = { borderColor: 'var(--ring)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--ring) 22%,transparent)' };

/** 금액 입력 — 입력 중에는 자유 문자열, blur에서 `toFmt(toNum(v))`로 정규화(목업 `.ci` 동작) */
function AmountInput({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text" inputMode="numeric" aria-label={ariaLabel} value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onChange(toFmt(toNum(value))); }}
      className="tabular"
      style={{ ...controlBase, textAlign: 'right', ...(focused ? focusStyle : null) }}
    />
  );
}

function TextInput({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text" aria-label={ariaLabel} value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...controlBase, ...(focused ? focusStyle : null) }}
    />
  );
}

/* native select 화살표는 Chrome UA가 오른쪽 경계에 고정해 padding으로 못 움직인다 →
   appearance:none으로 지우고 lucide chevron을 오버레이(pointer-events:none이라 클릭은 통과) */
function SelectInput({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: readonly string[]; ariaLabel: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...controlBase, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: 30, ...(focused ? focusStyle : null) }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted-foreground)' }} />
    </div>
  );
}

/* ──────────────────────────────
   배분거래등록 / 배분거래수정
────────────────────────────── */
/** 표 select의 도메인 — 행 타입(`'' | '일치' | '확인'`)보다 넓다(파일 상단 '한계') */
type ChkSel = '일치' | '확인' | '미확인';
const CHK_OPTIONS: readonly ChkSel[] = ['일치', '확인', '미확인'] as const;
const toSel = (c: TxMember['chk']): ChkSel => (c === '' ? '미확인' : c);
const fromSel = (s: ChkSel): TxMember['chk'] => (s === '미확인' ? '' : s);

/** 편집 중 상태 — 금액은 콤마 문자열로 들고 있다가(목업 `.ci` 동일) 저장 시 숫자로 되돌린다 */
interface DistDraft { prin: string; prof: string; perf: string; prio: string; etc: string; wht: string; chk: ChkSel; memo: string }
const AMOUNT_FIELDS = ['prin', 'prof', 'perf', 'prio', 'etc', 'wht'] as const;
type AmountField = (typeof AMOUNT_FIELDS)[number];

const DIST_HEADERS: Record<AmountField, string> = {
  prin: '원금배분액', prof: '수익배분액', perf: '성과보수액',
  prio: '우선손실충당액', etc: '기타배분액(이자 등)', wht: '원천징수세액',
};
/* 컬럼 폭 — 목업 `.mtable` 열 순서 그대로(그리드와 달리 우선손실충당액이 기타배분액 앞) */
const DIST_WIDTHS: Record<AmountField, number> = { prin: 112, prof: 112, perf: 104, prio: 116, etc: 128, wht: 112 };

const toDraft = (m: TxMember): DistDraft => ({
  prin: toFmt(m.prin), prof: toFmt(m.prof), perf: toFmt(m.perf),
  prio: toFmt(m.prio), etc: toFmt(m.etc), wht: toFmt(m.wht),
  chk: toSel(m.chk), memo: m.memo,
});

/** 수탁데이터 확인검토 — register 모드는 표시 전용(목업 `chkField(s,false)`) */
function ChkDisplay({ v }: { v: TxMember['chk'] }) {
  if (v === '일치') return <StatusBadge tone="success" label="일치" size="lg" dot={false} />;
  if (v === '확인') return <StatusBadge tone="info" label="확인대상" size="lg" dot={false} />;
  return dash;
}

export function DistTxModal({ group, mode, onSave, onClose }: {
  group: TxGroup; mode: 'register' | 'edit'; onSave: (members: TxMember[]) => void; onClose: () => void;
}) {
  const editable = mode === 'edit';
  const [drafts, setDrafts] = useState<DistDraft[]>(() => group.members.map(toDraft));
  const set = (i: number, k: keyof DistDraft) => (v: string) =>
    setDrafts((p) => p.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  /* 실 입금액(행) + tfoot 합계 — 목업 `recalcModal` 그대로 입력값에서 실시간 재계산 */
  const nums = useMemo(() => drafts.map((d) => {
    const v = Object.fromEntries(AMOUNT_FIELDS.map((k) => [k, toNum(d[k])])) as Record<AmountField, number>;
    return { ...v, net: AMOUNT_FIELDS.reduce((a, k) => a + v[k], 0) };
  }), [drafts]);
  const sums = useMemo(() => {
    const base = Object.fromEntries(AMOUNT_FIELDS.map((k) => [k, 0])) as Record<AmountField, number>;
    return nums.reduce((a, n) => {
      AMOUNT_FIELDS.forEach((k) => { a[k] += n[k]; });
      a.net += n.net;
      return a;
    }, { ...base, net: 0 });
  }, [nums]);

  const title = editable ? '배분거래수정' : '배분거래등록';
  const kv: KvItem[] = [
    { l: '운용사', v: group.un },
    { l: '자펀드', v: group.fn },
    /* 거래구분은 분류 라벨(축)이라 마스킹 대상이 아니다 */
    { l: '거래구분', v: `${group.tx} / ${group.dtx}`, raw: true },
    { l: '거래일자', v: group.td, numeric: true },
  ];

  const save = () => {
    /* 불변 갱신 — 편집하지 않는 필드(mem·mg·mc·pay·bal·red)는 그대로 두고 6개 금액 + netin + chk + memo만 바꾼다 */
    const next: TxMember[] = group.members.map((m, i) => ({
      ...m,
      prin: nums[i].prin, prof: nums[i].prof, perf: nums[i].perf,
      prio: nums[i].prio, etc: nums[i].etc, wht: nums[i].wht,
      netin: nums[i].net,
      chk: editable ? fromSel(drafts[i].chk) : m.chk,
      memo: drafts[i].memo,
    }));
    onSave(next);
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1100px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{title}</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{group.fn}</MT> · {mn(group.td)}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <KvGrid items={kv} />
          <Section title="조합원별 배분내역">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 1180, tableLayout: 'fixed' }}>
                <caption className="sr-only">조합원별 배분내역 입력 — 금액 6개 항목을 고치면 실 입금액과 합계가 다시 계산됩니다.</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH} style={{ ...CELL, width: 44 }}>NO</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 140 }}>조합원</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 74 }}>조합원구분</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 118 }}>조합원약정금액</th>
                    {AMOUNT_FIELDS.map((k) => (
                      <th key={k} scope="col" className={TH} style={{ ...CELL, width: DIST_WIDTHS[k] }}>{DIST_HEADERS[k]}</th>
                    ))}
                    <th scope="col" className={TH} style={{ ...CELL, width: 118 }}>실 입금액</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 116 }}>수탁데이터 확인검토</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 150 }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((m, i) => (
                    <tr key={m.mem + i}>
                      {/* NO는 축(순번)이라 마스킹하지 않는다 */}
                      <td className={`${TD} text-center tabular`} style={CELL}>{i + 1}</td>
                      <td className={TD} style={CELL}><MT>{m.mem}</MT></td>
                      <td className={`${TD} text-center`} style={CELL}><GradeChip v={m.mg} /></td>
                      <td className={`${TD} text-right tabular`} style={CELL}>{mn(toFmt(m.mc))}</td>
                      {AMOUNT_FIELDS.map((k) => (
                        <td key={k} className={TD} style={CELL}>
                          <AmountInput value={drafts[i][k]} onChange={set(i, k)} ariaLabel={`${m.mem} ${DIST_HEADERS[k]}`} />
                        </td>
                      ))}
                      {/* 실 입금액 — 입력에서 파생되므로 비마스킹(파일 상단 '마스크 경계') */}
                      <td className={`${TD} text-right tabular font-semibold`} style={CELL}>{toFmt(nums[i].net)}</td>
                      <td className={`${TD} text-center`} style={CELL}>
                        {editable
                          ? <SelectInput value={drafts[i].chk} onChange={set(i, 'chk')} options={CHK_OPTIONS} ariaLabel={`${m.mem} 수탁데이터 확인검토`} />
                          : <ChkDisplay v={m.chk} />}
                      </td>
                      <td className={TD} style={CELL}>
                        <TextInput value={drafts[i].memo} onChange={set(i, 'memo')} ariaLabel={`${m.mem} 비고`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 합계행 — 목업 tfoot(6개 금액 합 + 실 입금액 합, 확인검토·비고는 '-') */}
                <tfoot>
                  <tr className="bg-muted font-bold">
                    <td className={`${TD} text-center`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }} colSpan={4}>합계</td>
                    {AMOUNT_FIELDS.map((k) => (
                      <td key={k} className={`${TD} text-right tabular`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>{toFmt(sums[k])}</td>
                    ))}
                    <td className={`${TD} text-right tabular`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>{toFmt(sums.net)}</td>
                    <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                    <td className={`${TD} text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="sm" onClick={save}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────
   출자거래 수정 — 목업 `INVEST_GROUP` 값 그대로(사용자 제공 실 화면 캡처 기반, 목록 그룹과 무관)
────────────────────────────── */
interface InvestMember {
  mem: string; id: string; mg: string; mtype: string;
  commit: number; cpct: number; pay: number; ppct: number;
  custody: number | null; chk: string | null; memo: string;
}
const INVEST_GROUP: { gp: string; fund: string; tx: string; dtx: string; td: string; members: InvestMember[] } = {
  gp: '나이스투자파트너스(주)', fund: '[농식품] 엔에이치나이스농식품투자조합1호', tx: '출자', dtx: '추가출자', td: '2025-11-28',
  members: [
    { mem: '농식품모태펀드', id: '107-80-10247', mg: 'SP', mtype: '모태펀드', commit: 15_000_000_000, cpct: 30, pay: 2_100_000_000, ppct: 30, custody: 2_100_000_000, chk: '일치', memo: '' },
    { mem: '나이스투자파트너스', id: '104-86-11007', mg: 'GP', mtype: '신기술사', commit: 2_000_000_000, cpct: 4, pay: 280_000_000, ppct: 4, custody: null, chk: null, memo: '' },
    { mem: '농협은행', id: '104-86-39742', mg: 'GP', mtype: '은행', commit: 25_000_000_000, cpct: 50, pay: 3_500_000_000, ppct: 50, custody: null, chk: null, memo: '' },
    { mem: 'KIS정보통신', id: '116-81-43939', mg: 'LP', mtype: '일반법인', commit: 2_500_000_000, cpct: 5, pay: 350_000_000, ppct: 5, custody: null, chk: null, memo: '' },
    { mem: '나이스디앤비', id: '107-86-24874', mg: 'LP', mtype: '일반법인', commit: 2_500_000_000, cpct: 5, pay: 350_000_000, ppct: 5, custody: null, chk: null, memo: '' },
    { mem: '나이스디앤알', id: '107-87-08207', mg: 'LP', mtype: '일반법인', commit: 2_000_000_000, cpct: 4, pay: 280_000_000, ppct: 4, custody: null, chk: null, memo: '' },
    { mem: '나이스디앤에스', id: '339-86-03990', mg: 'LP', mtype: '일반법인', commit: 0, cpct: 0, pay: 0, ppct: 0, custody: null, chk: null, memo: '' },
    { mem: '나이스평가정보', id: '116-81-15020', mg: 'LP', mtype: '일반법인', commit: 1_000_000_000, cpct: 2, pay: 140_000_000, ppct: 2, custody: null, chk: null, memo: '' },
  ],
};
/* 목업 select는 옵션 3개 중 '일치'가 늘 선택돼 있다(값이 있는 행만 렌더) */
const INVEST_CHK_OPTIONS: readonly string[] = ['일치', '확인', '미확인'] as const;

interface InvestDraft { pay: string; chk: string; memo: string }

export function InvestTxModal({ onClose }: { onClose: () => void }) {
  const [drafts, setDrafts] = useState<InvestDraft[]>(() =>
    INVEST_GROUP.members.map((m) => ({ pay: toFmt(m.pay), chk: m.chk ?? '', memo: m.memo })));
  const set = (i: number, k: keyof InvestDraft) => (v: string) =>
    setDrafts((p) => p.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  const sumCommit = useMemo(() => INVEST_GROUP.members.reduce((a, m) => a + m.commit, 0), []);
  /* 목업은 tfoot 납입 합계를 최초 1회만 계산하고 갱신하지 않는다 — 실시간 합계로 고쳤다(파일 상단 '한계') */
  const sumPay = useMemo(() => drafts.reduce((a, d) => a + toNum(d.pay), 0), [drafts]);

  const kv: KvItem[] = [
    { l: '운용사', v: INVEST_GROUP.gp },
    { l: '자펀드', v: INVEST_GROUP.fund },
    { l: '거래구분', v: `${INVEST_GROUP.tx} / ${INVEST_GROUP.dtx}`, raw: true },
    { l: '거래일자', v: INVEST_GROUP.td, numeric: true },
  ];

  /* 저장 — 이 팝업의 데이터는 목록 그리드와 연결돼 있지 않다(별 자펀드). 닫고 알림만 낸다 */
  const save = () => { toast.success('저장되었습니다 (목업)'); onClose(); };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1100px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">출자거래 수정</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{INVEST_GROUP.fund}</MT> · {mn(INVEST_GROUP.td)}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <KvGrid items={kv} />
          <Section title="조합원별 출자내역">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 1040, tableLayout: 'fixed' }}>
                <caption className="sr-only">조합원별 출자내역 입력 — 납입금액·데이터확인·비고를 고칩니다.</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH} style={{ ...CELL, width: 44 }}>NO</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 190 }}>조합원</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 74 }}>조합원구분</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 90 }}>조합원유형</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 130 }}>조합원약정금액</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 82 }}>약정지분</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 130 }}>납입금액</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 82 }}>납입지분</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 130 }}>수탁납입금액</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 116 }}>데이터확인</th>
                    <th scope="col" className={TH} style={{ ...CELL, width: 150 }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {INVEST_GROUP.members.map((m, i) => (
                    <tr key={m.id}>
                      <td className={`${TD} text-center tabular`} style={CELL}>{i + 1}</td>
                      {/* 조합원명 + 사업자번호 — 둘 다 식별 정보라 <MT> */}
                      <td className={TD} style={CELL}><MT>{`${m.mem} (${m.id})`}</MT></td>
                      <td className={`${TD} text-center`} style={CELL}><GradeChip v={m.mg} /></td>
                      <td className={`${TD} text-center`} style={CELL}><MT>{m.mtype}</MT></td>
                      <td className={`${TD} text-right tabular`} style={CELL}>{mn(toFmt(m.commit))}</td>
                      <td className={`${TD} text-center tabular`} style={CELL}>{mn(String(m.cpct))}</td>
                      <td className={TD} style={CELL}>
                        <AmountInput value={drafts[i].pay} onChange={set(i, 'pay')} ariaLabel={`${m.mem} 납입금액`} />
                      </td>
                      <td className={`${TD} text-center tabular`} style={CELL}>{mn(String(m.ppct))}</td>
                      <td className={`${TD} text-right tabular`} style={CELL}>{m.custody == null ? dash : mn(toFmt(m.custody))}</td>
                      <td className={`${TD} text-center`} style={CELL}>
                        {m.chk == null ? dash
                          : <SelectInput value={drafts[i].chk} onChange={set(i, 'chk')} options={INVEST_CHK_OPTIONS} ariaLabel={`${m.mem} 데이터확인`} />}
                      </td>
                      <td className={TD} style={CELL}>
                        <TextInput value={drafts[i].memo} onChange={set(i, 'memo')} ariaLabel={`${m.mem} 비고`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* 합계행 — 목업 tfoot(약정금액 합·납입금액 합, 나머지 '-') */}
                <tfoot>
                  <tr className="bg-muted font-bold">
                    <td className={`${TD} text-center`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }} colSpan={4}>합계</td>
                    <td className={`${TD} text-right tabular`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>{mn(toFmt(sumCommit))}</td>
                    <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                    <td className={`${TD} text-right tabular`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>{toFmt(sumPay)}</td>
                    <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                    <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                    <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                    <td className={`${TD} text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="sm" onClick={save}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
