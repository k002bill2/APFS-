/* trust_upload.tsx — 수탁보고·부처보고 업로드 화면 공용 드롭존.
   원문 5곳(S3_98 실물자료 업로드 박스 · S3_103 계좌정보관리 · S3_105 입출금정보관리 · S4_108 등록원부 업로드 팝업 ·
   신규 유가증권관리(업로드))이 같은 부품을 쓴다.

   ⚠ 실제 파일 처리·전송을 하지 않는다(브리프 규칙 5) — 파일 **이름만** 페이지 state 로 들고, 업로드/확인은 페이지가 토스트로 끝낸다.
   드롭존 본체 = 프로젝트 통일 파일존 `DocumentsField`(FilePond, 2026-09-09 파일존 통일 · apfs-form-modal `file` 규약).
   자체 `<input type=file>` 드롭존을 만들지 않는다. 이 래퍼는 페이지의 `string[]` 계약만 DocumentsField 의 CSV 계약에 잇는다. */
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from './ui/sonner';
import { DocumentsField } from './fields/DocumentsField';
import { parseFileNames } from './fields/file_names';

export interface UploadDropzoneProps {
  /** 선택된 파일 이름들(SSOT 는 페이지) */
  files: string[];
  onChange: (files: string[]) => void;
  /** 여러 파일(원문 S4_108 `multiple`). 미지정 = 한 파일(새로 고르면 교체 — 원문 showUp) */
  multiple?: boolean;
  /** 드롭존 아래 보조 문구(원문 그대로 — 예: 'PDF, HWP, DOCX, XLSX, ZIP · 최대 20MB'). 원문에 없으면 비운다 */
  hint?: string;
  /** 접근名(원문 aria-label — 예: '실물자료 파일') */
  label: string;
  /** 파일 제거 토스트(원문 문구 — '선택 파일 제거됨' / '파일 제거됨') */
  removedMsg?: string;
  /** 용량 상한(FilePond 검증) — 원문이 명시한 화면만(S3_98·유가증권·S4_108 = '20MB'). 미지정 = 제한 없음(S3_103·S3_105 원문 무제한) */
  maxSize?: string;
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export function UploadDropzone({ files, onChange, multiple, hint, label, removedMsg = '파일 제거됨', maxSize }: UploadDropzoneProps) {
  const hintId = useId();
  /* FilePond 는 비제어 — 페이지가 files 를 비우면(확인·초기화) key 를 바꿔 다시 마운트해 드롭존도 비운다 */
  const [gen, setGen] = useState(0);
  const emitted = useRef<string[]>([]);
  /* 비교 기준은 ref 의 최신 files — 콜백이 옛 렌더의 files 를 쥐고 있어도 빈 선택이 페이지로 전파되게(Codex P1) */
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => {
    if (files.length === 0 && emitted.current.length > 0) { emitted.current = []; setGen((g) => g + 1); }
  }, [files]);

  const change = (csv: string) => {
    const names = parseFileNames(csv);
    const prev = emitted.current;
    emitted.current = names;
    if (same(names, filesRef.current)) return;
    if (names.length < prev.length) toast(removedMsg);
    onChange(names);
  };

  return (
    <div>
      <DocumentsField key={gen} value="" onChange={change} label={label} multiple={!!multiple} maxSize={maxSize ?? null} describedBy={hint ? hintId : undefined} />
      {/* preflight:false — <p> UA 마진 제거 */}
      {hint && <p id={hintId} className="m-0 text-caption" style={{ fontSize: 11.5, marginTop: 6 }}>{hint}</p>}
    </div>
  );
}
