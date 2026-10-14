/* 수탁기관 값 수정 — 팝업 (자펀드수탁관리(실물검증) 섹션1 투자자산 그리드 '등록' 열의 [수정] 버튼으로 진입).
   출처: S1_26_자펀드수탁관리_실물검증_.html 하단 `<script>`의 `openEditVal(rid,basis)` 템플릿 → APFS 디자인시스템으로 변형.
   2026-09 회의록(농협 수탁시스템 사용자 인터뷰 2026-06-23) 개선 요청 ② — 대사 화면 안에서 수탁기관 값을 바로 고친다.

   구성(목업 → 우리 규약):
   - `.msub 자산유형: … — 판단 기준` 안내문 → 본문 상단 안내 한 줄(채권=액면·잔액 기준 / 그 외=보유주수 기준)
   - `.frow 보유주수`·`.frow 잔액` 텍스트 입력 → `SchemaField`(text) — 콤마·'-' 입력을 그대로 받는다
   - `.modal-foot 취소·저장` → `DialogFooter` 취소(outline) · 저장(primary)
   - 목업 스크림·포커스트랩·ESC·스크롤잠금은 Radix `Dialog`가 제공한다 → 이식하지 않는다.
   골격(Dialog · `px-[46px]` 인셋 · Field 래퍼)은 `custody_verify_memo_modal.tsx` 복사 관례.

   한계·가정(결정 기록)
   - 일치여부 재계산은 부모(`custody_verify_manage.tsx`)가 한다 — 이 팝업은 파싱한 값만 넘긴다.
   - 빈 값·'-'는 null(숫자 N/A)로 넘긴다. 숫자가 아닌 입력은 저장을 막는다(목업은 원문 문자열을 그대로 두지만
     숫자 컬럼에 문자를 넣으면 비교·엑셀 숫자 셀이 깨진다). */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';

const { Button, SaveButton } = UI;

/** 저장 결과 — 수탁기관 보유주수·잔액(숫자 N/A = null) */
export interface CustodyEditValue { cuShares: number | null; cuBal: number | null }

/* 라벨 + 컨트롤 래퍼 — `custody_verify_memo_modal`의 Field 규격 그대로(로컬 복사) */
function Field({ label, errMsg, children }: { label: string; errMsg?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3.5">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </label>
  );
}

const SHARES_FIELD: FieldSpec = { key: 'cuShares', label: '보유주수', control: 'text' };
const BAL_FIELD: FieldSpec = { key: 'cuBal', label: '잔액', control: 'text' };

/* 숫자 표기 → 입력 문자열(콤마 포함, null은 '-') — 목업 `curQty`/`curBal` 시드와 같은 모양 */
const toText = (v: number | null) => (v == null ? '-' : v.toLocaleString('ko-KR'));
/* 입력 문자열 → 숫자. 빈 값·'-' = null, 숫자 아님 = NaN(오류) */
function parse(s: string): number | null {
  const t = s.trim().replace(/,/g, '');
  if (t === '' || t === '-') return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export function CustodyEditModal({ assetType, cuShares, cuBal, onSave, onClose }: {
  /** 자산유형 — 안내문 분기(채권이면 보유주수는 판정 대상 아님) */
  assetType: string;
  cuShares: number | null;
  cuBal: number | null;
  onSave: (v: CustodyEditValue) => void;
  onClose: () => void;
}) {
  const [shares, setShares] = React.useState(toText(cuShares));
  const [bal, setBal] = React.useState(toText(cuBal));
  const [errKey, setErrKey] = React.useState<'' | 'shares' | 'bal'>('');
  const dlgRef = React.useRef<DialogHandle>(null);

  const submit = () => {
    const ns = parse(shares), nb = parse(bal);
    if (Number.isNaN(ns)) { setErrKey('shares'); return; }
    if (Number.isNaN(nb)) { setErrKey('bal'); return; }
    setErrKey('');
    return () => { onSave({ cuShares: ns, cuBal: nb }); toast.success('저장되었습니다'); };
  };

  const basisText = assetType === '채권'
    ? '액면·잔액 기준으로 일치여부 판단(보유주수는 해당없음)'
    : '보유주수 기준으로 일치여부 판단';

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로 닫히지 않는다 — 작성 중 오터치 유실 방지(메모 팝업과 동일 계약) */}
      <DialogContent className="max-w-[520px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>수탁기관 값 수정</DialogTitle>
          <DialogDescription className="sr-only">수탁기관 보유주수·잔액을 수정하고 일치여부를 재계산하는 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <p className="m-0 mb-4 font-semibold text-muted-foreground" style={{ fontSize: 13.5 }}>
            자산유형: {assetType} — {basisText}
          </p>
          <Field label="보유주수" errMsg={errKey === 'shares' ? '숫자로 입력하세요.' : undefined}>
            <SchemaField field={SHARES_FIELD} value={shares} onChange={(v) => { setShares(v); if (errKey === 'shares') setErrKey(''); }} invalid={errKey === 'shares'} />
          </Field>
          <Field label="잔액" errMsg={errKey === 'bal' ? '숫자로 입력하세요.' : undefined}>
            <SchemaField field={BAL_FIELD} value={bal} onChange={(v) => { setBal(v); if (errKey === 'bal') setErrKey(''); }} invalid={errKey === 'bal'} />
          </Field>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
