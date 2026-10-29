/* 전표역분개 모달(ACC-003 E07 · slide 23) — 작성자(로그인 사용자·비활성) · 전표일(기본 오늘·필수) · 구분(마이너스전표 기본/상계전표).
   [확인] = 선택값을 onConfirm 으로 넘기고 닫힘 → 호출부가 전표등록 화면을 연다(역분개 값 채움은 전표등록 쪽 책임).
   [확인]은 서버 실행이 아니라 다음 화면으로 넘기는 선택 확인이라 SaveButton 이 아닌 일반 Button(apfs-form-modal 6-1 제외 목록).
   컨트롤은 SchemaField(readonly·date·radio) 재사용 — 34px 박스·DatePicker 폭·RadioGroup 라벨 연결을 공용 규격 그대로 받는다. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { CURRENT_USER, todayStr } from './general_journal_data';
import type { ReverseKind } from './general_journal_model';

const { Button } = UI;

const REVERSE_KINDS: ReverseKind[] = ['마이너스전표', '상계전표'];
const F_WRITER: FieldSpec = { key: 'writer', label: '작성자', control: 'readonly' };
const F_DATE: FieldSpec = { key: 'date', label: '전표일', control: 'date', required: true };
const F_KIND: FieldSpec = { key: 'kind', label: '구분', control: 'radio', options: REVERSE_KINDS };

/* RowFormModal `Field` 규격(로컬 복제 — 형제 모달과 동일) */
function Field({ label, children, errMsg, plain }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

export function JournalReverseModal({ onConfirm, onClose }: {
  onConfirm: (v: { date: string; kind: ReverseKind }) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const [date, setDate] = React.useState(todayStr);
  const [kind, setKind] = React.useState<ReverseKind>('마이너스전표');
  const [err, setErr] = React.useState(false);

  const confirm = () => {
    if (!date) { setErr(true); return; }   // slide 23: 전표일 미입력 시 진행 불가
    onConfirm({ date, kind });
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>전표역분개</DialogTitle>
          <DialogDescription className="sr-only">역분개 전표의 전표일과 구분을 선택합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Field label={F_WRITER.label}>
            <SchemaField field={F_WRITER} value={CURRENT_USER} onChange={() => undefined} />
          </Field>
          <Field label={F_DATE.label + ' *'} plain={isPlainWrapControl(F_DATE.control)} errMsg={err ? '전표일을 입력하세요.' : undefined}>
            <SchemaField field={F_DATE} value={date} onChange={(v) => { setDate(v); if (v) setErr(false); }} invalid={err} />
          </Field>
          <Field label={F_KIND.label} plain={isPlainWrapControl(F_KIND.control)}>
            <SchemaField field={F_KIND} value={kind} onChange={(v) => setKind(v as ReverseKind)} />
          </Field>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="sm" onClick={confirm}>확인</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
