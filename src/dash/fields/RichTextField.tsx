/* RichTextField — Tiptap(v3) 기반 리치 텍스트 에디터. 스키마 control: 'richtext'.
   ── 비제어(uncontrolled) 패턴 ──
   `content: value`로 마운트 시 1회만 초기화하고, 이후 onUpdate→onChange(HTML)로 단방향 흘려보낸다.
   ⚠️ value를 useEffect로 setContent하거나 useEditor deps에 [value]를 넣으면 키 입력마다 문서가
      재초기화돼 커서가 튀고 onUpdate와 피드백 루프가 생긴다 → 금지.
   ── 확장(풀옵션) ──
   서식 스파인은 StarterKit이 전부 번들한다(bold/italic/underline/strike/code/codeBlock/heading/
   bulletList/orderedList/blockquote/horizontalRule/link + history). ⚠️ 이들을 개별 import로 다시
   넣으면 "Duplicate extension names" 크래시 → 버튼만 추가한다. 정렬(TextAlign)·이미지(Image)만
   StarterKit 밖이라 나란히 등록. 링크는 StarterKit 내장을 openOnClick:false로 켜 둔다.
   ── 이미지 ──
   백엔드가 없으므로(프로토타입) 업로드/base64가 아닌 URL 삽입만 지원(allowBase64 기본 false).
   Image는 블록 노드 → setImage({src})로 커서 위치에 <img> 삽입. content HTML엔 URL만 담겨 가볍다.
   ── 툴바 ──
   모달 본문이 overflow-y-auto라 BubbleMenu/FloatingMenu는 잘린다 → EditorContent 위에 고정 툴바.
   버튼 수가 많아 flex-wrap으로 줄바꿈(richtext.css). Tiptap v3의 useEditor는 트랜잭션마다 자동
   리렌더하지 않으므로 'transaction' 구독으로 직접 리렌더해 버튼 활성 상태(is-active)를 동기화한다.
   ── URL 입력 바(링크·이미지 공용) ──
   window.prompt(페이지 스레드 차단)·Radix 팝오버(모달 포커스 경쟁 함정) 대신 툴바 아래 인라인 바.
   pMode(link|image)로 한 벌의 입력 UI를 공유하고 적용 시점의 명령만 분기한다.
   텍스트 입력이라 mousedown preventDefault를 걸지 않는다(버튼과 반대 — 포커스를 정상 수신해야 함). */
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, SquareCode,
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, TextQuote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, Link as LinkIcon, Unlink,
  Image as ImageIcon, Undo2, Redo2, type LucideIcon,
} from 'lucide-react';
import './richtext.css';

const { useReducer, useEffect, useState } = React;

type BtnDef = { key: string; Icon: LucideIcon; title: string; run: (e: Editor) => void; active: (e: Editor) => boolean };

