/* URL 입력 다이얼로그 — 에디터의 URL 입력(링크 삽입·편집, 이미지 링크·교체, 이미지/동영상/임베드 삽입)을
   한 모양으로 통일한다(공식 Playground "Insert Image" 룩: 제목 · 라벨+입력 · 취소 | 주 액션).
   ui/dialog = 포털 + z-modal 정본 모달 → 폼 모달 안 중첩·에디터 전체화면(PortalContainer)에서도 위에 뜬다.
   ⚠️ 이미지 요소처럼 에디터 React 트리 안에서 열면 포털이어도 React 이벤트가 트리로 버블해 에디터 우클릭 메뉴
   (Radix ContextMenu 트리거)가 열린다 → contextmenu 전파만 끊는다(입력의 기본 메뉴·붙여넣기는 유지).
   가드: RichTextUrlDialog.test.ts (fields/ 의 type="url" 입력은 이 파일에만). */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const { useId } = React;

// 링크 URL 거부 사유 — Plate 링크 sanitize(validateUrl, LinkPlugin 기본 허용 스킴 http·https·mailto·tel)에 걸릴 때.
// 툴바 링크·이미지 링크가 같은 문구를 쓴다(인라인 바 시절엔 조용히 무시돼 다이얼로그에선 고장처럼 보임).
export const URL_SCHEME_ERROR = 'http·https·mailto·tel 주소만 쓸 수 있습니다.';

export function UrlDialog({
  open, title, label, placeholder, value, onChange, submitLabel, onSubmit, onCancel,
  onRemove, removeLabel = '제거', error, onCloseAutoFocus,
}: {
  open: boolean; title: string; label: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  submitLabel: string; onSubmit: () => void; onCancel: () => void;
  onRemove?: () => void; removeLabel?: string;
  error?: string;                                  // 있으면 입력 아래 경고 + aria-invalid(제출 거부 사유)
  onCloseAutoFocus?: (e: Event) => void;          // 닫힌 뒤 포커스 — 에디터로 되돌릴 때 preventDefault 후 focus
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}
        onContextMenu={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ padding: '16px 18px' }}>
          <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{label}</label>
          <input
            id={id} type="url" className="apfs-rt-urlinput" autoFocus
            placeholder={placeholder}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
          />
          {error && <p id={errId} role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--danger-text)' }}>{error}</p>}
        </div>
        <DialogFooter>
          <button type="button" className="apfs-rt-linkbtn is-ghost" onClick={onCancel}>취소</button>
          <span style={{ display: 'inline-flex', gap: 8 }}>
            {onRemove && <button type="button" className="apfs-rt-linkbtn is-ghost" onClick={onRemove}>{removeLabel}</button>}
            <button type="button" className="apfs-rt-linkbtn" onClick={onSubmit}>{submitLabel}</button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
