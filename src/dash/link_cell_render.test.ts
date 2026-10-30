// @vitest-environment jsdom
/* 공용 LinkCell 렌더 계약(2026-10-30) — 소스 가드(로컬 사본 금지)는 link_cell.test.ts.
   ⚠ jsdom 은 `style.font` 를 읽을 때 뒤 longhand 를 접어 'inherit 600' 처럼 돌려준다 → font 는 style 속성 문자열로 본다.
     키 순서 함정(longhand 를 font 앞에 두면 리셋)은 `style.fontWeight === '600'` 이 잡는다(앞에 두면 'inherit').
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LinkCell } from './link_cell';

afterEach(() => cleanup());

const btn = () => screen.getByRole('button');

describe('LinkCell 렌더 계약', () => {
  it('기본 — type=button · title=힌트 · font:inherit 뒤 600 · primary · 접근名 = 값', () => {
    const onClick = vi.fn();
    render(React.createElement(LinkCell, { value: '농식품펀드 1호', hint: '자펀드 명세 보기', onClick }));
    const b = btn();
    expect(b.getAttribute('type')).toBe('button');
    expect(b.getAttribute('title')).toBe('자펀드 명세 보기');
    expect(b.getAttribute('style')).toMatch(/^font: inherit;/);
    expect(b.style.fontWeight).toBe('600');   // font 뒤에 둔 longhand 가 살아 있다(앞에 두면 'inherit' 로 리셋)
    expect(b.getAttribute('style')).not.toContain('tabular-nums');
    expect(b.className.split(' ')).toEqual(expect.arrayContaining(['text-left', 'text-primary', 'font-semibold', 'no-underline', 'hover:underline']));
    expect(b.hasAttribute('aria-label')).toBe(false);
    expect(b.textContent).toBe('농식품펀드 1호');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('tabular · ariaLabel — tabular-nums 를 font:inherit 뒤에 싣고 aria-label 을 단다', () => {
    render(React.createElement(LinkCell, { value: '2026-10-30', hint: '상세 보기', onClick: () => {}, tabular: true, ariaLabel: '2026-10-30 상세 보기' }));
    const b = btn();
    expect(b.getAttribute('style')).toMatch(/^font: inherit;/);
    expect(b.style.fontWeight).toBe('600');
    expect(b.style.fontVariantNumeric).toBe('tabular-nums');
    expect(b.getAttribute('aria-label')).toBe('2026-10-30 상세 보기');
  });

  it('color · srText — text-primary 대신 지정 색, 값 뒤 sr-only 접미(앞 공백 보존)', () => {
    render(React.createElement(LinkCell, { value: '불일치', hint: '대사 상세 보기', onClick: () => {}, color: 'var(--danger-text)', srText: ' 대사 상세 보기' }));
    const b = btn();
    expect(b.className.split(' ')).not.toContain('text-primary');
    expect(b.getAttribute('style')).toContain('color: var(--danger-text)');
    expect(b.querySelector('span.sr-only')?.textContent).toBe(' 대사 상세 보기');
    expect(b.textContent).toBe('불일치 대사 상세 보기');
  });
});
