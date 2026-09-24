/* 운용사정량지표상세(재무건정성비율) — 읽기전용 상세 팝업 (운용사 재무정보 조회 그리드의 `기준년월` 링크로 진입).
   출처: docs/mockups/01_투자자산관리/S1_38_운용사_재무정보_조회.html `openRatioDetail(r)` (S1_38:419-434)

   원문은 이 팝업을 예전 별도 서브메뉴 화면(S1_39)을 흡수한 것이라 적는다(2026-08-28 원문 주석).
   내용은 원문 `table.info-tbl` 4행 그대로다 — 운용사명·GP구분(행 값) · 지표명 리터럴 · 빈 상태 1행(gp_ratio_detail_model.ts).
   원문에 비율 데이터가 없으므로(`조회내용이 없습니다.`) 값을 지어 넣지 않는다.

   구성(목업 → 우리 규약): `.modal.wide`(680px) → Radix Dialog · kv 표 → KvGrid(due_dilig_checklist_modal 복사 관례) ·
   푸터 `닫기` 하나(원문 `.modal-foot.right`). */
import React from 'react';
import { UI } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { GP_RATIO_TITLE, GP_RATIO_EMPTY, gpRatioItems } from './gp_ratio_detail_model';

const { Button } = UI;

const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
const DD_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' };

export function GpRatioDetailModal({ row, onClose }: { row: Record<string, unknown>; onClose: () => void }) {
  const items = gpRatioItems(row);
  const dlgRef = React.useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[680px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{GP_RATIO_TITLE}</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{String(row.baseYm ?? '')}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <dl className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
            {items.map((o) => (
              <div key={o.l} className="grid bg-card" style={KV_COLS}>
                <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
                <dd className="m-0 flex items-center min-w-0" style={DD_STYLE}>{o.v}</dd>
              </div>
            ))}
            {/* 원문 `<td colspan="2" class="empty">` — 비율 데이터 없음 */}
            <div className="bg-card text-caption text-center" style={{ padding: '14px 12px', fontSize: 13.5 }}>{GP_RATIO_EMPTY}</div>
          </dl>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
