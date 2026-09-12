/* DocumentsField — filepond 컨트롤의 개선 래퍼.
   FilePond는 왕복(round-trip) 불가라 수정 재진입 시 기존 첨부가 안 보이는 사각지대가 있다.
   여기서 기존 첨부(초기 value에서 파싱)를 Attachment(표시 전용)로 읽기전용 렌더하고,
   신규 추가는 FilePond가 담당한다. 최종 value = (남은 기존 + 신규) 파일명 CSV.
   값 계약은 기존 filepond와 동일("a.pdf, b.png") — 스키마/빌드로 계약 유지. */
import * as React from 'react';
import { Download, X } from 'lucide-react';
import { FilePondField } from './FilePondField';
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from '../ui/attachment';
// 파일명 파서·확장자 라벨은 리스트 셀의 첨부 칩과 공유(SSOT) — file_names.ts
import { parseFileNames, fileExtLabel } from './file_names';

export function DocumentsField({ value, onChange, required, label }: { value: string; onChange: (v: string) => void; required?: boolean; label?: string }) {
  // 초기 value(수정 진입 시의 기존 첨부)를 1회만 캡처 — 이후 내부 상태가 단독 소유.
  const initialRef = React.useRef(value);
  const [existing, setExisting] = React.useState<string[]>(() => parseFileNames(initialRef.current));
  const [added, setAdded] = React.useState<string[]>([]);

  // 기존/신규 합쳐 상위 vals로 반영(계약: CSV 문자열).
  React.useEffect(() => {
    onChange([...existing, ...added].join(', '));
    // onChange는 상위 setState 래퍼 — deps에서 제외(무한 루프 방지). existing/added 변화 시에만 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, added]);

  return (
    // 복합 컨트롤(첨부목록+FilePond)이라 Field는 <div>로 래핑(<label> 암묵연결 금지) → 보이는 라벨 span이
    // orphan이 됨. role="group"+aria-label로 이 영역에 접근名을 직접 부여한다(bare div의 aria-label은 SR 무시).
    <div className="flex flex-col gap-2.5" role="group" aria-label={label} aria-required={required || undefined}>
      {existing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-semibold text-muted-foreground">기존 첨부파일 ({existing.length})</div>
          <AttachmentGroup>
            {existing.map((name, i) => (
              <Attachment key={name + i} size="sm">
                <AttachmentMedia fileName={name} />
                <AttachmentContent>
                  <AttachmentTitle>{name}</AttachmentTitle>
                  <AttachmentDescription state="done">{fileExtLabel(name)} · 업로드됨</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction aria-label={`${name} 다운로드`} title="다운로드"><Download /></AttachmentAction>
                  <AttachmentAction
                    aria-label={`${name} 삭제`}
                    title="삭제"
                    onClick={() => setExisting((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </AttachmentGroup>
        </div>
      )}
      {/* 신규 추가 — FilePond. 기존 첨부가 있으면 required 표식은 이미 충족이므로 해제 */}
      <FilePondField value="" onChange={(v) => setAdded(parseFileNames(v))} required={required && existing.length === 0} />
    </div>
  );
}
