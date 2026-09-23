/* 투자기업 기업개요 — 읽기전용 명세 팝업 (출처: S1_30_투자기업정보.html)
   본문(기업개요 kv · 재무제표 · 주주명부)과 원문 데이터는 `company_profile_model.tsx` 가 SSOT 다 —
   같은 원문을 페이지(`investee_profile.tsx`)도 쓰기 때문에 여기서 복사하지 않는다.
   골격·크롬(Dialog 880px · px-[46px] 정렬)은 `gp_spec_modal.tsx` 복사 관례(apfs-spec-popup).

   진입: 스키마가 `detail: 'companyProfile'` 을 선언한 컬럼의 셀 클릭 / 셀 Enter / 행 더블클릭.

   ⚠ 한계(gp_spec_modal과 동형): S1_30 원문 실데이터가 (주)선양 1건뿐이라 어느 행을 눌러도 같은
     기업이 표시된다. `row`를 받아 **헤더의 대상명만** 실제 행 값으로 바꾸고, 본문은 원문 값을
     보존한다 — 원문에 없는 값을 행에서 합성해 채우면 목업 충실도가 깨진다. */
import { useState, useRef } from 'react';
import { UI } from './components';
import type { Unit } from './schemas/unit';
import { CompanyProfileBody, UnitSeg, CO_NAME } from './company_profile_model';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';

const { Button } = UI;

/* row는 optional이다 — 헤더 대상명에만 쓰고 본문은 원문 값을 유지한다(위 ⚠ 참조).
   optional로 둬야 기존 `{ onClose }` 단독 호출부가 회귀 없이 살아 있다. */
export function CompanyProfileModal({ row, onClose }: { row?: Record<string, unknown>; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  const target = String(row?.investee ?? row?.company ?? row?.name ?? CO_NAME);
  const dlgRef = useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">기업개요</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{target}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <UnitSeg unit={unit} onChange={setUnit} />
          <CompanyProfileBody unit={unit} />
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
