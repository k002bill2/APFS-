/* 수식 편집 다이얼로그 — 블록·인라인 수식의 LaTeX 입력(2026-10-27 사용자 요청: 요소 안 입력칸·팝오버 → 모달).
   URL 다이얼로그(RichTextUrlDialog)와 같은 골격(제목 · 라벨+입력 · 취소 | 적용)에 렌더 미리보기를 더해,
   입력하며 결과를 보던 인라인 편집의 장점을 유지한다. 문서 반영은 적용 시 1회(취소 = 그대로).
   preview 는 호출측(katex renderTex — 실패 시 HTML 이스케이프)이 만든 HTML 이다.
   ⚠️ 수식 요소(에디터 React 트리) 안에서 열리므로 contextmenu 전파를 끊는다(RichTextUrlDialog 와 같은 이유). */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const { useId } = React;

export function EquationDialog({ open, title, value, onChange, preview, onSubmit, onCancel, onCloseAutoFocus }: {
  open: boolean; title: string;
  value: string; onChange: (v: string) => void;
  preview: (tex: string) => string;
  onSubmit: () => void; onCancel: () => void;
  onCloseAutoFocus?: (e: Event) => void;
}) {
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}
        onContextMenu={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ padding: '16px 18px' }}>
          <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>LaTeX</label>
          <input
            id={id} type="text" className="apfs-rt-urlinput apfs-rt-texinput" autoFocus spellCheck={false}
            placeholder="E = mc^2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
          />
          <div className="apfs-rt-texpreview" aria-live="polite">
            {value
              ? <span dangerouslySetInnerHTML={{ __html: preview(value) }} />
              : <span className="apfs-rt-texpreview__empty">입력하면 여기에 미리보기가 나타납니다</span>}
          </div>
        </div>
        <DialogFooter>
          <button type="button" className="apfs-rt-linkbtn is-ghost" onClick={onCancel}>취소</button>
          <button type="button" className="apfs-rt-linkbtn" onClick={onSubmit}>적용</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
