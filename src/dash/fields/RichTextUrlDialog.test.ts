// @vitest-environment jsdom
/* 에디터 URL 입력 다이얼로그(2026-10-27 사용자 요청: 링크 URL 입력을 "이미지 삽입" 다이얼로그 모양으로 통일).
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UrlDialog } from './RichTextUrlDialog';
// 소스 가드(fields/ 의 type="url" 은 이 컴포넌트에만)는 node 환경 richtext_url_input.test.ts —
// jsdom 에선 import.meta.url 이 file: 가 아니라 test_src(walkDash)를 못 쓴다.

afterEach(() => cleanup());

const base = {
  open: true, title: '링크 삽입', label: '링크 URL', placeholder: 'https://example.com',
  value: 'https://a.kr', onChange: () => {}, submitLabel: '삽입', onSubmit: () => {}, onCancel: () => {},
};
const show = (p: Partial<typeof base> & Record<string, unknown> = {}) => render(React.createElement(UrlDialog, { ...base, ...p } as any));

describe('UrlDialog — 이미지 삽입 다이얼로그와 같은 구조', () => {
  it('제목 · 라벨로 찾히는 URL 입력 · 취소/주 액션 버튼', () => {
    show();
    expect(screen.getByRole('dialog', { name: '링크 삽입' })).toBeTruthy();
    const input = screen.getByLabelText('링크 URL') as HTMLInputElement;
    expect([input.type, input.placeholder, input.value]).toEqual(['url', 'https://example.com', 'https://a.kr']);
    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '삽입' })).toBeTruthy();
  });

  // Escape 닫기는 Radix(document keydown) 동작이라 jsdom 대신 브라우저 실측으로 확인한다.
  it('Enter 와 주 액션 클릭은 onSubmit, 취소는 onCancel', () => {
    const onSubmit = vi.fn(); const onCancel = vi.fn();
    show({ onSubmit, onCancel });
    fireEvent.keyDown(screen.getByLabelText('링크 URL'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '삽입' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('입력은 onChange 로 값을 올린다', () => {
    const onChange = vi.fn();
    show({ onChange });
    fireEvent.change(screen.getByLabelText('링크 URL'), { target: { value: 'https://b.kr' } });
    expect(onChange).toHaveBeenCalledWith('https://b.kr');
  });

  it('onRemove 가 있을 때만 제거 버튼이 보인다', () => {
    show();
    expect(screen.queryByRole('button', { name: '링크 제거' })).toBeNull();
    cleanup();
    const onRemove = vi.fn();
    show({ onRemove, removeLabel: '링크 제거' });
    fireEvent.click(screen.getByRole('button', { name: '링크 제거' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('error 는 경고로 알리고 입력에 aria-invalid 와 설명을 건다', () => {
    show({ error: '허용되지 않는 주소입니다.' });
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('허용되지 않는 주소입니다.');
    const input = screen.getByLabelText('링크 URL');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('우클릭이 React 트리 조상(에디터 우클릭 메뉴)으로 새지 않는다 — 포털이라도 React 이벤트는 버블한다', () => {
    const parent = vi.fn();
    render(React.createElement('div', { onContextMenu: parent }, React.createElement(UrlDialog, base as any)));
    fireEvent.contextMenu(screen.getByLabelText('링크 URL'));
    expect(parent).not.toHaveBeenCalled();
  });

  it('닫혀 있으면 렌더하지 않는다', () => {
    show({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
