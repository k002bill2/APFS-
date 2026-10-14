/* 불일치 건 알림 — 팝업 (자펀드수탁관리(확정) 툴바 [불일치 건 알림]으로 진입).
   출처: S1_27_자펀드수탁관리_확정_.html 하단 `<script>`의 `notify-btn` 핸들러(`.notifypop`) → APFS 디자인시스템으로 변형.
   2026-09 회의록(농협 수탁시스템 사용자 인터뷰 2026-06-23) 개선 요청 ② — 전화 통보 대신 시스템 내 알림 발송.

   구성(목업 → 우리 규약):
   - `<h3>불일치 N건</h3>`                → 제목 '불일치 건 알림' + 본문 건수 한 줄
   - `<ul><li>운용사<div>자펀드</div>`     → 표(No·운용사·자펀드). 비면 목업 문구 '불일치 건이 없습니다.'
   - `담당자에게 시스템 알림 발송` 버튼     → 푸터 primary 버튼(불일치 0건이면 숨김 — 목업 동일). 닫기(outline) 병기
   골격(Dialog · `px-[46px]` 인셋 · Section · TH/TD/CELL)은 `custody_verify_memo_modal.tsx` 복사 관례.

   한계·가정(결정 기록)
   - ⚠ 목업은 버튼 아래에 붙는 **팝오버**(`.notifypop`)다. 우리는 Dialog로 연다(2026-10-14 — 다른 신규 팝업과
     같은 모달 규약으로 통일). 내용·버튼 문구는 목업 그대로다.
   - 대상은 화면 필터와 무관한 **전체 행**의 `일치여부=불일치`(목업 `DATA.filter`).
   - 백엔드가 없어 발송은 토스트로만 표시된다. */
import React from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import type { CustodyConfirmRow } from './custody_confirm_manage';

const { Button } = UI;

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-left';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };

export function CustodyMismatchAlertModal({ rows, onClose }: { rows: CustodyConfirmRow[]; onClose: () => void }) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const bad = rows.filter((r) => r.status === '불일치');

  const send = () => {
    toast.success('담당자에게 시스템 알림을 발송했습니다');
    dlgRef.current?.close();
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[640px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <DialogTitle>불일치 건 알림</DialogTitle>
          <DialogDescription className="sr-only">현재 불일치 대사 건 목록을 확인하고 담당자에게 시스템 알림을 발송</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <p className="m-0 mb-3 font-bold" style={{ fontSize: 15 }}>불일치 {bad.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 420 }}>
              <caption className="sr-only">불일치 대사 건 — 운용사·자펀드</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH} style={{ ...CELL, width: 56 }}>No</th>
                  <th scope="col" className={TH} style={CELL}>운용사</th>
                  <th scope="col" className={TH} style={CELL}>자펀드</th>
                </tr>
              </thead>
              <tbody>
                {bad.length === 0 ? (
                  <UI.EmptyRow span={3} msg="불일치 건이 없습니다." className={TD} style={{ ...CELL, padding: '18px 9px' }} />
                ) : bad.map((r, i) => (
                  <tr key={r.id}>
                    <td className={`${TD} tabular`} style={CELL}>{i + 1}</td>
                    <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}>{r.gp}</td>
                    <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}>{r.fn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            {bad.length > 0 && <Button variant="primary" size="sm" leadingIcon="bell" onClick={send}>담당자에게 시스템 알림 발송</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
