/* trust_manage_kit.tsx — 수탁보고·부처보고 관리형 화면 공용 부품(선택 바 · 삭제 확인 · 행 편집 모달 · 폼↔행 변환).

   규약(apfs-manage-page · apfs-aggrid "체크박스" · apfs-grid "선택 액션 플로팅 바", 2026-09-23 사용자 결정)
   - 체크박스 multiRow 선택 → 선택 바(GridFrame contextActions): `N건 선택됨` · 단건 액션(1건일 때만) · 다건 액션 · 삭제 · 선택 해제.
   - 목업의 **행 안 버튼·셀 안 스위치/입력칸을 그대로 옮기지 않는다** — 목업에서 가져오는 것은 기능 목록이고, 배치는 선택 바다.
   - 선택 SSOT = `selIds: string[]`(행 객체를 들지 않는다 — 수정으로 행이 불변 교체되면 옛 객체가 남는다).

   행 편집 모달이 RowFormModal 이 아닌 이유: RowFormModal 의 onSave 는 buildRow 를 거쳐 generic_list Row 골격
   (icon·color·name·amount…)을 덮어써 도메인 행을 오염시킨다(형제 litigation_form_modal 헤더 ①②와 같은 판단).
   골격·규격(>6 항목이면 2단 wide · 46px 인셋 · SaveButton 계약)은 RowFormModal 을 그대로 따른다. */
import React, { useCallback, useRef, useState } from 'react';
import type { GridApi } from 'ag-grid-community';
import { UI } from './components';
import { toast } from './ui/sonner';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import type { PageSchema } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import type { Row } from './risk_table_meta';
export { formFromRow, rowPatch, nextRow } from './trust_manage_rows';

const { Button, SaveButton } = UI;

/* ──────────────────────────────
   선택 상태 — selIds 단일 SSOT
────────────────────────────── */
export function useRowSelection() {
  const apiRef = useRef<GridApi<Row> | null>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  /* 참조 안정 — ReadGrid onSelect 는 useCallback 계약 */
  const onSelect = useCallback((rs: Row[]) => setSelIds(rs.map((r) => r.id)), []);
  const clear = useCallback(() => { apiRef.current?.deselectAll(); setSelIds([]); }, []);
  return { apiRef, selIds, onSelect, clear };
}

/** 선택 바 — 단건 액션은 `single` 로 넘기면 1건일 때만 그린다. 다건 액션은 `bulk`. 삭제·선택 해제는 고정 */
export function SelBar({ count, single, bulk, onDelete, onClear }: {
  count: number;
  single?: React.ReactNode;
  bulk?: React.ReactNode;
  onDelete?: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(count)}건 선택됨</span>
      {count === 1 && single}
      {bulk}
      {onDelete && <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={onDelete}>삭제</Button>}
      <Button variant="ghost" size="sm" onClick={onClear}>선택 해제</Button>
    </>
  );
}

/** 삭제 확인 — 기본 포커스 = 취소 */
export function DeleteDialog({ title, count, onConfirm, onClose }: { title: string; count: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 <b className="text-foreground">{String(count)}건</b>을 삭제하시겠습니까? 삭제된 자료는 복구할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* RowFormModal `Field` 규격(형제 litigation_form_modal 과 같은 로컬 복제) */
function Field({ label, children, errMsg, plain, span2 }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean; span2?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${span2 ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/** 행 등록/수정 모달 — schema.fields 순회(SchemaField). 저장 = 폼 값(문자열)을 onSave 로. 변환은 호출부가 rowPatch 로 */
export function RowEditModal({ schema, mode, initial, title, onSave, onClose }: {
  schema: PageSchema;
  mode: 'create' | 'edit';
  initial?: Record<string, string>;
  title: string;
  onSave: (vals: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of schema.fields) {
      const from = initial?.[f.key] ?? '';
      const optionish = f.control === 'select' || f.control === 'switch';
      seed[f.key] = !from && optionish && mode === 'create' ? (f.options?.[0] ?? '') : from;
    }
    return seed;
  });
  const [errKey, setErrKey] = useState('');
  const set = (k: string, val: string) => { setV((p) => ({ ...p, [k]: val })); if (errKey === k) setErrKey(''); };
  const submit = () => {
    const miss = schema.fields.find((f) => f.required && !String(v[f.key] ?? '').trim());
    if (miss) { setErrKey(miss.key); return; }
    /* 저장 후 모달이 스스로 닫힌다(close → onOpenChange → onClose) — SaveButton 은 닫지 않는다 */
    return () => { onSave({ ...v }); toast.success(mode === 'create' ? '등록되었습니다 (목업)' : '수정되었습니다 (목업)'); dlgRef.current?.close(); };
  };
  const dlgRef = useRef<DialogHandle>(null);
  const wide = schema.fields.length > 6;

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 작성 중 오터치 유실 방지(RowFormModal 동형) */}
      <DialogContent className={wide ? 'max-w-[880px] max-h-[88vh]' : 'max-w-[460px] max-h-[86vh]'} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 양식</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className={wide ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-5' : ''}>
            {schema.fields.map((f) => (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')} plain={isPlainWrapControl(f.control)}
                span2={wide && (f.control === 'textarea' || !!f.long)}
                errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
                <SchemaField field={f} value={v[f.key] ?? ''} onChange={(x) => set(f.key, x)} invalid={errKey === f.key} />
              </Field>
            ))}
          </div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
