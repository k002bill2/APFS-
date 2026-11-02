/* 증빙 첨부 업로더(ACC-006 slide 12 ③) — 증빙첨부 화면(journal_entry_screen mode 'evidence') 전용.
   공용 FilePondField 는 허용 확장자 목록·파일별 안내 문구 훅이 없어(설계서 저장 검증 3·4번 문구를 낼 수 없다) 여기서 작게 만든다.
   - 값 계약 = DocumentsField 와 같은 파일명 CSV("a.pdf, b.png") — 제어 컴포넌트라 마운트 때 onChange 를 부르지 않는다(열자마자 dirty 방지).
   - 드롭존 = 실제 <button>(클릭·Enter·Space = 파일 선택 창) + 같은 버튼에 드래그 핸들러. 저장 검증 2번 실패 시 이 버튼에 초점(buttonRef).
   - 파일마다 checkEvidenceFile — 허용 외 확장자·20MB 초과는 toast.error 후 그 파일만 제외(설계서 "해당 파일 제외").
   ⚠ 백엔드가 없어 파일 내용은 보관하지 않고 파일명만 남긴다(다운로드는 데모 토스트). */
import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Icon } from '../../icons';
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction } from '../../ui/attachment';
import { fileExtLabel } from '../../fields/file_names';
import { toast } from '../../ui/sonner';
import { EVIDENCE_ACCEPT, addFileNames, checkEvidenceFile, parseCsv, removeFileName } from './missing_evidence_model';

export function EvidenceUpload({ value, onChange, buttonRef, describedBy }: {
  value: string; onChange: (v: string) => void; buttonRef?: React.Ref<HTMLButtonElement>; describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const files = parseCsv(value);

  /* 파일마다 검사 — 통과분만 추가. 같은 메시지는 한 번만 띄운다(여러 개를 한꺼번에 떨어뜨릴 때 토스트 폭주 방지) */
  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const ok: string[] = [];
    const errs = new Set<string>();
    for (const f of Array.from(list)) {
      const err = checkEvidenceFile(f.name, f.size);
      if (err) errs.add(err); else ok.push(f.name);
    }
    errs.forEach((m) => toast.error(m));
    if (ok.length) onChange(addFileNames(value, ok));
  };

  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label="첨부파일" aria-describedby={describedBy}>
      {files.length > 0 && (
        <AttachmentGroup>
          {files.map((name) => (
            <Attachment key={name} size="sm">
              <AttachmentMedia fileName={name} />
              <AttachmentContent>
                <AttachmentTitle>{name}</AttachmentTitle>
                <AttachmentDescription state="done">{fileExtLabel(name)} · 첨부됨</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label={`${name} 삭제`} title="삭제" onClick={() => onChange(removeFileName(value, name))}><X /></AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
      <button type="button" ref={buttonRef}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        className="flex w-full items-center justify-center gap-2 rounded-card-sm cursor-pointer text-muted-foreground hover:text-foreground"
        style={{
          minHeight: 72, padding: '16px 12px', fontFamily: 'inherit', fontSize: 13.5,
          border: `1px dashed ${over ? 'var(--primary)' : 'var(--border-strong)'}`,
          background: over ? 'var(--muted)' : 'var(--card)',
        }}>
        <Icon name="upload" size={18} />
        업로드하실 파일을 이곳으로 드래그하시거나 클릭해주세요
      </button>
      {/* 숨은 파일 입력 — 버튼이 대신 연다. value 를 비워 같은 파일을 다시 골라도 change 가 뜨게 한다 */}
      <input ref={inputRef} type="file" multiple accept={EVIDENCE_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