// 서식 버튼 — 그룹 사이에 구분선. 모두 chain().focus()로 포커스/선택을 유지한 채 토글.
const GROUPS: BtnDef[][] = [
  [ // 블록 타입
    { key: 'p',  Icon: Pilcrow,  title: '본문',   run: (e) => e.chain().focus().setParagraph().run(),             active: (e) => e.isActive('paragraph') },
    { key: 'h1', Icon: Heading1, title: '제목 1', run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive('heading', { level: 1 }) },
    { key: 'h2', Icon: Heading2, title: '제목 2', run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
    { key: 'h3', Icon: Heading3, title: '제목 3', run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  ],
  [ // 인라인 서식
    { key: 'bold',   Icon: Bold,          title: '굵게',        run: (e) => e.chain().focus().toggleBold().run(),      active: (e) => e.isActive('bold') },
    { key: 'italic', Icon: Italic,        title: '기울임',      run: (e) => e.chain().focus().toggleItalic().run(),    active: (e) => e.isActive('italic') },
    { key: 'under',  Icon: UnderlineIcon, title: '밑줄',        run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive('underline') },
    { key: 'strike', Icon: Strikethrough, title: '취소선',      run: (e) => e.chain().focus().toggleStrike().run(),    active: (e) => e.isActive('strike') },
    { key: 'code',   Icon: Code,          title: '인라인 코드', run: (e) => e.chain().focus().toggleCode().run(),      active: (e) => e.isActive('code') },
  ],
  [ // 목록/블록
    { key: 'ul',     Icon: List,        title: '글머리 목록', run: (e) => e.chain().focus().toggleBulletList().run(),  active: (e) => e.isActive('bulletList') },
    { key: 'ol',     Icon: ListOrdered, title: '번호 목록',   run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
    { key: 'quote',  Icon: TextQuote,   title: '인용',        run: (e) => e.chain().focus().toggleBlockquote().run(),  active: (e) => e.isActive('blockquote') },
    { key: 'cblock', Icon: SquareCode,  title: '코드 블록',   run: (e) => e.chain().focus().toggleCodeBlock().run(),   active: (e) => e.isActive('codeBlock') },
  ],
  [ // 정렬
    { key: 'left',    Icon: AlignLeft,    title: '왼쪽 정렬',   run: (e) => e.chain().focus().setTextAlign('left').run(),    active: (e) => e.isActive({ textAlign: 'left' }) },
    { key: 'center',  Icon: AlignCenter,  title: '가운데 정렬', run: (e) => e.chain().focus().setTextAlign('center').run(),  active: (e) => e.isActive({ textAlign: 'center' }) },
    { key: 'right',   Icon: AlignRight,   title: '오른쪽 정렬', run: (e) => e.chain().focus().setTextAlign('right').run(),   active: (e) => e.isActive({ textAlign: 'right' }) },
    { key: 'justify', Icon: AlignJustify, title: '양쪽 정렬',   run: (e) => e.chain().focus().setTextAlign('justify').run(), active: (e) => e.isActive({ textAlign: 'justify' }) },
  ],
  [ // 삽입
    { key: 'hr', Icon: Minus, title: '구분선', run: (e) => e.chain().focus().setHorizontalRule().run(), active: () => false },
  ],
];

type PromptMode = null | 'link' | 'image';

// required: 필수 필드 상시 표식 — 컨테이너 테두리만 danger(is-required, richtext.css). aria-required로 접근성 표기.
export function RichTextField({ value, onChange, label, required }: { value: string; onChange: (v: string) => void; label?: string; required?: boolean }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [pMode, setPMode] = useState<PromptMode>(null); // URL 입력 바 모드(링크/이미지 공용)
  const [pUrl, setPUrl] = useState('');
  const editor = useEditor({
    // StarterKit이 서식 스파인 전부 번들 — link만 openOnClick:false로 조정. TextAlign·Image만 별도 등록.
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false }),   // 블록 이미지 — URL 삽입(백엔드 없음, base64 미허용)
    ],
    content: value || '',           // 마운트 1회 초기화(비제어)
    immediatelyRender: false,       // Vite/SSR 안전 — 초기 null 후 마운트
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // 접근성 이름은 스키마 field.label에서 받는다(비-native div[role=textbox]라 외부 <label> 암묵연결 불가).
    editorProps: { attributes: { class: 'apfs-prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label || '내용', ...(required ? { 'aria-required': 'true' } : {}) } },
  });

  // 트랜잭션마다 리렌더 → 툴바 활성 상태 동기화(v3 useEditor는 자동 리렌더 안 함).
  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', force);
    return () => { editor.off('transaction', force); };
  }, [editor]);

  // URL 바 열기 — 링크는 현재 선택의 href 프리필, 이미지는 빈 값에서 시작.
  function openLink() { if (!editor) return; setPUrl(editor.getAttributes('link').href || ''); setPMode('link'); }
  function openImage() { setPUrl(''); setPMode('image'); }
  // 적용 — 모드에 따라 명령 분기. 링크=선택 범위 마크(빈 값이면 제거), 이미지=커서 위치 노드 삽입.
  function applyPrompt() {
    if (!editor) { setPMode(null); return; }
    const url = pUrl.trim();
    if (pMode === 'link') {
      const chain = editor.chain().focus().extendMarkRange('link');
      if (url) chain.setLink({ href: url }).run();
      else chain.unsetLink().run();
    } else if (pMode === 'image' && url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setPMode(null);
  }

  const linkActive = !!editor && editor.isActive('link');
  const imageActive = !!editor && editor.isActive('image');

  return (
    <div className={'apfs-richtext' + (required ? ' is-required' : '')}>
      <div className="apfs-richtext__toolbar" role="toolbar" aria-label="서식 도구">
        {/* 실행취소/다시실행 — can() 게이트로 disabled. */}
        <button type="button" title="실행취소" aria-label="실행취소" className="apfs-rt-btn"
          disabled={!editor || !editor.can().undo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="다시실행" aria-label="다시실행" className="apfs-rt-btn"
          disabled={!editor || !editor.can().redo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} strokeWidth={2} aria-hidden={true} /></button>

        {/* 서식 그룹 — 그룹마다 구분선. */}
        {GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            <span className="apfs-richtext__sep" aria-hidden="true" />
            {group.map((b) => (
              <button
                key={b.key} type="button" title={b.title} aria-label={b.title}
                aria-pressed={!!editor && b.active(editor)}
                className={'apfs-rt-btn' + (editor && b.active(editor) ? ' is-active' : '')}
                disabled={!editor}
                // ⚠️ mousedown preventDefault — 버튼 클릭이 에디터 포커스/선택을 빼앗지 않게(선택 보존).
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor && b.run(editor)}>
                <b.Icon size={16} strokeWidth={2} aria-hidden={true} />
              </button>
            ))}
          </React.Fragment>
        ))}

        {/* 삽입(URL) — 링크/이미지: 인라인 URL 바 토글. 링크는 제거 버튼도 제공. */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <button type="button" title="링크" aria-label="링크" aria-pressed={linkActive || pMode === 'link'}
          className={'apfs-rt-btn' + (linkActive || pMode === 'link' ? ' is-active' : '')}
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'link' ? setPMode(null) : openLink())}><LinkIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="링크 제거" aria-label="링크 제거" className="apfs-rt-btn"
          disabled={!editor || !linkActive}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().unsetLink().run()}><Unlink size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="이미지" aria-label="이미지" aria-pressed={imageActive || pMode === 'image'}
          className={'apfs-rt-btn' + (imageActive || pMode === 'image' ? ' is-active' : '')}
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'image' ? setPMode(null) : openImage())}><ImageIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
      </div>

      {/* URL 입력 바(링크·이미지 공용) — 텍스트 입력이라 mousedown preventDefault를 걸지 않는다. */}
      {pMode && (
        <div className="apfs-richtext__linkbar">
          <input
            type="url" className="apfs-rt-linkinput" autoFocus
            aria-label={pMode === 'image' ? '이미지 URL' : '링크 URL'}
            placeholder={pMode === 'image' ? 'https://…/image.png' : 'https://example.com'}
            value={pUrl}
            onChange={(e) => setPUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyPrompt(); }
              if (e.key === 'Escape') { e.preventDefault(); setPMode(null); }
            }}
          />
          <button type="button" className="apfs-rt-linkbtn" onMouseDown={(e) => e.preventDefault()} onClick={applyPrompt}>
            {pMode === 'image' ? '삽입' : '적용'}
          </button>
          <button type="button" className="apfs-rt-linkbtn is-ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => setPMode(null)}>취소</button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
