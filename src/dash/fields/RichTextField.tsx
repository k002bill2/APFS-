/* RichTextField — Tiptap(v3) 기반 리치 텍스트 에디터. 스키마 control: 'richtext'.
   ── 비제어(uncontrolled) 패턴 ──
   `content: value`로 마운트 시 1회만 초기화하고, 이후 onUpdate→onChange(HTML)로 단방향 흘려보낸다.
   ⚠️ value를 useEffect로 setContent하거나 useEditor deps에 [value]를 넣으면 키 입력마다 문서가
      재초기화돼 커서가 튀고 onUpdate와 피드백 루프가 생긴다 → 금지.
   ── 툴바 ──
   모달 본문이 overflow-y-auto라 BubbleMenu/FloatingMenu는 잘린다 → EditorContent 위에 고정 툴바.
   Tiptap v3의 useEditor는 트랜잭션마다 자동 리렌더하지 않으므로 'transaction' 구독으로 직접 리렌더
   해 버튼 활성 상태(is-active)를 동기화한다(버전 무관 안전). */
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './richtext.css';

const { useReducer, useEffect } = React;

type BtnDef = { key: string; label: string; title: string; run: (e: Editor) => void; active: (e: Editor) => boolean; style?: React.CSSProperties };

// 서식 버튼 — chain().focus()로 포커스를 유지한 채 토글.
const BTNS: BtnDef[] = [
  { key: 'bold',   label: 'B',  title: '굵게',        run: (e) => e.chain().focus().toggleBold().run(),                 active: (e) => e.isActive('bold'),   style: { fontWeight: 800 } },
  { key: 'italic', label: 'I',  title: '기울임',      run: (e) => e.chain().focus().toggleItalic().run(),               active: (e) => e.isActive('italic'), style: { fontStyle: 'italic' } },
  { key: 'strike', label: 'S',  title: '취소선',      run: (e) => e.chain().focus().toggleStrike().run(),               active: (e) => e.isActive('strike'), style: { textDecoration: 'line-through' } },
  { key: 'h2',     label: 'H2', title: '제목 2',      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),  active: (e) => e.isActive('heading', { level: 2 }) },
  { key: 'h3',     label: 'H3', title: '제목 3',      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),  active: (e) => e.isActive('heading', { level: 3 }) },
  { key: 'ul',     label: '•',  title: '글머리 목록', run: (e) => e.chain().focus().toggleBulletList().run(),           active: (e) => e.isActive('bulletList') },
  { key: 'ol',     label: '1.', title: '번호 목록',   run: (e) => e.chain().focus().toggleOrderedList().run(),          active: (e) => e.isActive('orderedList') },
  { key: 'quote',  label: '❝', title: '인용',    run: (e) => e.chain().focus().toggleBlockquote().run(),           active: (e) => e.isActive('blockquote') },
];

export function RichTextField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',           // 마운트 1회 초기화(비제어)
    immediatelyRender: false,       // Vite/SSR 안전 — 초기 null 후 마운트
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // 접근성 이름은 스키마 field.label에서 받는다(비-native div[role=textbox]라 외부 <label> 암묵연결 불가).
    editorProps: { attributes: { class: 'apfs-prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label || '내용' } },
  });

  // 트랜잭션마다 리렌더 → 툴바 활성 상태 동기화(v3 useEditor는 자동 리렌더 안 함).
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', force);
    return () => { editor.off('transaction', force); };
  }, [editor]);

  return (
    <div className="apfs-richtext">
      <div className="apfs-richtext__toolbar" role="toolbar" aria-label="서식 도구">
        {BTNS.map((b) => (
          <button
            key={b.key} type="button" title={b.title} aria-label={b.title}
            aria-pressed={!!editor && b.active(editor)}
            className={'apfs-rt-btn' + (editor && b.active(editor) ? ' is-active' : '')}
            style={b.style}
            disabled={!editor}
            // ⚠️ mousedown preventDefault — 버튼 클릭이 에디터 포커스/선택을 빼앗지 않게(선택 보존).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor && b.run(editor)}>
            {b.label}
          </button>
        ))}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <button type="button" title="실행취소" aria-label="실행취소" className="apfs-rt-btn"
          disabled={!editor || !editor.can().undo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().undo().run()}>{'↶'}</button>
        <button type="button" title="다시실행" aria-label="다시실행" className="apfs-rt-btn"
          disabled={!editor || !editor.can().redo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().redo().run()}>{'↷'}</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
