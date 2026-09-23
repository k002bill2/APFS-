/* 자펀드별 조기경보 상세조회 - 자펀드수익률 — 읽기전용 팝업
   출처: docs/mockups/02_조기경보/S2_49_자펀드별_조기경보_조회.html 의 `openRatePop`(= S2_50 화면).
   목업 설계메모: 이 화면은 독립 메뉴가 아니라 **이 팝업 하나로만** 존재한다(GNB/LNB/서브탭 제외).

   구성(목업 → 우리 규약):
   - modal-head(제목) + modal-toolbar(자펀드명)  → `DialogHeader` 제목 + 부제(자펀드명)
   - unitbar(원/백만원/억원)                     → `SegTabs size="sm"`, 기본 `원`. 저장 base = **원**(목업 `RATE_UNIT='won'`)
   - kpirow(자펀드수익률 · 등급)                 → KPI 2장. 수익률 음수는 `--danger-text`, 등급은 `StatusBadge`
   - grid2(항목/금액 2열)                        → 표 + `(단위: {선택단위})` 캡션. 금액 우측정렬

   ⚠ 팝업 값은 **구조 시연용 표본**이다 — 목업이 원문에서 확인된 유일한 표본(엘앤에스농식품6차산업화투자조합)을
     모든 행에 재사용한다고 명시했다. **행마다 달라지는 실데이터가 아니며**, 신규 데이터를 창작하지 않는다.
     그래서 부제의 자펀드명만 행에서 오고 수치는 고정이다.
   ⚠ 목업은 `엑셀`을 modal-toolbar 우측에 뒀지만, 우리 `DialogContent` 는 헤더 우측 상단에 자체 닫기(X)를
     **절대배치**하므로 같은 자리에 버튼을 두면 겹친다 → DS 골드(`subfund_spec_modal.tsx`)대로 **푸터**에 둔다. */
import React, { useState } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';

const { Button, SegTabs, StatusBadge } = UI;

/* ── 금액 단위 — 저장 base = 원. 자릿수는 목업 `fmtAmt2` 그대로:
      원 = 콤마 정수 · 백만원 = 최대 소수 2자리 · 억원 = 최대 소수 4자리.
   ⚠ **최대(max)만** 지정한다 — min=max 로 두면 결성총액 10,000,000,000 이 억원에서 `100` 이 아니라
     `100.0000` 으로 찍혀 목업과 달라진다. ── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };
const UNIT_MAX_DIGITS: Record<Unit, number> = { 원: 0, 백만원: 2, 억원: 4 };
/* null → '-' (목업 `fmtAmt2` 의 첫 줄). **나눗셈 전에** 판정한다 — null/1e6 은 0 이 된다. */
function money(won: number | null, unit: Unit): string {
  if (won == null) return '-';
  return String((won / UNIT_DIV[unit]).toLocaleString(undefined, { maximumFractionDigits: UNIT_MAX_DIGITS[unit] }));
}

/* ── 표본 데이터 — 목업 `RATE_SAMPLE`/`GRADE_SAMPLE`/`AMT_SAMPLE` 값 그대로(base = 원) ──
   ⚠ `미투자자산투자잔액` 은 문자 '-' 가 아니라 **`null`** 이다(원문 미제공). 포매터가 '-' 로 렌더한다. */
const RATE_SAMPLE = -55.36;
/* 등급 → 배지 톤. 페이지(`fund_early_warning.tsx`)의 동명 상수를 import 하지 않고 **모듈 로컬로 둔다** —
   팝업은 페이지와 독립 전사(轉寫)라 역방향 import 로 순환을 만들지 않는다.
   표본값이 '경고' 로 고정이라 지금은 danger 로 귀결되지만, 매핑을 거쳐야 값이 바뀔 때 색이 따라간다. */
type Grade = '정상' | '주의' | '경고';
const GRADE_TONE: Record<Grade, Tone> = { 정상: 'success', 주의: 'warning', 경고: 'danger' };
const GRADE_SAMPLE: Grade = '경고';
const AMT_SAMPLE: { k: string; v: number | null }[] = [
  { k: '투자잔액', v: 537_490_750 },
  { k: '계좌잔액', v: 426_402_148 },
  { k: '미투자자산투자잔액', v: null },
  { k: '배분총액', v: 3_500_000_000 },
  { k: '출자금총액', v: 10_000_000_000 },
  { k: '결성총액', v: 10_000_000_000 },
];

