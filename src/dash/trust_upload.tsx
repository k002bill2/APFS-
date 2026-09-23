/* trust_upload.tsx — 수탁보고·부처보고 업로드 화면 공용 드롭존(표시·상태 전용).
   원문 5곳(S3_98 실물자료 업로드 박스 · S3_103 계좌정보관리 · S3_105 입출금정보관리 · S4_108 등록원부 업로드 팝업 ·
   신규 유가증권관리(업로드))이 같은 부품을 쓴다: "여기로 파일을 끌어다 놓으세요 / 또는 / [파일 선택]" + 선택 파일 목록(×).

   ⚠ 실제 파일 처리·전송을 하지 않는다(브리프 규칙 5) — 파일 **이름만** 로컬 state 로 들고, 업로드/확인은 페이지가 토스트로 끝낸다.
   FilePond 를 쓰지 않는 이유: 원문은 단순 드롭존 + 목록이고, FilePond 는 자체 처리 파이프라인·스타일을 들고 온다(과잉).
   목록 표시는 ui/attachment(표시 전용 파트)로 그려 모달 첨부 목록과 확장자 아이콘·색을 맞춘다. */
import React, { useId, useRef, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { MT } from './mask';
import { toast } from './ui/sonner';
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentActions, AttachmentAction } from './ui/attachment';

const { Button } = UI;

export interface UploadDropzoneProps {
  /** 선택된 파일 이름들(SSOT 는 페이지) */
  files: string[];
  onChange: (files: string[]) => void;
  /** 여러 파일(원문 S4_108 `multiple`). 미지정 = 한 파일(새로 고르면 교체 — 원문 showUp) */
  multiple?: boolean;
  /** 드롭존 안 보조 문구(원문 그대로 — 예: 'PDF, HWP, DOCX, XLSX, ZIP · 최대 20MB'). 원문에 없으면 비운다 */
  hint?: string;
  /** 접근名(원문 aria-label — 예: '실물자료 파일') */
  label: string;
  /** 파일 제거 토스트(원문 문구 — '선택 파일 제거됨' / '파일 제거됨') */
  removedMsg?: string;
}

export function UploadDropzone({ files, onChange, multiple, hint, label, removedMsg = '파일 제거됨' }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const hintId = useId();
  const add = (list: FileList | null) => {
    const names = Array.from(list ?? []).map((f) => f.name);
    if (!names.length) return;
    onChange(multiple ? [...files, ...names] : [names[0]]);
  };
  const remove = (i: number) => {
    onChange(files.filter((_, j) => j !== i));
    if (inputRef.current) inputRef.current.value = '';   // 같은 파일을 다시 고를 수 있게
    toast(removedMsg);
  };
  const over = (e: React.DragEvent) => { e.preventDefault(); setDrag(true); };
  const leave = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); };

  return (
    <div>
      <div role="group" aria-label={`${label} 끌어다 놓기 영역`} aria-describedby={hint ? hintId : undefined}
        onDragEnter={over} onDragOver={over} onDragLeave={leave} onDragEnd={leave}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer?.files ?? null); }}
        className="flex flex-col items-center justify-center text-center transition-colors"
        style={{
          gap: 6, padding: '22px 16px', borderRadius: 12,
          border: `1.5px dashed ${drag ? 'var(--primary)' : 'var(--border-strong)'}`,
          background: drag ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'var(--muted)',
        }}>
        <Icon name="upload" size={22} className="text-caption" />
        {/* preflight:false — <p> UA 마진 제거 */}
        <p className="m-0 font-semibold" style={{ fontSize: 13.5 }}>여기로 파일을 끌어다 놓으세요</p>
        <p className="m-0 text-caption" style={{ fontSize: 12 }}>또는</p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>파일 선택</Button>
        <input ref={inputRef} type="file" multiple={multiple} className="sr-only" tabIndex={-1} aria-label={`${label} 선택`}
          onChange={(e) => add(e.target.files)} />
        {hint && <p id={hintId} className="m-0 text-caption" style={{ fontSize: 11.5, marginTop: 4 }}>{hint}</p>}
      </div>
      {/* 선택 목록 — 원문 `.filelist`(aria-live=polite) */}
      <div aria-live="polite">
        {files.length > 0 && (
          <AttachmentGroup className="mt-2.5" aria-label={`${label} 선택 목록`}>
            {files.map((name, i) => (
              <Attachment key={`${name}-${i}`} size="sm">
                <AttachmentMedia fileName={name} />
                <AttachmentContent><AttachmentTitle><MT>{name}</MT></AttachmentTitle></AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction aria-label={`${name} 첨부파일 삭제`} onClick={() => remove(i)}><Icon name="x" size={15} /></AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        )}
      </div>
    </div>
  );
}
