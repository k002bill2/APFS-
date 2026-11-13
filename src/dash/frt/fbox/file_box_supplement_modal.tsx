/* 파일BOX — 운용사 제출 파일 추가·교체 모달. 출처: `파일BOX_목업.html` subfile 팝업(대상 · 구분 · 사유 · 드롭존 + [취소][저장]).
   목업 → 우리 규약(apfs-form-modal):
   - 구분 select(2값, 배타) → SchemaField radio(DS RadioGroup, 첫 옵션 = 추가 기본) · 사유 textarea → SchemaField textarea(전체 폭).
   - 드롭존 → 공용 DocumentsField(한 파일, 20MB) · 대상 → readonly 칸.
   - alert('파일을 선택하세요.') → 칸 아래 오류 문구 + 토스트(file_box_model.validateSupplement) · [저장] = SaveButton(저장 중).
   ⚠ 원본 편집이 아니다 — 담당자가 누락분을 대신 올리거나 잘못 낸 파일을 바꾸는 기능(목업 설계 메모). 백엔드 없음: 파일명만 반영. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { DocumentsField } from '../../fields/DocumentsField';
import { parseFileNames } from '../../fields/file_names';
import { toast } from '../../ui/sonner';
import { FILE_HINT, FILE_MAX_SIZE } from './file_box_data';
import type { SubFile } from './file_box_data';
import { SUPPLEMENT_MODES, targetLabel, validateSupplement } from './file_box_model';
import type { SupplementMode } from './file_box_model';

const { Button, SaveButton } = UI;

const F: Record<'target' | 'mode' | 'reason', FieldSpec> = {
  target: { key: 'target', label: '대상', control: 'readonly', long: true },
  mode: { key: 'mode', label: '구분', control: 'radio', options: SUPPLEMENT_MODES.map((m) => m.label), required: true },
  reason: { key: 'reason', label: '사유', control: 'textarea', long: true, placeholder: '예: 2페이지 누락되어 재요청 후 보완 업로드' },
};
const modeOf = (label: string): SupplementMode => SUPPLEMENT_MODES.find((m) => m.label === label)?.code ?? 'add';

const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, plain, hint, hintId }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean; hint?: string; hintId?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {hint && !errMsg && <span id={hintId} className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

export function FileBoxSupplementModal({ row, onSave, onClose }: {
  row: SubFile;
  onSave: (p: { mode: SupplementMode; fileName: string }) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const uid = React.useId();
  const [mode, setMode] = React.useState(SUPPLEMENT_MODES[0].label);
  const [reason, setReason] = React.useState('');
  const [file, setFile] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);

  const submit = () => {
    const fileName = parseFileNames(file)[0] ?? '';
    const e = validateSupplement({ fileName });
    if (e) { setErr(e.msg); toast.error(e.msg); return; }
    return () => onSave({ mode: modeOf(mode), fileName });
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[560px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>파일 추가·교체</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto" style={{ padding: '24px 46px' }}>
          <DialogDescription className="text-caption" style={{ margin: '0 0 14px', fontSize: 12.5 }}>
            누락분 보완 업로드 또는 잘못된 파일 교체용(원본 편집 아님).
          </DialogDescription>
          <Field label="대상">
            <SchemaField field={F.target} value={targetLabel(row)} onChange={() => {}} />
          </Field>
          <Field label="구분 *" plain>
            <SchemaField field={F.mode} value={mode} onChange={setMode} />
          </Field>
          <Field label="사유">
            <SchemaField field={F.reason} value={reason} onChange={setReason} />
          </Field>
          <Field label="파일 *" plain hint={FILE_HINT} hintId={`${uid}-hint`} errMsg={err ?? undefined}>
            <DocumentsField label="보완 파일" value={file} multiple={false} maxSize={FILE_MAX_SIZE} required describedBy={`${uid}-hint`}
              onChange={(csv) => { setFile(csv); if (csv.trim()) setErr(null); }} />
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