/* 수익률 KPI 표기 — 목업은 소수 2자리 고정(`minimumFractionDigits:2`)이다. 금액과 규칙이 다르다. */
const rateText = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── 프리미티브 ── */
const TH = 'border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '8px 11px' };

/* KPI 카드 */
function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[color:var(--grid-header)] border border-border" style={{ borderRadius: 10, padding: '12px 14px' }}>
      <div className="text-caption font-semibold" style={{ fontSize: 12.5, marginBottom: 5 }}>{label}</div>
      <div className="flex items-baseline gap-1 min-h-[28px]">{children}</div>
    </div>
  );
}

/* ──────────────────────────────
   팝업 본체
────────────────────────────── */
export function FundEarlyWarningYieldModal({ fund, ym, onClose }: { fund: string; ym: string; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');   // 목업 기본값 = 저장 base
  const dlgRef = React.useRef<DialogHandle>(null);

  /* 엑셀 — 화면이 그리는 소스 **전부**를 직렬화한다(대상 자펀드·수익률·등급·금액 지표 6행).
     한쪽만 넣으면 "화면엔 보이는데 엑셀엔 없는" 누락이 난다(apfs-spec-popup 규약 6).
     금액은 단위 무관 **원 단위 원값**(골드 subfund_spec_modal 동형). */
  const excel = () => {
    const num = (v: number) => (v);
    const txt = (v: string) => (v);
    const rows: (string | number)[][] = [
      ['자펀드명', txt(fund)],
      ...(ym ? [['기준년월', txt(ym)]] : []),          // 기준년월 미선택이면 행 자체를 빼다
      ['자펀드수익률(%)', num(RATE_SAMPLE)],
      ['등급', txt(GRADE_SAMPLE)],
      [],
      ['금액 지표', '금액(원)'],
      ...AMT_SAMPLE.map(({ k, v }) => [k, v == null ? '-' : num(v)]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '자펀드수익률');
    XLSX.writeFile(wb, `자펀드별_조기경보_자펀드수익률${ym ? `_${ym}` : ''}.xlsx`);   // 기준년월 미선택이면 접미사 없이
    toast.success('자펀드수익률 엑셀을 내려받았습니다');
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[760px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명을 한 래퍼로 묶어 좌측에 나란히(DialogHeader 가 justify-between 이라 안 묶으면 우측 끝으로 밀린다) */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">자펀드별 조기경보 상세조회 - 자펀드수익률</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">
              자펀드명 : {fund}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {/* 단위바 — 목업 `.unit`(라벨 + seg) */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
            <SegTabs size="sm" value={unit} onChange={(v: string) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
          </div>

          {/* KPI 2장 — 목업 `.kpirow`. 수익률 음수는 danger 텍스트 토큰 */}
          <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <Kpi label="자펀드수익률">
              <span className="tabular font-bold" style={{ fontSize: 24, color: RATE_SAMPLE < 0 ? 'var(--danger-text)' : 'var(--foreground)' }}>
                {String(rateText(RATE_SAMPLE))}
              </span>
              <span className="font-semibold text-caption" style={{ fontSize: 13 }}>%</span>
            </Kpi>
            <Kpi label="등급">
              <StatusBadge tone={GRADE_TONE[GRADE_SAMPLE]} label={GRADE_SAMPLE} size="lg" dot={false} />
            </Kpi>
          </div>

          {/* 금액 지표 표 — 목업 `.grid2`(항목/금액) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 380 }}>
              <caption className="text-left font-bold" style={{ fontSize: 14, paddingBottom: 6 }}>
                금액 지표 <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>{`(단위: ${unit})`}</span>
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`} style={{ ...CELL, width: '46%' }}>항목</th>
                  <th scope="col" className={`${TH} text-right`} style={CELL}>금액</th>
                </tr>
              </thead>
              <tbody>
                {AMT_SAMPLE.map(({ k, v }) => (
                  <tr key={k}>
                    <td className={`${TD} font-semibold text-muted-foreground`} style={CELL}>{k}</td>
                    <td className={`${TD} text-right tabular font-semibold`} style={CELL}>{money(v, unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={excel}>엑셀</Button>
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
