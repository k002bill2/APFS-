/* IRR 근거 팝업 — 읽기전용 현금흐름 내역(투자기업별(계약별) IRR 근거 S2_88 · 투자기업별 IRR 근거 S2_92 · 자펀드별 IRR 근거 S2_90).
   원문 설계메모: 세 근거 화면은 별도 메뉴가 아니라 **목록 셀 클릭으로 여는 팝업**(프로그램명 병합 확정)이다.
   데이터는 risk_irr_data.ts 의 IrrBasis 가 SSOT(원문 1행 그대로 — 목록 행과 독립된 표본, 1:1 드릴다운 아님).

   목업 → 우리 규약(골드 fund_early_warning_yield_modal.tsx · apfs-spec-popup)
   - modal-head 제목 → DialogTitle. 조합명 머리글(S2_90 `.fn`) → DialogDescription.
   - 맥락 kv(`.ctx .ci` 자펀드·투자기업·투자자산종류) → 본문 상단 kv 행.
   - 금액 단위 seg(열 때마다 `원` 으로 초기화 — 원문 openIrr 의 irrUnit 리셋) → 본문 우측 SegTabs.
   - 금액은 원문이 양수에 '-' 를 붙여 그린다 → 음수 값 + 위험색(`--danger-text`).
   - `엑셀` 은 헤더 우측이 아니라 **푸터**(DialogContent 의 절대배치 닫기 X 와 겹침 방지 — 골드와 같은 판단).
   - 엑셀 = 화면 소스 전부(맥락 kv + 현금흐름 표), 화면 단위 그대로. */
import React, { useRef, useState } from 'react';
import { UI } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { UNITS, DEFAULT_UNIT, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { displayText } from './risk_grid';
import { tableSheet } from './risk_excel';
import type { IrrBasis } from './risk_irr_data';

const { Button, SegTabs, StatusBadge } = UI;

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '8px 11px' };
const ALIGN = { text: 'text-left', center: 'text-center', date: 'text-center', amount: 'text-right', number: 'text-right', badge: 'text-center' } as const;

export function IrrBasisModal({ basis, onClose }: { basis: IrrBasis; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const dlgRef = useRef<DialogHandle>(null);
  const { table } = basis;

  const excel = () => {
    const lead: (string | number)[][] = [
      ...(basis.heading ? [['자펀드', basis.heading]] : []),
      ...(basis.ctx ?? []).map((c) => [c.label, c.value]),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, tableSheet(table, table.rows, unit, lead), 'IRR 근거');
    XLSX.writeFile(wb, `${basis.title}.xlsx`);
    toast.success('IRR 근거 엑셀을 내려받았습니다');
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[820px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{basis.title}</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">
              {basis.heading ? basis.heading : 'IRR 산정 근거 현금흐름 내역'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {/* 맥락 kv */}
          {basis.ctx && (
            <dl className="grid gap-px border border-border bg-border" style={{ margin: '0 0 16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {basis.ctx.map((c) => (
                <div key={c.label} className="bg-card flex items-center gap-3" style={{ padding: '9px 12px' }}>
                  <dt className="text-caption font-semibold shrink-0" style={{ fontSize: 12.5 }}>{c.label}</dt>
                  <dd className="font-semibold min-w-0 truncate" style={{ margin: 0, fontSize: 14 }}>{c.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div role="group" aria-label="금액 단위" className="flex items-center justify-end gap-2 mb-3">
            <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
            <SegTabs size="sm" value={unit} onChange={(v: string) => setUnit(v as Unit)} options={UNITS as unknown as string[]} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 560 }}>
              <caption className="sr-only">{basis.title} — 현금흐름 내역</caption>
              <thead>
                <tr>
                  {table.cols.map((c) => (
                    <th key={c.key} scope="col" className={`${TH} ${ALIGN[c.kind]}`} style={CELL}>
                      {c.kind === 'amount' ? amountHeader(c.label, unit) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.id}>
                    {table.cols.map((c) => {
                      const v = r[c.key];
                      const neg = c.neg && typeof v === 'number' && v < 0;
                      return (
                        <td key={c.key} className={`${TD} ${ALIGN[c.kind]} ${c.kind === 'amount' ? 'tabular font-semibold' : ''}`}
                          style={{ ...CELL, color: neg ? 'var(--danger-text)' : undefined }}>
                          {v == null ? <span className="text-muted-foreground">-</span>
                            : c.kind === 'badge' ? <StatusBadge tone={c.tones?.[String(v)] ?? 'muted'} label={String(v)} size="lg" dot={false} />
                            : c.kind === 'text' || c.kind === 'center' ? String(v)
                            : String(displayText(c, v, unit))}
                        </td>
                      );
                    })}
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
