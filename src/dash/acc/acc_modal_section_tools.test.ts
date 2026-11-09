/* 회계 모달 섹션 도구 위치 가드 — apfs-form-modal 규약 7(2026-11-06 사용자 재확인: 편집 그리드 섹션도 예외 없음).
   추가류·행 편집 도구는 섹션 제목 바로 옆 좌측(add 슬롯, ml-auto·justify-between 금지), 조회·저장 등 섹션 액션만 우측(actions).
   대상이 slip·setting 두 중분류라 회계 대분류 루트에 둔다. 선례 가드: brf/register/registry_ledger_modals.test.ts. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../test_src';

const CASES = [
  { file: 'journal_entry_screen.tsx', section: '분개', toolbar: '분개 그리드 도구', first: '행추가', sel: '{selTools}' },
  { file: 'partner_form_modal.tsx', section: '계좌 정보', toolbar: '계좌 정보 도구', first: '행추가', sel: '{selCount > 0 ?' },
];

describe('회계 모달 Section — 행 편집 도구는 제목 바로 옆 좌측(add 슬롯)', () => {
  it.each(CASES)('$file', ({ file, section, toolbar, first, sel }) => {
    const src = readSrc(file);

    /* Section 헬퍼: 헤더에 justify-between 없음, {add} 가 제목 직후·ml-auto 없이, actions 만 ml-auto */
    const fn = src.slice(src.indexOf('function Section('));
    const header = fn.slice(0, fn.indexOf('{children}'));
    expect(header).toMatch(/\badd\??:/);
    expect(header).not.toMatch(/justify-between/);
    const titleAt = header.indexOf('{title}');
    const addAt = header.indexOf('{add}');
    expect(titleAt).toBeGreaterThan(-1);
    expect(addAt).toBeGreaterThan(titleAt);
    /* 제목과 {add} 사이엔 닫는 태그만(다른 요소·ml-auto 래퍼 없음) */
    expect(header.slice(titleAt + '{title}'.length, addAt)).toMatch(/^\s*<\/\w+>\s*$/);
    const actionsLine = header.slice(addAt).split('\n').find((l) => l.includes('{actions}')) ?? '';
    expect(actionsLine).toMatch(/ml-auto/);

    /* 도구는 add 로 넘어간다(actions 아님) */
    const use = src.slice(src.indexOf(`<Section title="${section}"`));
    const open = use.slice(0, use.indexOf('role="toolbar"'));
    expect(open).toMatch(/\badd=\{/);
    expect(open).not.toMatch(/\bactions=\{/);

    /* 항상 있는 [행추가]가 앞, 선택 작업이 뒤(체크해도 앞 버튼 위치 불변) */
    const tb = use.slice(use.indexOf(`aria-label="${toolbar}"`), use.indexOf('</Section>'));
    expect(tb.indexOf(`>${first}</Button>`)).toBeGreaterThan(-1);
    expect(tb.indexOf(sel)).toBeGreaterThan(tb.indexOf(`>${first}</Button>`));
  });

  it('선택 작업 [행삭제]·[삭제]는 danger', () => {
    expect(readSrc('journal_entry_screen.tsx')).toMatch(/variant="primary" size="sm" leadingIcon="trash" style=\{\{ background: 'var\(--danger-fill\)', color: 'var\(--danger-fill-foreground\)' \}\} onClick=\{removeChecked\}>행삭제</);
    expect(readSrc('partner_form_modal.tsx')).toMatch(/variant="primary" size="sm" leadingIcon="trash" style=\{\{ background: 'var\(--danger-fill\)', color: 'var\(--danger-fill-foreground\)' \}\} onClick=\{deleteRows\}>삭제</);
  });
});

describe('전표 업로드 모달 — 그리드 도구 버튼은 줄 맨 왼쪽, 상태 문구는 뒤', () => {
  it('journal_upload_modal.tsx', () => {
    const src = readSrc('journal_upload_modal.tsx');
    const start = src.indexOf('aria-label="업로드 그리드 도구"');
    expect(start).toBeGreaterThan(-1);
    // JSX 주석 블록은 빼고 실제 요소만 본다
    const tb = src.slice(start, src.indexOf('</div>', start)).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(tb).not.toMatch(/\b(ml|mr)-auto\b/);
    const btns = ['>양식다운로드</Button>', '>엑셀업로드</Button>', '>초기화</Button>'].map((b) => tb.indexOf(b));
    btns.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect(btns).toEqual([...btns].sort((a, b) => a - b));
    const live = tb.indexOf('aria-live="polite"');
    expect(live).toBeGreaterThan(btns[2]);
  });
});
